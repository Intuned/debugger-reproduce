import { ChildProcessWithoutNullStreams, spawn } from "child_process";
import * as playwright from "@intuned/playwright-core";
import fetchDevtoolsSessions from "../utils/fetchDevtoolsSessions";
import { FingerprintGenerator } from "fingerprint-generator";
import { FingerprintInjector } from "fingerprint-injector";
import waitOn from "wait-on";
import { anonymizeProxy, closeAnonymizedProxy } from "proxy-chain";
import {
  BROWSER_DEBUG_PORT,
  NODE_DEBUG_PORT,
  REMOTE_DEBUGGING_HOST,
} from "../constants";
import { getProxy } from "../utils/getProxy";

require("dotenv").config();

let chromeInstanceProcess: ChildProcessWithoutNullStreams | null = null;

// this is needed cause we need to keep the same browser instance alive between start recording and stop recording calls.
let playwrightBrowser: playwright.Browser | null = null;

const DEFAULT_PROXY = process.env.DEFAULT_PROXY;

export async function getBrowser() {
  if (playwrightBrowser) {
    return playwrightBrowser;
  }

  try {
    playwrightBrowser = await playwright.chromium.connectOverCDP(
      REMOTE_DEBUGGING_HOST
    );
  } catch (e) {
    throw new Error("Browser is not running");
  }

  return playwrightBrowser;
}

export async function closeBrowser() {
  // chromeInstanceProcess.exitCode == null will handle the case where the user close the browser from the ui
  if (
    chromeInstanceProcess &&
    !chromeInstanceProcess.killed &&
    chromeInstanceProcess.exitCode == null
  ) {
    const closed = chromeInstanceProcess.kill();

    const proxy = chromeInstanceProcess.spawnargs
      .find((arg) => arg.includes("--proxy-server"))
      ?.replace("--proxy-server=", "");

    if (proxy) {
      await closeAnonymizedProxy(proxy, true);
    }

    if (!closed) {
      throw new Error("Failed to close the browser process");
    }
    chromeInstanceProcess = null;
    playwrightBrowser = null;
  }
}

interface StartOrRestartBrowserOptions {
  onBrowserStatusChange?: (
    status: Awaited<ReturnType<typeof getBrowserStatus>>
  ) => void;
  kiosk?: boolean;
  startUrl?: string;
  useProxy?: boolean;
}

export async function startOrRestartBrowser(
  options?: StartOrRestartBrowserOptions
) {
  await closeBrowser();

  const chromiumPath = await playwright.chromium.executablePath();

  const fingerprint = new FingerprintGenerator().getFingerprint({
    locales: ["en-US"],
    devices: ["desktop"],
    operatingSystems: ["linux"],
    browsers: ["chrome"],
    strict: true,
  });

  const args = [
    "--no-sandbox",
    `--remote-debugging-port=${BROWSER_DEBUG_PORT}`,
    `--user-data-dir=/tmp/${Date.now()}`,
    "--new-window",
    "--start-maximized",
    `--user-agent=${fingerprint.fingerprint.navigator.userAgent}`,
    `--lang=${fingerprint.fingerprint.navigator.language}`,
  ];

  if (options?.kiosk) {
    args.push("--kiosk");
  }

  if (options?.startUrl) {
    args.push(options.startUrl);
  }

  let proxyWithCredentials = DEFAULT_PROXY;
  if (options?.useProxy) {
    const proxy = await getProxy();
    // remove the protocol from the proxy server
    const proxyServerWithoutProtocol = proxy.server.replace(
      /(^\w+:|^)\/\//,
      ""
    );
    proxyWithCredentials = `http://${proxy.username}:${proxy.password}@${proxyServerWithoutProtocol}`;
  }

  if (proxyWithCredentials) {
    // chrome does not support proxy with credentials, so we need to anonymize the proxy
    const proxyWithoutCredentials = await anonymizeProxy(proxyWithCredentials);

    args.push(`--proxy-server=${proxyWithoutCredentials}`);
  }

  chromeInstanceProcess = spawn(chromiumPath, args);

  // await for the browser to run and the cdp port is available to connect
  await waitOn({
    resources: [`http-get://127.0.0.1:${BROWSER_DEBUG_PORT}/json/version`],
    delay: 100,
    interval: 100,
    timeout: 30000,
    tcpTimeout: 1000,
    window: 1000,
  });

  const browser = await getBrowser();

  await new FingerprintInjector().attachFingerprintToPlaywright(
    browser.contexts()[0],
    fingerprint
  );

  if (chromeInstanceProcess) {
    options?.onBrowserStatusChange?.("running");
  }

  chromeInstanceProcess.stdout.on("data", (data) => {
    console.log(`Chrome stdout: ${data}`);
  });

  chromeInstanceProcess.stderr.on("data", (data) => {
    console.error(`Chrome stderr: ${data}`);
  });

  chromeInstanceProcess.on("exit", async () => {
    options?.onBrowserStatusChange?.(await getBrowserStatus());
    playwrightBrowser = null;
  });
}

export async function getBrowserStatus() {
  if (
    !chromeInstanceProcess ||
    chromeInstanceProcess.killed ||
    chromeInstanceProcess.exitCode !== null
  ) {
    return "stopped";
  }

  return "running";
}

export async function getBrowserSessions() {
  try {
    const sessions = await fetchDevtoolsSessions();
    return sessions;
  } catch (error) {
    console.log("getBrowserSessions error", error);
    return [];
  }
}

export async function getNodeSessions() {
  try {
    const sessions = await fetchDevtoolsSessions(NODE_DEBUG_PORT);
    return sessions;
  } catch (error) {
    console.log("getNodeSessions error", error);
    return [];
  }
}
