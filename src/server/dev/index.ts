import {workspace, OutputChannel} from 'coc.nvim'
import {spawn, ChildProcessWithoutNullStreams} from 'child_process'
import {Readable} from 'stream'

import {getFlutterWorkspaceFolder} from '../../util/fs'
import {lineBreak} from '../../util/constant'
import {logger} from '../../util/logger'
import {notification} from '../../lib/notification'
import {Dispose} from '../../util/dispose'

const log = logger.getlog('server')

interface event {
  event: string
  handler: (...params: any[]) => any
}

class DevServer extends Dispose {
  private outputChannel: OutputChannel | undefined
  private task: ChildProcessWithoutNullStreams | undefined
  private onHandler: event[] = []
  private onStdoutHandler: event[] = []
  private onStderrHandler: event[] = []

  constructor() {
    super()
    this.push({
      dispose: () => {
        if (this.task) {
          try {
            this.task.kill()
            this.task = undefined
          } catch (error) {
            log(`dispose server error: ${error.message}`)
          }
        }
      }
    })
  }

  private _onError = (err: Error) => {
    this.task = undefined
    log(`server error: ${err.message}`)
  }

  private _onExit = (code: number) => {
    this.task = undefined
    log(`server exit with: ${code}`)
  }

  private listener(
    event: string,
    handler: (...params: any[]) => any,
    target: ChildProcessWithoutNullStreams | Readable | undefined,
    tmp: event[]
  ) {
    if (target) {
      target.on(event, handler)
    } else {
      tmp.push({
        event,
        handler
      })
    }
  }

  private on(event: string, handler: (...params: any[]) => any) {
    this.listener(event, handler, this.task, this.onHandler)
  }

  private devLog(message: string) {
    if (this.outputChannel) {
      this.outputChannel.append(message)
    }
  }

  get state() : boolean {
    return !!this.task && this.task.stdin.writable
  }

  async start () {
    if (this.task && this.task.stdin.writable) {
      return
    }
    const workspaceFolder = await getFlutterWorkspaceFolder()
    if (!workspaceFolder) {
      workspace.showMessage('Flutter project workspaceFolder not found!')
      return
    }
    log(`server start at: ${workspaceFolder}`)

    notification.show('Start flutter dev server...')

    if (this.outputChannel) {
      this.outputChannel.clear()
    } else {
      this.outputChannel = logger.devOutchannel
    }

    this.task = spawn('flutter', ['run'], {
      cwd: workspaceFolder,
      detached: false
    })
    this.task.on('exit', this._onExit)
    this.task.on('error', this._onError)

    if (this.onHandler.length) {
      this.onHandler.forEach(item => {
        this.on(item.event, item.handler)
      })
      this.onHandler = []
    }
    if (this.onStdoutHandler.length) {
      this.onStdoutHandler.forEach(item => {
        this.onStdout(item.handler)
      })
      this.onStdoutHandler = []
    }
    if (this.onStderrHandler.length) {
      this.onStderrHandler.forEach(item => {
        this.onStdout(item.handler)
      })
      this.onStderrHandler = []
    }
  }

  onExit(handler: (...params: any[]) => any) {
    this.listener('exit', handler, this.task, this.onHandler)
  }

  onError(handler: (...params: any[]) => any) {
    this.listener('error', handler, this.task, this.onHandler)
  }

  onStdout(handler: (lines: string[]) => void) {
    this.listener(
      'data',
      (chunk: Buffer) => {
        let lines = chunk.toString()
        this.devLog(lines)
        lines = lines.trim()
        if (lines == '') {
          return
        }
        handler(lines.split(lineBreak))
      },
      this.task && this.task.stdout,
      this.onStdoutHandler
    )
  }

  onStderr(handler: (lines: string[]) => void) {
    this.listener(
      'data',
      (chunk: Buffer) => {
        let lines = chunk.toString()
        this.devLog(lines)
        lines = lines.trim()
        if (lines == '') {
          return
        }
        handler(lines.split(lineBreak))
      },
      this.task && this.task.stderr,
      this.onStderrHandler
    )
  }

  sendCommand(cmd?: string) {
    if (!cmd) {
      return
    }
    if (this.task && this.task.stdin.writable) {
      this.task.stdin.write(cmd)
    } else {
      workspace.showMessage('Flutter server is not running!')
    }
  }

  openDevLog() {
    if (this.outputChannel) {
      this.outputChannel.show()
    }
  }
}

export const devServer = new DevServer()
