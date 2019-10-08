import {workspace, commands, Disposable } from 'coc.nvim';

import {devServer} from '../../server/dev';
import {Dispose} from '../../util/dispose';

interface ICmd {
  cmd: string
  desc: string
}

const cmdPrefix = 'flutter'

const cmds: Record<string, ICmd> = {
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
}

export class Run extends Dispose {
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

  async execute() {
    if (!devServer.state) {
      await devServer.start()
      devServer.on('error', this.onError)
      devServer.on('exit', this.onExit)
      devServer.on('close', this.onExit)
      devServer.onStdout(this.onStdout)
      devServer.onStderr(this.onStderr)
      this.registerCommands()
    } else {
      workspace.showMessage(`Flutter server is running!`)
    }
  }

  registerCommands() {
    this.cmds.push(
      ...Object.keys(cmds).map(key => {
        const cmdId = `${cmdPrefix}.${key}`
        commands.titles.set(cmdId, cmds[key].desc)
        const subscription = commands.registerCommand(cmdId, this.sendCommand(cmds[key]))
        return {
          dispose() {
            commands.titles.delete(cmdId)
            subscription.dispose()
          }
        }
      })
    )
  }

  unRegisterCommands() {
    if (this.cmds) {
      this.cmds.forEach(cmd => {
        cmd.dispose()
      })
    }
    this.cmds = []
  }

  sendCommand(cmd: ICmd) {
    return () => {
      if (devServer.state) {
        devServer.sendCommand(cmd.cmd)
      } else {
        workspace.showMessage('flutter server is not running!')
      }
    }
  }

  onError = (err: Error) => {
    this.unRegisterCommands()
    workspace.showMessage(`${err.message}`, 'error')
  }

  onExit = (code: number) => {
    this.unRegisterCommands()
    if (code !== 0) {
      workspace.showMessage(`Flutter server exist with ${code}`, 'warning')
    }
  }

  onStdout = (lines: string[]) => {
    workspace.showMessage(`${lines.join('\n')}`)
  }

  onStderr = (lines: string[]) => {
    workspace.showMessage(`${lines.join('\n')}`)
  }

  dispose() {
    super.dispose()
    this.unRegisterCommands()
  }
}
