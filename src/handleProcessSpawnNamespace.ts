import { Server } from "socket.io";
import { spawn } from "node-pty";
import z from "zod";
import { NODE_DEBUG_PORT } from "./constants";
import freePortFromChildProcess from "./utils/freePortFromChildProcess";

export const dimensionsSchema = z.object({
  cols: z.number(),
  rows: z.number(),
});

export const spawnParamsSchema = z.object({
  name: z.string(),
  command: z.string(),
  args: z.string(),
  cwd: z.string(),

  env: z.string().optional(),

  output: z.coerce.boolean().optional(),

  terminal: dimensionsSchema.optional(),
});

export default function handleProcessSpawnNamespace(io: Server) {
  const spawnNamespace = io.of("/spawn");
  spawnNamespace.on("connection", async function (socket) {
    const params = spawnParamsSchema.safeParse(socket.handshake.query);
    if (!params.success) {
      socket._error(params.error);
      socket.disconnect(true);
      return;
    }

    let paramsArray: string[] = [];
    if (params.data.args) {
      try {
        paramsArray = JSON.parse(params.data.args);
      } catch (error) {
        spawnNamespace.emit(
          "error",
          "Invalid args. Please make sure args are a valid JSON array."
        );
      }
    }

    let envVarsObj: Record<string, string> = {};
    try {
      envVarsObj = params.data.env ? JSON.parse(params.data.env) : {};
    } catch (error) {
      spawnNamespace.emit(
        "error",
        "Invalid env. Please make sure env variables are a valid JSON object."
      );
    }

    if (paramsArray.includes("debug")) {
      await freePortFromChildProcess(NODE_DEBUG_PORT);
    }

    // Create the PTY process
    try {
      const ptyProcess = spawn(params.data.command, paramsArray, {
        name: params.data.name,
        cols: params.data.terminal?.cols,
        rows: params.data.terminal?.rows,
        cwd: params.data.cwd,
        env: {
          FORCE_COLOR: "1", // enable colors for terminal
          ...envVarsObj,
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
      
      socket.on("disconnect", () => {
        // Need better way to handle this
        console.log("client disconnected");
      });
    } catch (error) {
      console.error(error);
      throw error;
    }
  });
}
