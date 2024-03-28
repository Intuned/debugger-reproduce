import { spawnInstallDependencies } from './installDependencies';
import { OperationsManager } from './commands';
import { files } from './filesTree';

const HOSTNAME = 'delicate-cherry-96996.fly.dev';
const MACHINE_URL = 'https://delicate-cherry-96996.fly.dev';

async function preInstallDeps(manager: OperationsManager) {
  await manager.createDirectory('/tmp', 'testDir1');
  await manager.mountFiles('/tmp/testDir1', files);
}

async function installDepsAndGetBrowserSession() {
  //create directory and mount files
  const manager = new OperationsManager(MACHINE_URL);
  await manager.boot();
  await preInstallDeps(manager);
  await spawnInstallDependencies(MACHINE_URL, '/tmp/testDir1');
  // wait for 1 mintue for the installation to complete (arbirary time)
  await new Promise((res) => setTimeout(res, 60000));
  //start or restart browser (testing other rpc commands)
  await manager.startOrRestartBrowser(false);
  const sessions = await manager.getBrowserSessions();
  if (!sessions.length) return 'no browser sessions';
  //change the hostname and try to connect to this using postman
  const browserSessionConnectionUrl = `ws://${HOSTNAME}/devtools/page/${
    sessions[0].webSocketDebuggerUrl.split('/')[5]
  }`;
  console.log(`Browser session debugging url: ${browserSessionConnectionUrl}`);
  return;
}

async function getNodeProcessConnectionUrl() {
  const manager = new OperationsManager(MACHINE_URL);
  await manager.boot();
  const nodeSessions = await manager.getNodeSessions();
  //logging the sessions connection string
  if (!nodeSessions.length) return 'Please start a node process first.';
  const sessionNumber = nodeSessions[0].webSocketDebuggerUrl.split('/')[3];
  const nodeProcessWsConnectionUrl = `ws://${HOSTNAME}/devtools/process/${sessionNumber}`;
  console.log(`Node process connection url: ${nodeProcessWsConnectionUrl}`);
}

async function main() {
  try {
    // await installDepsAndGetBrowserSession();
    await getNodeProcessConnectionUrl();
  } catch (error) {
    console.error(error);
  }
}

main();
