import { createServer } from "http";
import httpProxy from "http-proxy";
import url from "url";
import { BROWSER_DEBUG_PORT, NODE_DEBUG_PORT } from "./constants";
import fetchDevtoolsSessions from "./utils/fetchDevtoolsSessions";
import type { Duplex } from "stream";

const handleBadRequest = (socket: Duplex, message: string) => {
  socket.write(
    [
      "HTTP/1.1 404 Bad Request",
      "Content-Type: text/plain; charset=UTF-8",
      "Content-Encoding: UTF-8",
      "Accept-Ranges: bytes",
      "Connection: keep-alive",
    ].join("\n") + "\n\n"
  );
  socket.write(Buffer.from("Bad Request, " + message));
  socket.end();
};

const proxy = httpProxy.createProxyServer();

export default function initDevtoolsServer(
  server: ReturnType<typeof createServer>
) {
  server.on("upgrade", async (req, socket, head) => {
    try {
      socket.on("error", (error) => {
        console.log(`Error with inbound socket ${error}\n${error.stack}`);
      });
      socket.once("close", () => socket.removeAllListeners());

      const parsedUrl = url.parse(req.url || "", true);
      const route = parsedUrl.pathname || "/";
      delete req.headers.origin;
      console.log("route", route);
      if (route.includes("/devtools/page")) {
        const parsedUrl = url.parse(req.url || "", true);
        const route = parsedUrl.pathname || "/";
        const sessions = await fetchDevtoolsSessions(BROWSER_DEBUG_PORT);
        const session = sessions?.find((s) =>
          s.webSocketDebuggerUrl.includes(route)
        );
        if (!session) {
          return handleBadRequest(socket, "NOT_FOUND");
        }
        const target = `ws://127.0.0.1:${BROWSER_DEBUG_PORT}`;
        // Strip tokens/query-params since they break chrome
        req.url = parsedUrl.pathname || "";
        return proxy.ws(req, socket, head, { target });
      } else if (route.includes("/devtools/process")) {
        const match = /devtools\/process\/([^\/]+)/.exec(route);
        if (!match) return handleBadRequest(socket, "NOT_FOUND");
        const id = match[1];
        const sessions = await fetchDevtoolsSessions(NODE_DEBUG_PORT);
        const session = sessions?.find((s) => s.id === id);
        if (!session) {
          return handleBadRequest(socket, "NOT_FOUND");
        }
        const target = `ws://127.0.0.1:${NODE_DEBUG_PORT}`;
        req.url = `/${id}` || "";
        return proxy.ws(req, socket, head, { target });
      }
    } catch (error: any) {
      return handleBadRequest(socket, error.message);
    }
  });
}
