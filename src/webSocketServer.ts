import { Server } from "socket.io";
import handleProcessSpawnNamespace from "./handleProcessSpawnNamespace";
import handleCommandsNamespace from "./handleCommandsNamespace";
import handleInstallDependenciesNameSpace from "./handleInstallDependenciesNameSpace";

export async function initWebsocketServer(io: Server) {
  handleProcessSpawnNamespace(io);
  handleCommandsNamespace(io);
  handleInstallDependenciesNameSpace(io);
}
