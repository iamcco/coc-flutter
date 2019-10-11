import {commands} from 'coc.nvim';

import {Dispose} from '../util/dispose';
import {cmdPrefix} from '../util/constant';
import {execCommand} from '../util/fs';
import {logger} from '../util/logger';

interface ICmd {
  desc: string
  execute: (...params: any[]) => void
}

const getCmd = (cmd: string): ICmd => {
  return {
    desc: `flutter ${cmd}`,
    execute: async () => {
      const { err, stdout, stderr } = await execCommand(`flutter ${cmd}`)
      const devLog = logger.devOutchannel
      if (stdout) {
        devLog.append(`\n${stdout}\n`)
      }
      if (stderr) {
        devLog.append(`\n${stderr}\n`)
      }
      if (err) {
        devLog.append([
          err.message,
          err.stack
        ].join('\n'))
      }
      devLog.show()
    }
  }
}

const cmds = ['upgrade', 'doctor']

export class Global extends Dispose {
  constructor() {
    super()
    cmds.forEach(cmd => {
      const { desc, execute } = getCmd(cmd)
      const cmdId = `${cmdPrefix}.${cmd}`
      this.push(
        commands.registerCommand(cmdId, execute)
      )
      commands.titles.set(cmdId, desc)
    })
  }
}
