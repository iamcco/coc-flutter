import os from 'os';
import { workspace } from 'coc.nvim';
import { spawn, ChildProcessWithoutNullStreams } from 'child_process';

import { getFlutterWorkspaceFolder } from '../../util/fs';
import { logger } from '../../util/logger';
import { notification } from '../../lib/notification';
import { Dispose } from '../../util/dispose';
import {flutterSDK} from '../../lib/sdk';

const log = logger.getlog('devtools-server');

type callback = (...params: any[]) => void;

class DevToolsServer extends Dispose {
  private launchDevToolsTask: ChildProcessWithoutNullStreams | undefined;
  private activateDevToolsTask: ChildProcessWithoutNullStreams | undefined;
  private port: number | undefined;
  private PID: number | undefined;
  private host: string | undefined;
  private onHandler: callback[] = [];

  constructor() {
    super();
    this.push({
      dispose: () => {
        this.port = undefined;
        this.PID = undefined;
        this.host = undefined;
        if (this.launchDevToolsTask) {
          try {
            this.launchDevToolsTask.kill();
            this.launchDevToolsTask = undefined;
          } catch (error) {
            log(`dispose server error: ${error.message}`);
          }
        }
      },
    });
  }

  get state(): boolean {
    return !!(this.launchDevToolsTask && this.port && this.host && this.PID);
  }

  get devToolsUri(): string | undefined {
    return this.state ? `${this.host}:${this.port}` : undefined;
  }

  private _onError = (err: Error) => {
    this.launchDevToolsTask = undefined;
    log(`devtools server error: ${err.message}`);
  };

  private _onExit = (code: number) => {
    this.launchDevToolsTask = undefined;
    log(`devtools server exit with: ${code}`);
  };

  async start(): Promise<boolean> {
    if (this.state) {
      notification.show('Flutter devtools is running!');
      return false;
    }

    const workspaceFolder: string | undefined = await getFlutterWorkspaceFolder();
    if (!workspaceFolder) {
      notification.show('Flutter project workspaceFolder not found!');
      return false;
    }

    notification.show('Launching flutter devtools...');

    // run devtools server, look for an open port if default is unavailable, return output in JSON format
    this.launchDevToolsTask = spawn(flutterSDK.dartCommand, ['pub', 'global', 'run', 'devtools', '--machine', '--try-ports', '10'], {
      cwd: workspaceFolder,
      detached: false,
      shell: os.platform() === 'win32' ? true : undefined,
    });
    this.launchDevToolsTask.on('exit', this._onExit);
    this.launchDevToolsTask.on('error', this._onError);

    if (this.onHandler.length) {
      this.onHandler.forEach(cb => cb());
      this.onHandler = [];
    }
    return true;
  }

  onStdout(handler: callback): void {
    const callback = () => {
      this.launchDevToolsTask!['stdout'].on('data', (chunk: Buffer) => {
        const text = chunk.toString();
        // expecting JSON output because of --machine flag
        try {
          const json = JSON.parse(text);
          this.port = json['params']['port'];
          this.PID = json['params']['pid'];
          this.host = json['params']['host'];
          log(`Devtools running at ${this.host}:${this.port} with PID: ${this.PID}`);
        } catch (error) {
          log(`error while parsing ${text}:`);
          log(error);
        }
        handler();
      });
    };
    if (this.launchDevToolsTask && this.launchDevToolsTask['stdout']) {
      callback();
    } else {
      this.onHandler.push(callback);
    }
  }

  onStderr(handler: callback): void {
    const callback = () => {
      this.launchDevToolsTask!['stderr'].on('data', (chunk: Buffer) => {
        const text = chunk.toString();

        // If devtools hasn't been activated, the process will write a message to stderr
        // Check for this message, prompt user to let us activate devtools, and continue if they accept
        const m = text.match(/No active package devtools/g);
        if (m) {
          const devToolsActivationPrompt = workspace.showPrompt(
            'Flutter pub global devtools has not been activated. Activate now?',
          );
          this.handleDevToolsActivationPrompt(devToolsActivationPrompt, handler);
        }
        // If devtools fails for some other unknown reason, log the output
        else {
          log(text);
        }
      });
    };
    if (this.launchDevToolsTask && this.launchDevToolsTask['stderr']) {
      callback();
    } else {
      this.onHandler.push(callback);
    }
  }

  async handleDevToolsActivationPrompt(activationPrompt: Promise<boolean>, handler: callback) {
    const value = await activationPrompt;
    if (value) {
      const workspaceFolder: string | undefined = await getFlutterWorkspaceFolder();
      if (!workspaceFolder) {
        notification.show('Flutter project workspaceFolder not found!');
        return false;
      }
      this.activateDevToolsTask = spawn(flutterSDK.dartCommand, ['pub', 'global', 'activate', 'devtools'], {
        cwd: workspaceFolder,
        detached: false,
        shell: os.platform() === 'win32' ? true : undefined,
      });
      this.activateDevToolsTask.on('exit', () => {
        handler();
        this.activateDevToolsTask = undefined;
      });
      this.activateDevToolsTask.on('error', (err: Error) => {
        notification.show(`Error activating devtools: ${err.message}`);
        log(err.message);
        this.activateDevToolsTask = undefined;
      });
      this.push({
        dispose: () => {
          if (this.activateDevToolsTask) {
            try {
              this.activateDevToolsTask.kill();
              this.activateDevToolsTask = undefined;
            } catch (err) {
              log(`Error disposing activateDevToolsTask: ${err.message}`);
            }
          }
        },
      });
    } else {
      notification.show('You must run "Flutter pub global activate devtools" to launch a devtools browser debugger.');
    }
  }
}

export const devToolsServer = new DevToolsServer();
