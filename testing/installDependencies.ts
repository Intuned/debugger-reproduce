import { io } from "socket.io-client";

type ExitState = {
  code: number;
  signal: number;
};

export interface RemoteProcess {
  exit: Promise<ExitState>;
  socket: ReturnType<typeof io>;
}

export interface SpawnOptions {
  name: string;
  command: string;
  cwd: string;
  args: string[];

  env?: Record<string, string | number | boolean>;

  output?: boolean;

  terminal?: {
    cols: number;
    rows: number;
  };
}

export async function spawnInstallDependencies(
  url: string,
  directory: string
): Promise<RemoteProcess> {
  console.log(directory)
  const spawnSocket = io(`${url}/install-dependencies`, {
    forceNew: true,
    transports: ["websocket"],
    autoConnect: false,
    reconnection: false,
    query: {
      name: "install dependencies",
      args: [],
      output: true,
      cwd: directory,
    },
  });

  // to use for forwarding the output to a ReadableStream<string>
  const stream = new ReadableStream<string>({
    start(controller) {
      spawnSocket.on("output", (chunk) => {
        controller.enqueue(chunk?.toString());
      });
      spawnSocket.on("end", () => {
        controller.close();
      });
    },
  });

  // forward input from the WritableStream<string> to the socket
  const inputWriter = new WritableStream({
    write(chunk) {
      spawnSocket.emit("input", chunk);
    },
  });

  let exitCode: ExitState | null = null;
  let exitCodePromise: Promise<ExitState>;
  let exitPromiseResolver: (code: ExitState) => void;

  const process: RemoteProcess = {
    get exit() {
      // remember that 0 is a valid status code
      if (exitCode !== null) {
        return Promise.resolve(exitCode);
      }

      if (!exitCodePromise) {
        exitCodePromise = new Promise<ExitState>((resolve) => {
          exitPromiseResolver = resolve;
        });
      }

      return exitCodePromise;
    },

    get socket() {
      return spawnSocket;
    },
  };

  spawnSocket.on("connect", () => {
    console.log("spawn namespace connected");
  });

  spawnSocket.on("exit", (code, signal) => {
    exitCode = { code, signal };

    if (exitPromiseResolver) {
      exitPromiseResolver(exitCode);
    }
  });

  spawnSocket.on("disconnect", function (a) {
    console.log("disconnected:", a);
  });

  // error logging
  spawnSocket.on("error", (error) => {
    console.log("Error", error);
  });

  spawnSocket.on("connect_error", (error) => {
    console.log("connection error", error);
  });

  spawnSocket.connect();

  return process;
}

