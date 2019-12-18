import { OutputChannel } from 'coc.nvim';
import os from 'os';
import { spawn, ChildProcessWithoutNullStreams } from 'child_process';

import { getFlutterWorkspaceFolder } from '../../util/fs';
import { lineBreak } from '../../util/constant';
import { logger } from '../../util/logger';
import { notification } from '../../lib/notification';
import { Dispose } from '../../util/dispose';

const log = logger.getlog('server');

type callback = (...params: any[]) => void;

class DevServer extends Dispose {
  private stdoutOutput = '';
  private stderrOutput = '';
  private outputChannel: OutputChannel | undefined;
  private task: ChildProcessWithoutNullStreams | undefined;
  private onHandler: callback[] = [];

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

    this.stdoutOutput = '';
    this.stderrOutput = '';

    if (this.outputChannel) {
      this.outputChannel.clear();
    } else {
      this.outputChannel = logger.devOutchannel;
    }

    this.task = spawn('flutter', ['run'].concat(args), {
      cwd: workspaceFolder,
      detached: false,
      shell: os.platform() === 'win32' ? true : undefined
    });
    this.task.on('exit', this._onExit);
    this.task.on('error', this._onError);

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

  onStdout(handler: (lines: string[]) => void) {
    const callback = () => {
      this.task!.stdout.on('data', (chunk: Buffer) => {
        const text = chunk.toString();
        this.devLog(text);
        this.stdoutOutput += text;
        const lines = this.stdoutOutput.split(lineBreak);
        if (lines.length > 1) {
          if (lines[lines.length - 1] === '') {
            lines.pop();
            this.stdoutOutput = '';
          } else {
            this.stdoutOutput = lines.pop()!;
          }
          handler(lines);
        }
      });
    };
    if (this.task && this.task.stdout) {
      callback();
    } else {
      this.onHandler.push(callback);
    }
  }

  onStderr(handler: (lines: string[]) => void) {
    const callback = () => {
      this.task!.stderr.on('data', (chunk: Buffer) => {
        const text = chunk.toString();
        this.devLog(text);
        this.stderrOutput += text;
        const lines = this.stderrOutput.split(lineBreak);
        if (lines.length > 1) {
          if (lines[lines.length - 1] === '') {
            lines.pop();
            this.stderrOutput = '';
          } else {
            this.stderrOutput = lines.pop()!;
          }
          handler(lines);
        }
      });
    };
    if (this.task && this.task.stderr) {
      callback();
    } else {
      this.onHandler.push(callback);
    }
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

  openDevLog() {
    if (this.outputChannel) {
      this.outputChannel.show();
    }
  }
}

export const devServer = new DevServer();
