import { ChildProcessWithoutNullStreams } from 'child_process';
import { commands, Disposable, workspace } from 'coc.nvim';
import { notification } from '../../lib/notification';
import { DaemonServer } from '../../server/deamon';
import { devServer } from '../../server/dev';
import { devToolsServer } from '../../server/devtools';
import { deleteCommandTitle, setCommandTitle } from '../../util';
import { cmdPrefix } from '../../util/constant';
import { Dispose } from '../../util/dispose';
import { logger } from '../../util/logger';
import { opener } from '../../util/opener';

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
  copyProfilerUrl: {
    desc: 'Copy the observatory debugger and profiler web page to the system clipboard (register +)',
    callback: (run: Dev) => {
      run.copyProfilerUrl();
    },
  },
  openProfiler: {
    desc: 'Observatory debugger and profiler web page',
    callback: (run: Dev) => {
      run.openProfiler();
    },
  },
  openDevToolsProfiler: {
    desc: 'Load DevTools page in an external web browser',
    callback: (run: Dev) => {
      run.openDevToolsProfiler();
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
  clearDevLog: {
    desc: 'Clear the flutter dev server log',
    callback: () => {
      if (devServer.state) {
        devServer.clearDevLog();
      }
    },
  },
};

export class Dev extends Dispose {
  private profilerUrl: string | undefined;
  private cmds: Disposable[] = [];
  private daemon: DaemonServer;

  constructor(daemon: DaemonServer) {
    super();
    this.daemon = daemon;
    ['run', 'attach'].forEach((cmd) => {
      const cmdId = `${cmdPrefix}.${cmd}`;
      this.push(commands.registerCommand(cmdId, this[`${cmd}Server`], this));
      this.push(
        (function () {
          setCommandTitle(cmdId, `${cmd} flutter server`);
          return {
            dispose() {
              deleteCommandTitle(cmdId);
            },
          };
        })(),
      );
    });
    this.push(devServer);
    log('register dev command');
    this.push(devToolsServer);
  }

  runServer(...args: string[]) {
    this.execute('run', args);
  }

  attachServer(...args: string[]) {
    this.execute('attach', args);
  }

  private async execute(cmd: string, args: string[]) {
    log(`${cmd} dev server, devServer state: ${devServer.state}`);
    let baseArgs: string[];
    if (this.daemon.currentDevice && !args.some((arg) => arg === '-d')) {
      baseArgs = [cmd, '-d', this.daemon.currentDevice.id];
    } else {
      baseArgs = [cmd];
    }
    const state = await devServer.start(baseArgs.concat(args));
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
      ...Object.keys(cmds).map((key) => {
        const cmdId = `${cmdPrefix}.dev.${key}`;
        setCommandTitle(cmdId, cmds[key].desc);
        const subscription = commands.registerCommand(cmdId, this.execCmd(cmds[key]));
        return {
          dispose() {
            deleteCommandTitle(cmdId);
            subscription.dispose();
          },
        };
      }),
    );
  }

  private unRegisterCommands() {
    log('unregister commands');
    if (this.cmds) {
      this.cmds.forEach((cmd) => {
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

  private onStdout = (lines: string[]) => {
    lines.forEach((line) => {
      const m = line.match(
        /^\s*An Observatory debugger and profiler on .* is available at:\s*(https?:\/\/127\.0\.0\.1:\d+\/.+\/)$/,
      );
      if (m) {
        this.profilerUrl = m[1];
        const config = workspace.getConfiguration('flutter');
        const runDevToolsAtStartupEnabled = config.get<boolean>('runDevToolsAtStartup', false);
        if (runDevToolsAtStartupEnabled) {
          this.openDevToolsProfiler();
        }
      }
    });
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

  async copyProfilerUrl() {
    if (!this.profilerUrl) {
      return;
    }
    if (devServer.state) {
      workspace.nvim.command(`let @+='${this.profilerUrl}'`);
      return;
    }
    notification.show('Flutter server is not running!');
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

  openDevToolsProfiler(): void {
    if (!this.profilerUrl || !devServer.state) {
      return;
    }
    if (devToolsServer.state) {
      this.launchDevToolsInBrowser();
    } else {
      devToolsServer.start();
      devToolsServer.onStdout(() => {
        this.launchDevToolsInBrowser();
      });
      devToolsServer.onStderr(() => {
        this.openDevToolsProfiler();
      });
    }
  }

  private launchDevToolsInBrowser(): ChildProcessWithoutNullStreams | undefined {
    if (devToolsServer.state) {
      try {
        // assertion to fix encodeURIComponent not accepting undefined- we rule out undefined values before this is called
        const url = `http://${devToolsServer.devToolsUri}/#/?uri=ws${encodeURIComponent(this.profilerUrl as string)}`;
        return opener(url);
      } catch (error) {
        log(`Open browser fail: ${error.message}\n${error.stack}`);
        notification.show(`Open browser fail: ${error.message || error}`);
      }
    }
  }

  dispose() {
    super.dispose();
    this.unRegisterCommands();
  }
}
