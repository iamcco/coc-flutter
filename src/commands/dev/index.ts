import { commands, Disposable } from 'coc.nvim';

import { devServer } from '../../server/dev';
import { Dispose } from '../../util/dispose';
import { opener } from '../../util/opener';
import { notification } from '../../lib/notification';
import { logger } from '../../util/logger';
import { cmdPrefix } from '../../util/constant';
import { reduceSpace } from '../../util';

const log = logger.getlog('dev-command');

interface DCmd {
  cmd?: string;
  desc: string;
  callback?: (...params: any[]) => any;
}

export const cmds: Record<string, DCmd> = {
  hotReload: {
    cmd: 'r',
    desc: 'Hot reload',
  },
  hotRestart: {
    cmd: 'R',
    desc: 'Hot restart',
  },
  debugDumpAPP: {
    cmd: 'w',
    desc: 'You can dump the widget hierarchy of the app (debugDumpApp)',
    callback: () => {
      devServer.openDevLog();
    },
  },
  debugDumpRenderTree: {
    cmd: 't',
    desc: 'To dump the rendering tree of the app (debugDumpRenderTree)',
    callback: () => {
      devServer.openDevLog();
    },
  },
  debugDumpLayerTree: {
    cmd: 'L',
    desc: 'For layers (debugDumpLayerTree)',
    callback: () => {
      devServer.openDevLog();
    },
  },
  debugDumpSemanticsTraversalOrder: {
    cmd: 'S',
    desc: 'Accessibility (debugDumpSemantics) for traversal order',
  },
  debugDumpSemanticsHitTestOrder: {
    cmd: 'U',
    desc: 'Accessibility (debugDumpSemantics) for inverse hit test order',
  },
  showWidgetInspectorOverride: {
    cmd: 'i',
    desc: 'To toggle the widget inspector (WidgetsApp.showWidgetInspectorOverride)',
  },
  debugPaintSizeEnabled: {
    cmd: 'p',
    desc: 'To toggle the display of construction lines (debugPaintSizeEnabled)',
  },
  defaultTargetPlatform: {
    cmd: 'o',
    desc: 'To simulate different operating systems, (defaultTargetPlatform)',
  },
  elevationChecker: {
    cmd: 'z',
    desc: 'To toggle the elevation checker',
  },
  showPerformanceOverlay: {
    cmd: 'P',
    desc: 'To display the performance overlay (WidgetsApp.showPerformanceOverlay)',
  },
  debugProfileWidgetBuilds: {
    cmd: 'a',
    desc: 'To enable timeline events for all widget build methods, (debugProfileWidgetBuilds)',
  },
  screenshot: {
    cmd: 's',
    desc: 'To save a screenshot to flutter.png',
  },
  detach: {
    cmd: 'd',
    desc: 'Detach server',
  },
  quit: {
    cmd: 'q',
    desc: 'Quit server',
  },
  openProfiler: {
    desc: 'Observatory debugger and profiler web page',
    callback: (run: Dev) => {
      run.openProfiler();
    },
  },
  openDevLog: {
    desc: 'Open flutter dev server log',
    callback: () => {
      if (devServer.state) {
        devServer.openDevLog();
      }
    },
  },
};

export class Dev extends Dispose {
  private profilerUrl: string | undefined;
  private cmds: Disposable[] = [];

  constructor() {
    super();
    const cmdId = `${cmdPrefix}.run`;
    this.push(commands.registerCommand(cmdId, this.execute, this));
    this.push(
      (function() {
        commands.titles.set(cmdId, 'Run flutter server');
        return {
          dispose() {
            commands.titles.delete(cmdId);
          },
        };
      })(),
    );
    this.push(devServer);
    log('register dev command');
  }

  private async execute(...args: string[]) {
    log(`run dev server, devServer state: ${devServer.state}`);
    const state = await devServer.start(args);
    if (state) {
      devServer.onError(this.onError);
      devServer.onExit(this.onExit);
      devServer.onStdout(this.onStdout);
      devServer.onStderr(this.onStderr);
      this.registerCommands();
    }
  }

  private registerCommands() {
    log('register commands');
    this.cmds.push(
      ...Object.keys(cmds).map(key => {
        const cmdId = `${cmdPrefix}.dev.${key}`;
        commands.titles.set(cmdId, cmds[key].desc);
        const subscription = commands.registerCommand(cmdId, this.execCmd(cmds[key]));
        return {
          dispose() {
            commands.titles.delete(cmdId);
            subscription.dispose();
          },
        };
      }),
    );
  }

  private unRegisterCommands() {
    log('unregister commands');
    if (this.cmds) {
      this.cmds.forEach(cmd => {
        cmd.dispose();
      });
    }
    this.cmds = [];
  }

  private onError = (err: Error) => {
    log(`devServer error: ${err.message}\n${err.stack}`);
    this.unRegisterCommands();
    notification.show(`${err.message}`);
  };

  private onExit = (code: number) => {
    log(`devServer exit with: ${code}`);
    this.unRegisterCommands();
    if (code !== 0 && code !== 1) {
      notification.show(`Flutter server exist with ${code}`);
    }
  };

  /**
   * do not display lines:
   * - `W/xxx`
   * - `I/xxx`
   * - `D/xxx`
   * - `🔥  To hot reload xxx`
   * - `An Observatory debugger and profiler xxx`
   * - `For a more detailed help message, press "h" xxx`
   * - `Initializing hot reload...`
   * - `Performing hot reload...`
   * - `Reloaded 1 of 469 libraries in 261ms.`
   */
  private filterInvalidLines(lines: string[]): string[] {
    return lines
      .map(line => reduceSpace(line))
      .filter(line => {
        return (
          line !== '' &&
          !/^[DIW]\//.test(line) &&
          !line.startsWith('🔥 To hot reload') &&
          !line.startsWith('An Observatory debugger and profiler') &&
          !line.startsWith('For a more detailed help message, press "h"') &&
          !line.startsWith('Initializing hot reload') &&
          !line.startsWith('Performing hot reload') &&
          !line.startsWith('Reloaded ')
        );
      });
  }

  private onStdout = (lines: string[]) => {
    lines.forEach(line => {
      const m = line.match(
        /^\s*An Observatory debugger and profiler on .* is available at:\s*(https?:\/\/127\.0\.0\.1:\d+\/.+\/)$/,
      );
      if (m) {
        this.profilerUrl = m[1];
      }
    });
    notification.show(this.filterInvalidLines(lines));
  };

  private onStderr = (/* lines: string[] */) => {
    // TODO: stderr output
  };

  execCmd(cmd: DCmd) {
    return () => {
      if (devServer.state) {
        if (cmd.cmd) {
          devServer.sendCommand(cmd.cmd);
        }
        if (cmd.callback) {
          cmd.callback(this);
        }
      } else {
        notification.show('Flutter server is not running!');
      }
    };
  }

  openProfiler() {
    if (!this.profilerUrl) {
      return;
    }
    if (devServer.state) {
      try {
        return opener(this.profilerUrl);
      } catch (error) {
        log(`Open browser fail: ${error.message}\n${error.stack}`);
        notification.show(`Open browser fail: ${error.message || error}`);
      }
    }
    notification.show('Flutter server is not running!');
  }

  dispose() {
    super.dispose();
    this.unRegisterCommands();
  }
}
