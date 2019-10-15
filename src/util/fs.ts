import fs from 'fs';
import {sep, dirname, join} from 'path';
import { exec, ExecOptions } from 'child_process';
import fastGlob from 'fast-glob';
import {Uri, workspace} from 'coc.nvim';
import {Stats} from '@nodelib/fs.scandir/out/types';
import {ErrnoException} from '@nodelib/fs.stat/out/types';

export const exists = async (path: string): Promise<boolean> =>  {
  return new Promise((resolve) => {
    fs.exists(path, exists => {
      resolve(exists)
    })
  })
}

export const findWorkspaceFolder = async (cwd: string, patterns: string[]): Promise<string | undefined> => {
  return closestPath(
    await findWorkspaceFolders(cwd, patterns)
  )
}

export const findWorkspaceFolders = async (cwd: string, patterns: string[]): Promise<string[]> => {
  const paths = await fastGlob(patterns, {
    onlyFiles: true,
    cwd,
    deep: 10
  })
  return paths.map(p => join(cwd, dirname(p)))
}

export const closestPath = (paths: string[]): string | undefined  => {
  if (paths.length) {
    return paths.slice().sort((a, b) => {
      return a.split(sep).length - b.split(sep).length
    })[0]
  }
  return undefined
}

export const getFlutterWorkspaceFolder = async (): Promise<string | undefined> => {
  return await findWorkspaceFolder(
    Uri.parse(workspace.workspaceFolder.uri).fsPath,
    ['**/pubspec.yaml']
  )
}

export const execCommand = (command: string, options: ExecOptions = {}): Promise<{
  code: number
  err: Error | null
  stdout: string
  stderr: string
}> => {
  return new Promise((resolve) => {
    let code: number = 0
    exec(
      command,
      {
        encoding: 'utf-8',
        ...options
      },
      (err: Error | null, stdout: string = '', stderr: string = '') => {
        resolve({
          code,
          err,
          stdout,
          stderr
        })
      }
    ).on('exit', (co: number) => co && (code = co))
  })
}

export const isSymbolLink = async (path: string): Promise<
  { err: ErrnoException | null, stats: boolean}
  > => {
  return new Promise((resolve) => {
    fs.lstat(path, (err: ErrnoException | null, stats: Stats) => {
      resolve({
        err,
        stats: stats && stats.isSymbolicLink()
      })
    })
  })
}

export const getRealPath = async (path: string): Promise<string> => {
  const { err, stats } = await isSymbolLink(path)
  if (!err && stats) {
    return new Promise((resolve) => {
      fs.realpath(path, (err: ErrnoException | null, realPath: string) => {
        if (err) {
          return resolve(path)
        }
        resolve(realPath)
      })
    })
  }
  return path
}
