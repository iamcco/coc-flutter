import {workspace, commands, Disposable} from 'coc.nvim';

import {devServer} from '../../server/dev';
import {Dispose} from '../../util/dispose';
import {opener} from '../../util/opener';
import {notification} from '../../lib/notification';
import {logger} from '../../util/logger';
import {cmdPrefix} from '../../util/constant';

const log = logger.getlog('dev-command')

interface ICmd {
  cmd?: string
  desc: string
  callback?: (...params: any[]) => any
}

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
    desc: 'You can dump the widget hierarchy of the app (debugDumpApp)',
    callback: () => {
      devServer.openDevLog()
    }
  },
  debugDumpRenderTree: {
    cmd: 't',
    desc: 'To dump the rendering tree of the app (debugDumpRenderTree)',
    callback: () => {
      devServer.openDevLog()
    }
  },
  debugDumpLayerTree: {
    cmd: 'L',
    desc: 'For layers (debugDumpLayerTree)',
    callback: () => {
      devServer.openDevLog()
    }
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
    callback: (run: Dev) => {
      run.openProfiler()
    }
  }
}

export class Dev extends Dispose {
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
    log('register dev command')
  }

  private async execute() {
    log(`run dev server, devServer state: ${devServer.state}`)
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
    log('register commands')
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
    log('unregister commands')
    if (this.cmds) {
      this.cmds.forEach(cmd => {
        cmd.dispose()
      })
    }
    this.cmds = []
  }

  private onError = (err: Error) => {
    log(`devServer error: ${err.message}\n${err.stack}`)
    this.unRegisterCommands()
    workspace.showMessage(`${err.message}`, 'error')
  }

  private onExit = (code: number) => {
    log(`devServer exit with: ${code}`)
    this.unRegisterCommands()
    if (code !== 0) {
      workspace.showMessage(`Flutter server exist with ${code}`, 'warning')
    }
  }

  /**
   * do not display lines:
   * - `             xxs`
   * - `             xx.xxs`
   * - `             xx,xxxms (!)`
   * - `I/flutter ( xxx): xxxx`
   * - `I/le.xxxx( xxxx):`
   * - `🔥  To hot reload xxx`
   * - `An Observatory debugger and profiler xxx`
   * - `For a more detailed help message, press "h" xxx`
   */
  private filterInvalidLines(lines: string[]): string[] {
    return lines.filter(line => {
      return !/^\s*[0-9,.]+m?s\s*(\(!\))?\s*$/.test(line)
        && !/^I\/flutter\s*\(\s*\d+\):/.test(line)
        && !/^I\/le\.\w+\s*\(\s*\d+\):/.test(line)
        && !line.startsWith('🔥  To hot reload')
        && !line.startsWith('An Observatory debugger and profiler')
        && !line.startsWith('For a more detailed help message, press "h"')
    })
  }

  private onStdout = (lines: string[]) => {
    lines.forEach(line => {
      const m = line.match(/^\s*An Observatory debugger and profiler on .* is available at:\s*(https?:\/\/127\.0\.0\.1:\d+\/.+\/)$/)
      if (m) {
        this.profilerUrl = m[1]
      }
    })
    notification.show(this.filterInvalidLines(lines))
  }

  private onStderr = (lines: string[]) => {
    notification.show(this.filterInvalidLines(lines))
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
