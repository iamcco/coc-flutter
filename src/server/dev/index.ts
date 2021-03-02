import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import { Disposable, OutputChannel, workspace } from 'coc.nvim';
import os from 'os';
import { notification } from '../../lib/notification';
import { flutterSDK } from '../../lib/sdk';
import { devLogName, lineBreak } from '../../util/constant';
import { Dispose } from '../../util/dispose';
import { getFlutterWorkspaceFolder } from '../../util/fs';
import { logger } from '../../util/logger';


const log = logger.getlog('server');

type callback = (...params: any[]) => void;

class DevServer extends Dispose {
  private outputChannel: OutputChannel | undefined;
  private task: ChildProcessWithoutNullStreams | undefined;
  private onHandler: callback[] = [];
  private isAutoScroll = false;

  constructor() {
    super();
    this.push({
      dispose: () => {
        if (this.task) {
          try {
            this.task.kill();
            this.task = undefined;
          } catch (error) {
            log(`dispose server error: ${error.message}`);
          }
        }
      },
    });
  }

  private _onError = (err: Error) => {
    this.task = undefined;
    log(`server error: ${err.message}`);
  };

  private _onExit = (code: number) => {
    this.task = undefined;
    const config = workspace.getConfiguration('flutter');
    if (config.get<boolean>('autoHideDevLog', false) && this.outputChannel) {
      this.outputChannel.hide();
    }
    log(`server exit with: ${code}`);
  };

  private devLog(message: string) {
    if (this.outputChannel) {
      this.outputChannel.append(message);
    }
  }

  get state(): boolean {
    return !!this.task && this.task.stdin.writable;
  }

  async start(args: string[]): Promise<boolean> {
    if (this.task && this.task.stdin.writable) {
      notification.show('Flutter dev server is running!');
      return false;
    }
    const workspaceFolder = await getFlutterWorkspaceFolder();
    if (!workspaceFolder) {
      notification.show('Flutter project workspaceFolder not found!');
      return false;
    }

    log(`server start at: ${workspaceFolder}`);
    notification.show('Start flutter dev server...');

    if (this.outputChannel) {
      this.outputChannel.clear();
    } else {
      this.outputChannel = logger.devOutchannel;
    }

    this.task = spawn(flutterSDK.flutterCommand, args, {
      cwd: workspaceFolder,
      detached: false,
      shell: os.platform() === 'win32' ? true : undefined,
    });
    this.task.on('exit', this._onExit);
    this.task.on('error', this._onError);

    const config = workspace.getConfiguration('flutter');
    if (config.get<boolean>('autoOpenDevLog', false)) {
      this.openDevLog(true);
    }

    if (this.onHandler.length) {
      this.onHandler.forEach(cb => cb());
      this.onHandler = [];
    }
    return true;
  }

  onExit(handler: (...params: any[]) => any) {
    const callback = () => {
      this.task!.on('exit', handler);
    };
    if (this.task) {
      callback();
    } else {
      this.onHandler.push(callback);
    }
  }

  onError(handler: (...params: any[]) => any) {
    if (this.task) {
      this.task.on('error', handler);
    } else {
      this.onHandler.push(() => {
        this.task!.on('error', handler);
      });
    }
  }

  onData(channel: 'stdout' | 'stderr', handler: (lines: string[]) => void) {
    const callback = () => {
      this.task![channel].on('data', (chunk: Buffer) => {
        const text = chunk.toString();
        this.devLog(text);
        handler(text.split(lineBreak));
      });
    };
    if (this.task && this.task[channel]) {
      callback();
    } else {
      this.onHandler.push(callback);
    }
  }

  onStdout(handler: (lines: string[]) => void) {
    this.onData('stdout', handler);
  }

  onStderr(handler: (lines: string[]) => void) {
    this.onData('stderr', handler);
  }

  sendCommand(cmd?: string) {
    if (!cmd) {
      return;
    }
    if (this.task && this.task.stdin.writable) {
      this.task.stdin.write(cmd);
    } else {
      notification.show('Flutter server is not running!');
    }
  }

  clearDevLog() {
    if (this.outputChannel) {
      this.outputChannel.clear();
    }
  }

  async openDevLog(preserveFocus?: boolean) {
    const config = workspace.getConfiguration('flutter');
    const cmd = config.get<string>('openDevLogSplitCommand', '');
    if (this.outputChannel) {
      if (!cmd) {
        this.outputChannel.show(preserveFocus);
      } else {
        const win = await workspace.nvim.window;
        await workspace.nvim.command(`${cmd} output:///${devLogName}`);
        if (!preserveFocus) {
          workspace.nvim.call('win_gotoid', [win.id]);
        }
      }
    }
    setTimeout(() => {
      this.autoScrollLogWin();
    }, 1000);
  }

  async autoScrollLogWin() {
    if (this.isAutoScroll) {
      return;
    }
    this.isAutoScroll = true;
    const buffers = await workspace.nvim.buffers;
    for (const buf of buffers) {
      const name = await buf.name;
      log(`bufName ${name}`);
      if (name === `output:///${devLogName}`) {
        // FIXME: coc.nvim version v0.80.0 do not export attach function
        const isAttach = await (buf as any).attach(false);
        if (!isAttach) {
          log(`Attach buf ${name} error`);
          this.isAutoScroll = false;
          return;
        }
        this.isAutoScroll = true;
        // FIXME: coc.nvim version v0.80.0 do not export listen function
        (buf as any).listen('lines', async () => {
          const wins = await workspace.nvim.windows;
          if (!wins || !wins.length) {
            return;
          }
          for (const win of wins) {
            const b = await win.buffer;
            const name = await b.name;
            if (name === `output:///${devLogName}`) {
              const lines = await buf.length;
              const curWin = await workspace.nvim.window;
              // do not scroll when log win get focus
              if (win.id === curWin.id) {
                return;
              }
              win.setCursor([lines, 0]);
              break;
            }
          }
        });
        // FIXME: coc.nvim version v0.80.0 do not export listen function
        (buf as any).listen('detach', () => {
          if (this.isAutoScroll) {
            log(`Unexpected detach buf ${name}`);
            this.isAutoScroll = false;
          }
        });
        this.push(
          Disposable.create(() => {
            if (this.isAutoScroll) {
              this.isAutoScroll = false;
              try {
                // FIXME: coc.nvim version v0.80.0 do not export these function
                (buf as any).removeAllListeners();
                (buf as any).detach();
              } catch (error) {
                log(`Detach error ${error.message || error}`);
              }
            }
          }),
        );
        break;
      }
    }
    this.isAutoScroll = false;
  }
}

export const devServer = new DevServer();
