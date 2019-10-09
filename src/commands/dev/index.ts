import {workspace, commands, Disposable} from 'coc.nvim';

import {devServer} from '../../server/dev';
import {Dispose} from '../../util/dispose';
import {opener} from '../../util/opener';
import {notification} from '../../lib/notification';
import {logger} from '../../util/logger';

const log = logger.getlog('dev-command')

export interface ICmd {
  cmd?: string
  desc: string
  callback?: (...params: any[]) => any
}

const cmdPrefix = 'flutter'

export const cmds: Record<string, ICmd> = {
  hotReload: {
    cmd: 'r',
    desc: 'Hot reload'
  },
  hotRestart: {
    cmd: 'R',
    desc: 'Hot restart'
  },
  debugDumpAPP: {
    cmd: 'w',
    desc: 'You can dump the widget hierarchy of the app (debugDumpApp)'
  },
  debugDumpRenderTree: {
    cmd: 't',
    desc: 'To dump the rendering tree of the app (debugDumpRenderTree)'
  },
  debugDumpLayerTree: {
    cmd: 'L',
    desc: 'For layers (debugDumpLayerTree)'
  },
  debugDumpSemanticsTraversalOrder: {
    cmd: 'S',
    desc: 'Accessibility (debugDumpSemantics) for traversal order'
  },
  debugDumpSemanticsHitTestOrder: {
    cmd: 'U',
    desc: 'Accessibility (debugDumpSemantics) for inverse hit test order'
  },
  showWidgetInspectorOverride: {
    cmd: 'i',
    desc: 'To toggle the widget inspector (WidgetsApp.showWidgetInspectorOverride)'
  },
  debugPaintSizeEnabled: {
    cmd: 'p',
    desc: 'To toggle the display of construction lines (debugPaintSizeEnabled)'
  },
  defaultTargetPlatform: {
    cmd: 'o',
    desc: 'To simulate different operating systems, (defaultTargetPlatform)'
  },
  elevationChecker: {
    cmd: 'z',
    desc: 'To toggle the elevation checker'
  },
  showPerformanceOverlay: {
    cmd: 'P',
    desc: 'To display the performance overlay (WidgetsApp.showPerformanceOverlay)'
  },
  debugProfileWidgetBuilds: {
    cmd: 'a',
    desc: 'To enable timeline events for all widget build methods, (debugProfileWidgetBuilds)'
  },
  screenshot: {
    cmd: 's',
    desc: 'To save a screenshot to flutter.png'
  },
  detach: {
    cmd: 'd',
    desc: 'Detach server'
  },
  quit: {
    cmd: 'q',
    desc: 'Quit server'
  },
  openProfiler: {
    desc: 'Observatory debugger and profiler web page',
    callback: (run: Run) => {
      run.openProfiler()
    }
  }
}

export class Run extends Dispose {
  private profilerUrl: string | undefined
  private cmds: Disposable[] = []

  constructor() {
    super()
    const cmdId = `${cmdPrefix}.run`
    this.push(
      commands.registerCommand(cmdId, this.execute, this),
    )
    this.push((function() {
      commands.titles.set(cmdId, 'Run flutter server')
      return {
        dispose() {
          commands.titles.delete(cmdId)
        }
      }
    })())
    this.push(devServer)
  }

  private async execute() {
    if (!devServer.state) {
      await devServer.start()
      devServer.onError(this.onError)
      devServer.onExit(this.onExit)
      devServer.onStdout(this.onStdout)
      devServer.onStderr(this.onStderr)
      this.registerCommands()
    } else {
      workspace.showMessage(`Flutter server is running!`)
    }
  }

  private registerCommands() {
    this.cmds.push(
      ...Object.keys(cmds).map(key => {
        const cmdId = `${cmdPrefix}.${key}`
        commands.titles.set(cmdId, cmds[key].desc)
        const subscription = commands.registerCommand(cmdId, this.execCmd(cmds[key]))
        return {
          dispose() {
            commands.titles.delete(cmdId)
            subscription.dispose()
          }
        }
      })
    )
  }

  private unRegisterCommands() {
    if (this.cmds) {
      this.cmds.forEach(cmd => {
        cmd.dispose()
      })
    }
    this.cmds = []
  }

  private onError = (err: Error) => {
    this.unRegisterCommands()
    workspace.showMessage(`${err.message}`, 'error')
  }

  private onExit = (code: number) => {
    this.unRegisterCommands()
    if (code !== 0) {
      workspace.showMessage(`Flutter server exist with ${code}`, 'warning')
    }
  }

  private isInvalidLine(lines: string[]) {
    if (lines.length === 1) {
      if (/^\s*[0-9,.]+m?s\s*$/.test(lines[0])) {
        return true
      }
    }
    return false
  }

  private onStdout = (lines: string[]) => {
    lines.forEach(line => {
      const m = line.match(/^\s*An Observatory debugger and profiler on .* is available at:\s*(https?:\/\/127\.0\.0\.1:\d+\/.+\/)$/)
      if (m) {
        this.profilerUrl = m[1]
      }
    })
    if (!this.isInvalidLine(lines)) {
      notification.show(lines)
    }
    log(`stdout message: ${JSON.stringify(lines)}`)
  }

  private onStderr = (lines: string[]) => {
    if (!this.isInvalidLine(lines)) {
      notification.show(lines)
    }
    notification.show(lines)
    log(`stderr message: ${JSON.stringify(lines)}`)
  }

  execCmd(cmd: ICmd) {
    return () => {
      if (devServer.state) {
        if (cmd.cmd) {
          devServer.sendCommand(cmd.cmd)
        }
        if (cmd.callback) {
          cmd.callback(this)
        }
      } else {
        workspace.showMessage('Flutter server is not running!')
      }
    }
  }

  openProfiler() {
    if (!this.profilerUrl) {
      return
    }
    if (devServer.state) {
      return opener(this.profilerUrl)
    }
    workspace.showMessage('Flutter server is not running!')
  }

  dispose() {
    super.dispose()
    this.unRegisterCommands()
  }
}
