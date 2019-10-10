import {commands, workspace} from 'coc.nvim';

import {Dispose} from '../util/dispose';
import {cmdPrefix, lineBreak} from '../util/constant';
import {getFlutterWorkspaceFolder, execCommand} from '../util/fs';
import {logger} from '../util/logger';
import {notification} from '../lib/notification';

const log = logger.getlog('pub-command')

interface ICmd {
  desc: string
  execute: (...params: any[]) => void
}

const pubPrefix = `${cmdPrefix}.pub`

const formatMessage = (text: string): string => text.trim().replace(/\s+/g, ' ')

const cmds: Record<string, ICmd> = {
  get: {
    desc: 'flutter pub get',
    execute: async () => {
      const workspaceFolder = await getFlutterWorkspaceFolder()
      log(`pub get command, workspace: ${workspaceFolder}`)
      if (!workspaceFolder) {
        workspace.showMessage('Flutter project workspaceFolder not found!')
        return
      }
      const { code, err, stdout, stderr } = await execCommand('flutter pub get', { cwd: workspaceFolder })
      notification.show(formatMessage(stdout))
      if (err || code) {
        notification.show(formatMessage(stderr))
      }
    }
  }
}

export class Pub extends Dispose {
  constructor() {
    super()
    Object.keys(cmds).forEach(cmd => {
      const cmdId = `${pubPrefix}.${cmd}`
      this.push(
        commands.registerCommand(cmdId, cmds[cmd].execute)
      )
      commands.titles.set(cmdId, cmds[cmd].desc)
    })
  }
}
