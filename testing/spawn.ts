import { io } from 'socket.io-client';

export interface RemoteProcess {
  exit: Promise<{ code: number; signal: string }>;

  input: WritableStream<string>;

  output: ReadableStream<string>;

  kill(code?: string): void;

  resize(dimensions: { cols: number; rows: number }): void;

  pause(): void;

  resume(): void;

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

async function logStream(readableStream: ReadableStream<string>) {
    const reader = readableStream.getReader();
  
    while (true) {
      try {
        const { done, value } = await reader.read();
  
        if (done) {
          console.log("completed!");
          break;
        }
  
        console.log(`|${value}`);
      } catch (e) {
        console.log("error while reading stream", e);
      }
    }
  }

export async function spawn(options?: SpawnOptions): Promise<RemoteProcess> {
  const spawnSocket = io(`http://localhost:4000/spawn`, {
    transports: ['websocket'],
    autoConnect: false,
    reconnection: false,
    query: options
      ? {
          ...options,
          args: JSON.stringify(options.args),
        }
      : undefined,
  });

  // to use for forwarding the output to a ReadableStream<string>
  const stream = new ReadableStream<string>({
    start(controller) {
      spawnSocket.on('output', (chunk) => {
        controller.enqueue(chunk?.toString());
      });
      spawnSocket.on('end', () => {
        controller.close();
      });
    },
  });

  // forward input from the WritableStream<string> to the socket
  const inputWriter = new WritableStream({
    write(chunk) {
      spawnSocket.emit('input', chunk);
    },
  });

  let exitCode: { code: number; signal: string } | null = null;
  let exitCodePromise: Promise<{ code: number; signal: string }>;
  let exitPromiseResolver: (code: { code: number; signal: string }) => void;

  const process: RemoteProcess = {
    get exit() {
      // remember that 0 is a valid status code
      if (exitCode !== null) {
        return Promise.resolve(exitCode);
      }

      if (!exitCodePromise) {
        exitCodePromise = new Promise<{ code: number; signal: string }>(
          (resolve) => {
            exitPromiseResolver = resolve;
          }
        );
      }

      return exitCodePromise;
    },
    get socket() {
        return spawnSocket;
    },

    input: inputWriter,
    output: stream,

    kill(data) {
      spawnSocket.emit('kill', data);
    },

    resize(dimensions) {
      spawnSocket.emit('resize', dimensions);
    },

    pause() {
      spawnSocket.emit('pause');
    },

    resume() {
      spawnSocket.emit('resume');
    },
  };

  spawnSocket.on('connect', () => {
    console.log('spawn namespace connected');
  });

  spawnSocket.on('exit', (code, signal) => {
    exitCode = { code, signal };

    if (exitPromiseResolver) {
      exitPromiseResolver(exitCode);
    }
  });

  spawnSocket.on('disconnect', function (a) {
    console.log('disconnected:', a);
  });

  // error logging
  spawnSocket.on('error', (error) => {
    console.log('Error', error);
  });

  spawnSocket.on('connect_error', (error) => {
    console.log('connection error', error);
  });

  spawnSocket.on('kill', () => {
    console.log("recived kill signal from server");
  })

  spawnSocket.on('resume', () => {
    console.log("recived resume signal from server");
  })
  
  spawnSocket.on('pause', () => {
    console.log("recived pause signal from server");
  })

  spawnSocket.connect();

  return process;
}

async function main() {
  try {
    const spawnProcess = await spawn({
        name: "test",
        command: "seq",
        args: ["1", "45"],
        cwd: "/tmp",
        output: true,
      });

    const resultOfSpawnProcess = await spawnProcess.exit;
    //we need to spawn the start script
    const spawnProcess2 = await spawn({
        name: "test",
        command: "node",
        args: ["debug.ts"],
        cwd: "/tmp",
        output: true,
      });

    console.log("resultOfSpawnProcess", resultOfSpawnProcess);
  } catch (error) {
    console.log(error);
  }
}

main();
