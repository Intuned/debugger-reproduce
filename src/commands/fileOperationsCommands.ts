import * as path from "path";
import * as fs from "fs-extra";
import { DirectoryNode, FileNode, FileSystemTree } from "../fileSystemTypes";

export async function mountFiles(cwd: string, tree: FileSystemTree) {
  for (const name in tree) {
    const fullPath = path.join(cwd, name);
    const node = tree[name];
    if (_isDirectoryNode(node)) {
      // Create directory if it does not exist
      await fs.ensureDir(fullPath);
      // Recursively mount files in the directory
      await mountFiles(fullPath, node.directory);
    } else if (_isFileNode(node)) {
      // Write file
      await fs.writeFile(fullPath, node.file.contents);
    }
  }
}

function _isDirectoryNode(
  node: DirectoryNode | FileNode
): node is DirectoryNode {
  return (node as DirectoryNode).directory !== undefined;
}

function _isFileNode(node: DirectoryNode | FileNode): node is FileNode {
  return (node as FileNode).file !== undefined;
}

export async function createDirectory(cwd: string, name: string) {
  const fullPath = path.join(cwd, name);
  await fs.ensureDir(fullPath);
}

export async function remove(cwd: string, name: string) {
  const fullPath = path.join(cwd, name);
  await fs.remove(fullPath);
}

export async function rename(cwd: string, oldName: string, newName: string) {
  const oldFullPath = path.join(cwd, oldName);
  const newFullPath = path.join(cwd, newName);
  await fs.rename(oldFullPath, newFullPath);
}

export async function writeFile(
  cwd: string,
  fileName: string,
  contents: string
) {
  const fullPath = path.join(cwd, fileName);
  await fs.writeFile(fullPath, contents);
}

export async function readFile(cwd: string, fileName: string) {
  const fullPath = path.join(cwd, fileName);
  return fs.readFile(fullPath, "utf8");
}

export async function readDirectory(cwd: string, fileName: string) {
  const fullPath = path.join(cwd, fileName);
  return fs.readdir(fullPath, "utf8");
}
