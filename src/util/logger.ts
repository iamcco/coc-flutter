import { OutputChannel, workspace, Uri } from 'coc.nvim';
import { devLogName } from './constant';
import { Dispose } from './dispose';

export type logLevel = 'off' | 'message' | 'verbose';

class Logger extends Dispose {
  private _outchannel: OutputChannel | undefined;
  private _devOutchannel: OutputChannel | undefined;
  private _traceServer: logLevel | undefined;

  init(level: logLevel) {
    this._traceServer = level;
    if (this._traceServer !== 'off') {
      this._outchannel = workspace.createOutputChannel('flutter');
      this.push(this._outchannel);
    }
  }

  set outchannel(channel: OutputChannel | undefined) {
    this._outchannel = channel;
  }

  get outchannel(): OutputChannel | undefined {
    return this._outchannel;
  }

  get devOutchannel(): OutputChannel {
    if (!this._devOutchannel) {
      this._devOutchannel = workspace.createOutputChannel(devLogName);
      this.push(this._devOutchannel);
    }
    return this._devOutchannel;
  }

  get traceServer(): logLevel | undefined {
    return this._traceServer;
  }

  getlog(name: string): (message: string | undefined) => void {
    return (message: string | undefined) => {
      message && this._outchannel && this._outchannel.appendLine(`[${name}]: ${message}`);
    };
  }

  dispose() {
    super.dispose();
    this._outchannel = undefined;
    this._devOutchannel = undefined;
    this._traceServer = undefined;
  }
}

export const logger = new Logger();
