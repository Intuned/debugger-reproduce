import { BROWSER_DEBUG_PORT } from "../constants";
import fetch from "cross-fetch";

interface Session {
  description: string;
  devtoolsFrontendUrl: string;
  faviconUrl: string;
  id: string;
  title: string;
  type: string;
  url: string;
  webSocketDebuggerUrl: string;
}

export default async function fetchDevtoolsSessions(port = BROWSER_DEBUG_PORT) {
  const res = await fetch(`http://127.0.0.1:${port}/json/list`);
  if (res.ok) {
    const sessions = (await res.json()) as Session[];
    return sessions;
  }
}
