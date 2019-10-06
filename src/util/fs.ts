import fs from 'fs';
import fastGlob from 'fast-glob';
import {sep, dirname, join} from 'path';
import {workspace} from 'coc.nvim';

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
