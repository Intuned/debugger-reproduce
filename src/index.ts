import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { initWebsocketServer } from "./webSocketServer";
import { spawn } from "node-pty";
import initDevtoolsServer from "./devtools";
import { initExpressApp } from "./httpServer";

const HTTP_PORT = process.env.HTTP_PORT ?? 4000;

const app = express();
const server = createServer(app);
const io = new Server(server, {
  // need to decide what to do with CORS
  cors: {
    origin: "*",
  },
});

try {
  //this is used to hide panels in xfce4
  const waitForProcess = (processName: string) => {
    const interval = setInterval(() => {
      try {
        const checkProcess = spawn("pgrep", ["-x", processName], {});

        checkProcess.onData(() => {
          clearInterval(interval);

          spawn("pkill", [processName], {});
        });
      } catch (error) {
        console.error(`Couldn't hide xfce4 panels: ${error}`);
        clearInterval(interval);
      }
    }, 1000);
  };

  waitForProcess("xfce4-panel");
} catch {}

initWebsocketServer(io);
initExpressApp(app);
initDevtoolsServer(server);

server.listen(HTTP_PORT, () => {
  console.log(`Server is running on port: ${HTTP_PORT}`);
});
