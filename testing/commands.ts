import { Socket, io } from "socket.io-client";
import z from "zod";
import { FileSystemTree } from "../src/fileSystemTypes";

export interface BrowserSession {
  description: string;
  devtoolsFrontendUrl: string;
  faviconUrl: string;
  id: string;
  title: string;
  type: string;
  url: string;
  webSocketDebuggerUrl: string;
}

const remoteRpcResponse = z.union([
  z.object({
    type: z.literal("method_result"),
    methodResult: z.unknown(),
  }),
  z.object({
    type: z.literal("method_error"),
    methodError: z.unknown(),
  }),
  z.object({
    type: z.literal("core_error"),
    error: z.enum(["not_found", "parsing_failed"]),
    details: z.optional(z.unknown()),
  }),
]);

export class OperationsManager {
  socket: Socket;

  constructor(url: string) {
    this.socket = io(`${url}/commands`, {
      autoConnect: false,
    });
  }

  async boot() {
    const promise = new Promise<void>((resolve, reject) => {
      this.socket.on("connect", () => {
        console.log("commands: connected");
        resolve();
      });

      this.socket.on("connect_error", (err) => {
        console.log("commands: connection failed");
        reject(err);
      });

      this.socket.on("disconnect", () => {
        console.log("commands: disconnected");
      });
    });

    this.socket.connect();
    return promise;
  }

  dispose() {
    this.socket.off("connect");
    this.socket.off("connect_error");
    this.socket.off("disconnect");

    this.socket.disconnect();
  }

  mountFiles(cwd: string, tree: FileSystemTree) {
    return this._emit<void>("mountFiles", [cwd, tree]);
  }

  createDirectory(cwd: string, name: string) {
    return this._emit<void>("createDirectory", [cwd, name]);
  }

  startOrRestartBrowser(useProxy: boolean) {
    return this._emit<void>("startOrRestartBrowser", [useProxy]);
  }
  getBrowserStatus() {
    return this._emit<"stopped" | "running">("browserStatus", []);
  }

  getBrowserSessions() {
    return this._emit<BrowserSession[]>("getBrowserSessions", []);
  }

  getNodeSessions() {
    return this._emit<BrowserSession[]>("getNodeSessions", []);
  }

  closeBrowser() {
    return this._emit<void>("closeBrowser", []);
  }

  async _emit<T>(method: string, params: any[]) {
    return new Promise<T>((resolve, reject) => {
      this.socket.emit("rpc_request", { method, params }, (response: any) => {
        const parseResult = remoteRpcResponse.safeParse(response);
        if (!parseResult.success) {
          reject({ error: "parsing_failed", details: parseResult.error });
          return;
        }

        if (parseResult.data.type === "core_error") {
          if (parseResult.data.error === "not_found") {
            console.log(`rpc_request.method not found: ${method}`);
          } else if (parseResult.data.error === "parsing_failed") {
            console.log(
              `rpc_request parsing failed: ${parseResult.data.details}`
            );
          } else {
            console.log(`unknown core_error: ${parseResult.data.error}`);
          }

          reject(parseResult.data.error);
        } else if (parseResult.data.type === "method_error") {
          reject(parseResult.data.methodError);
        } else if (parseResult.data.type === "method_result") {
          resolve(parseResult.data.methodResult as T);
        } else {
          console.log(`unknown parseResult.data type: ${parseResult.data}`);
          reject("unknown response type");
        }
      });
    });
  }
}