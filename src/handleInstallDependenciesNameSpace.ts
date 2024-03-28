import { Server } from "socket.io";
import { spawn } from "node-pty";
import z from "zod";
import fs from "fs/promises";
import os from "os";
import path from "path";
import {
  dimensionsSchema,
  spawnParamsSchema,
} from "./handleProcessSpawnNamespace";

const installDependenciesParamsSchema = spawnParamsSchema
  .pick({
    cwd: true,
    env: true,
    output: true,
    terminal: true,
  })
  .extend({ package: z.string().optional() });

const installLocalRunner = async (
  params: z.infer<typeof installDependenciesParamsSchema>,
  unlink?: boolean
) => {
  try {
    const ptyLinkProcess = spawn(
      "yarn",
      [unlink ? "unlink" : "link", "@intuned/runner"],
      {
        name: "Link Dependencies",
        cols: params.terminal?.cols,
        rows: params.terminal?.rows,
        cwd: params.cwd,
        env: process.env,
      }
    );

    ptyLinkProcess.onData((data) => {
      console.log(data);
    });

    await new Promise((resolve) => ptyLinkProcess.onExit(resolve));
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export default function handleInstallDependenciesNameSpace(io: Server) {
  const installDependenciesNameSpace = io.of("/install-dependencies");

  installDependenciesNameSpace.on("connection", async function (socket) {
    const params = installDependenciesParamsSchema.safeParse(
      socket.handshake.query
    );

    if (!params.success) {
      socket._error(params.error);
      socket.disconnect(true);
      return;
    }

    const npmrcContent = "//registry.npmjs.org/:_authToken=${NPM_TOKEN}";
    const npmrcPath = path.join(os.homedir(), ".npmrc");
    await fs.writeFile(npmrcPath, npmrcContent);

    // Uncomment the following line if you want to test runner locally
    // Pass true to unlink the package and install from registry
    // await installLocalRunner(params.data, false);

    const args = params.data.package
      ? ["add", params.data.package]
      : ["install"];

    try {
      const ptyProcess = spawn("yarn", args, {
        name: "Install Dependencies",
        cols: params.data.terminal?.cols,
        rows: params.data.terminal?.rows,
        cwd: params.data.cwd,
        env: {
          FORCE_COLOR: "1", // enable colors for terminal
          ...process.env,
        },
      });

      if (params.data.output) {
        ptyProcess.onData((data) => {
          socket.emit("output", data);
        });
      }

      ptyProcess.onExit((e: { exitCode: number; signal?: number }) => {
        if (params.data.output) {
          socket.emit("output", null);
        }

        socket.emit("exit", e.exitCode, e.signal);

        socket.disconnect(true);
      });

      socket.on("input", function (data) {
        ptyProcess.write(data);
      });

      socket.on("kill", function (data) {
        ptyProcess.kill(data);
      });

      socket.on("disconnect", () => {
        console.log("client disconnected");
      });
    } catch (error) {
      console.error(error);
      throw error;
    }
  });
}
