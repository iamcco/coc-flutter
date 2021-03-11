import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import { workspace, WorkspaceConfiguration } from 'coc.nvim';
import os from 'os';
import { notification } from '../../lib/notification';
import { flutterSDK } from '../../lib/sdk';
import { statusBar } from '../../lib/status';
import { Dispose } from '../../util/dispose';
import { getFlutterWorkspaceFolder } from '../../util/fs';
import { logger } from '../../util/logger';

const log = logger.getlog('daemon');
const outputLog = logger.getlog('daemon_output');

interface Message {
  id?: number;
  event?: string;
  params?: { [key: string]: any };
}

interface Request {
  id: number;
  method: string;
  params?: { [key: string]: any };
}

export interface Device {
  id: string;
  name: string;
  platform: string;
}

const selectedDeviceIdKey = 'selectedDeviceId';

export class DaemonServer extends Dispose {
  private process?: ChildProcessWithoutNullStreams;

  private eventHandlers: { [key: string]: (params?: { [key: string]: any }) => void } = {};
  private currentId = 1;
  private selectedDeviceId?: string;
  get currentDevice(): Device | undefined {
    return this._currentDevice;
  }
  private _currentDevice?: Device;
  private _devices = new Map<string, Device>();
  get devices(): Device[] {
    return [...this._devices.values()];
  }

  get config(): WorkspaceConfiguration {
    return workspace.getConfiguration('flutter');
  }

  constructor() {
    super();
    this.selectedDeviceId = this.config.get<string>(selectedDeviceIdKey);
    this.push({
      dispose: () => {
        try {
          this.process?.kill();
          this.process = undefined;
        } catch (error) {
          log(`dispose server error: ${error.message}`);
        }
      },
    });
    this.eventHandlers['daemon.logMessage'] = this.logMessage;
    this.eventHandlers['daemon.connected'] = this.connected;
    this.eventHandlers['device.added'] = this.deviceAdded;
    this.eventHandlers['device.removed'] = this.deviceRemoved;
  }

  async sendRequest(request: Request): Promise<void> {
    if (!this.process || !this.process.stdin.writable) {
      log(`Daemon not running but got request: ${JSON.stringify(request)}`);
      return;
    }
    const rpcRequest = `[${JSON.stringify(request)}]\n`;
    this.process.stdin.write(rpcRequest);
  }

  public async start(): Promise<boolean> {
    if (this.process && this.process.stdin.writable) {
      log('Tried starting daemon while it was already running');
      return false;
    }
    const workspaceFolder = await getFlutterWorkspaceFolder();
    if (!workspaceFolder) {
      notification.show('Flutter project workspaceFolder not found!');
      return false;
    }

    this.process?.kill();
    const args = ['daemon'];
    const process = spawn(flutterSDK.flutterCommand, args, {
      cwd: workspaceFolder,
      detached: false,
      shell: os.platform() === 'win32' ? true : undefined,
    });
    this.process = process;
    process.on('exit', this.onExit);
    process.on('exit', this.onError);
    process.stdout.on('data', this.onStdout);

    return true;
  }

  public stop() {
    if (this.process) {
      this._currentDevice = undefined;
      this._devices.clear();
      this.process.kill();
      this.process = undefined;
    }
  }

  private onStdout = (chunk: Buffer) => {
    const line = chunk.toString().trim();
    if (line.match(/^\[{.*}\]$/)) {
      const message = JSON.parse(line)[0];
      this.onMessage(message);
    } else {
      outputLog(line);
    }
  };

  private onMessage = (message: Message) => {
    log(`got message: ${JSON.stringify(message, null, 2)}`);
    if (!message.event) {
      log(`Message without event`);
      return;
    }
    if (!(message.event in this.eventHandlers)) {
      log(`Unhandled event: ${message.event}`);
      return;
    }
    const eventHandler = this.eventHandlers[message.event];
    eventHandler(message.params);
  };

  private onExit = (code: number) => {
    this.process = undefined;
    log(`daemon exited with: ${code}`);
  };

  private onError = (err: Error) => {
    this.process = undefined;
    log(`daemon error: ${err}`);
  };

  private logMessage = (params?: { [key: string]: any }) => {
    if (!params || !('message' in params)) {
      log('got invalid logmessage event');
      return;
    }
    notification.show(params['message']);
  };

  private connected = (_params?: { [key: string]: any }) => {
    statusBar.updateDevice(undefined, true);
    this.sendRequest({
      id: this.currentId++,
      method: 'device.enable',
    });
  };

  private deviceAdded = (params?: { [key: string]: any }) => {
    if (!params) {
      log('got invalid device.added event');
      return;
    }
    const device = params as Device;
    log(`New device: ${device.name}`);
    this._devices.set(device.id, device);
    if (!this._currentDevice || device.id == this.selectedDeviceId) {
      this.updateCurrentDevice();
    }
  };

  private deviceRemoved = (params?: { [key: string]: any }) => {
    if (!params) {
      log('got invalid device.added event');
      return;
    }
    const device = params as Device;
    this._devices.delete(device.id);
    if (this._currentDevice?.id == device.id) {
      this.updateCurrentDevice();
    }
  };

  private updateCurrentDevice() {
    if (this.selectedDeviceId && this._devices.has(this.selectedDeviceId)) {
      this._currentDevice = this._devices.get(this.selectedDeviceId);
    } else {
      this._currentDevice = this._devices.size > 0 ? this._devices.values().next().value : undefined;
    }
    statusBar.updateDevice(this._currentDevice?.name, false);
  }

  selectDevice(device: Device) {
    this._currentDevice = device;
    this.selectedDeviceId = device.id;
    this.config.update(selectedDeviceIdKey, device.id);
    statusBar.updateDevice(this._currentDevice?.name, false);
  }
}
