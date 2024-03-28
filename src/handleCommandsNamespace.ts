import { Server } from "socket.io";
import { z } from "zod";
import { DirectoryNode } from "./fileSystemTypes";
import {
  createDirectory,
  mountFiles,
} from "./commands/fileOperationsCommands";
import {
  getBrowserStatus,
  startOrRestartBrowser,
  closeBrowser,
  getBrowserSessions,
  getNodeSessions,
} from "./commands/browserCommands";

const fileNodeSchema = z.object({
  file: z.object({
    contents: z.union([z.string(), z.instanceof(Uint8Array)]),
  }),
});

const directoryNodeSchema: z.ZodType<DirectoryNode> = z.lazy(() =>
  z.object({
    directory: z.record(
      z.union([fileNodeSchema, directoryNodeSchema]) // now refers to itself
    ),
  })
);

export const fileSystemTreeSchema = z.record(
  z.union([fileNodeSchema, directoryNodeSchema])
);

const rpcRequest = z.union([
  z.object({
    method: z.literal("mountFiles"),
    params: z.tuple([z.string(), fileSystemTreeSchema]),
  }),
  z.object({
    method: z.literal("createDirectory"),
    params: z.tuple([z.string(), z.string()]),
  }),
  z.object({
    method: z.literal("startOrRestartBrowser"),
    //[first parameter is whether to use a proxy or not]
    params: z.tuple([z.boolean()]),
  }),
  z.object({
    method: z.literal("browserStatus"),
    params: z.tuple([]),
  }),
  z.object({
    method: z.literal("closeBrowser"),
    params: z.tuple([]),
  }),
  z.object({
    method: z.literal("getBrowserSessions"),
    params: z.tuple([]),
  }),
  z.object({
    method: z.literal("getNodeSessions"),
    params: z.tuple([]),
  }),
]);

export default function handleCommandsNamespace(io: Server) {
  const commandsNamespace = io.of("/commands");

  commandsNamespace.on("connection", function (socket) {
    console.log("commands: connected");

    socket.on("disconnect", function () {
      console.log("commands: disconnect");
    });

    socket.on("rpc_request", async function (data, callback) {
      console.log(`Received RPC request: ${data.method}`);

      const parseResult = rpcRequest.safeParse(data);
      if (!parseResult.success) {
        callback({
          type: "core_error",
          error: "parsing_failed",
          details: parseResult.error,
        });
        return;
      }

      if (parseResult.data.method === "mountFiles") {
        return await executeFunction(
          mountFiles,
          parseResult.data.params,
          callback
        );
      } else if (parseResult.data.method === "createDirectory") {
        return await executeFunction(
          createDirectory,
          parseResult.data.params,
          callback
        );
      } else if (parseResult.data.method === "startOrRestartBrowser") {
        return await executeFunction(
          startOrRestartBrowser,
          [
            {
              onBrowserStatusChange: (status) => {
                commandsNamespace.emit("browser_status_change", status);
              },
              useProxy: parseResult.data.params[0],
            },
          ],
          callback
        );
      } else if (parseResult.data.method === "browserStatus") {
        return await executeFunction(
          getBrowserStatus,
          parseResult.data.params,
          callback
        );
      } else if (parseResult.data.method === "closeBrowser") {
        return await executeFunction(
          closeBrowser,
          parseResult.data.params,
          callback
        );
      } else if (parseResult.data.method === "getBrowserSessions") {
        return await executeFunction(
          getBrowserSessions,
          parseResult.data.params,
          callback
        );
      } else if (parseResult.data.method === "getNodeSessions") {
        return await executeFunction(
          getNodeSessions,
          parseResult.data.params,
          callback
        );
      } else {
        callback({ type: "core_error", error: "not_found" });
      }
    });
  });
}

interface IAsyncFunction<P extends any[], R> {
  (...args: P): Promise<R>;
}

type CallbackFunction = (_result: {
  type: string;
  methodResult?: any;
  methodError?: any;
}) => void;

async function executeFunction<P extends any[], R, E = any>(
  func: IAsyncFunction<P, R>,
  params: P,
  callback: CallbackFunction
): Promise<void> {
  try {
    const result = await func(...params);
    callback({ type: "method_result", methodResult: result });
  } catch (e) {
    callback({ type: "method_error", methodError: e as E });
  }
}

async function delay(ms: number, value: string) {
  return new Promise<string>((resolve) => {
    setTimeout(() => {
      resolve(value);
    }, ms);
  });
}

function add(x: number, y: number): Promise<number> {
  return Promise.resolve(x + y);
}
