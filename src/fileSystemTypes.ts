/**
 * A simple, tree-like structure to describe the contents of a folder to be mounted.
 *
 * @example
 * ```
 * const tree = {
 *   myproject: {
 *     directory: {
 *       'foo.js': {
 *         file: {
 *           contents: 'const x = 1;',
 *         },
 *       },
 *       .envrc: {
 *         file: {
 *           contents: 'ENVIRONMENT=staging'
 *         }
 *       },
 *     },
 *   },
 *   emptyFolder: {
 *     directory: {}
 *   },
 * };
 * ```
 */
export interface FileSystemTree {
  [name: string]: DirectoryNode | FileNode;
}
/**
 * Represents a directory, see {@link FileSystemTree}.
 */
export interface DirectoryNode {
  directory: FileSystemTree;
}
/**
 * Represents a file, see {@link FileSystemTree}.
 */
export interface FileNode {
  file: {
    /**
     * The contents of the file, either as a UTF-8 string or as raw binary.
     */
    contents: string | Uint8Array;
  };
}

export interface DirEnt<T> {
  name: T;
  isFile(): boolean;
  isDirectory(): boolean;
}

export interface FileSystemAPI {
  readdir(
    cwd: string,
    path: string,
    options:
      | "buffer"
      | {
          encoding: "buffer";
          withFileTypes?: false;
        }
  ): Promise<Uint8Array[]>;
  readdir(
    cwd: string,
    path: string,
    options?:
      | {
          encoding?: BufferEncoding | null;
          withFileTypes?: false;
        }
      | BufferEncoding
      | null
  ): Promise<string[]>;
  readdir(
    cwd: string,
    path: string,
    options: {
      encoding: "buffer";
      withFileTypes: true;
    }
  ): Promise<DirEnt<Uint8Array>[]>;
  readdir(
    cwd: string,
    path: string,
    options: {
      encoding?: BufferEncoding | null;
      withFileTypes: true;
    }
  ): Promise<DirEnt<string>[]>;

  readFile(cwd: string, path: string, encoding?: null): Promise<Uint8Array>;
  readFile(
    cwd: string,
    path: string,
    encoding: BufferEncoding
  ): Promise<string>;

  writeFile(
    cwd: string,
    path: string,
    data: string | Uint8Array,
    options?:
      | string
      | {
          encoding?: string | null;
        }
      | null
  ): Promise<void>;

  mkdir(
    cwd: string,
    path: string,
    options?: {
      recursive?: false;
    }
  ): Promise<void>;
  mkdir(
    cwd: string,
    path: string,
    options: {
      recursive: true;
    }
  ): Promise<string>;

  rm(
    cwd: string,
    path: string,
    options?: {
      force?: boolean;
      recursive?: boolean;
    }
  ): Promise<void>;
}
