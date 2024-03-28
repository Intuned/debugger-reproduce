import { exec as execCallback } from "child_process";
import { promisify } from "util";

// Promisify exec for use with async/await
const exec = promisify(execCallback);

// Function to find processes listening on a specific port
async function findProcessesByPort(port: number) {
  const command = `lsof -i tcp:${port} | awk 'NR!=1 {print $2}' | uniq`;
  try {
    const { stdout } = await exec(command);
    return stdout
      .trim()
      .split("\n")
      .filter((pid: string) => pid);
  } catch (error) {
    return [];
  }
}

// Function to kill a process by PID
async function killProcess(pid: string) {
  const command = `kill -9 ${pid}`;
  try {
    await exec(command);
    console.log(`Process ${pid} successfully killed.`);
  } catch (error) {
    throw new Error(
      `Error killing process ${pid}: ${
        error instanceof Error ? error.message : ""
      }`
    );
  }
}

// Takes a port and check if there is a process listening -> kill the pty process
export default async function freePortFromChildProcess(port: number) {
  try {
    const pids = await findProcessesByPort(port);
    if (pids.length === 0) {
      return;
    }

    const ptyPid = pids[1]; // assume the second pid is the ptyProcess and the firts is the authoring server
    if (ptyPid) {
      await killProcess(ptyPid);
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : "");
  }
}
