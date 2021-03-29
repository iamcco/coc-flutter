import { ChildProcess, spawn } from 'child_process';
import { Disposable, Memento, workspace, WorkspaceConfiguration } from 'coc.nvim';
import os from 'os';
import { notification } from '../../lib/notification';
import { flutterSDK } from '../../lib/sdk';
import { statusBar } from '../../lib/status';
import { Dispose } from '../../util/dispose';
import { getFlutterWorkspaceFolder } from '../../util/fs';
import { logger } from '../../util/logger';
import { delay } from '../../util/timer';

const log = logger.getlog('daemon');
const outputLog = logger.getlog('daemon_output');

interface Message {
  id?: number;
  event?: string;
  result?: any;
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

export enum StorageOption {
  dontStore,
  memory,
  workspaceState,
  globalState,
  workspaceConfig,
  globalConfig,
}

type ResponseCallback = (message: Message) => void;

const selectedDeviceIdKey = 'selectedDeviceId';

const REQUEST_TIMEOUT = 15000;

export class DaemonServer extends Dispose {
  private process?: ChildProcess;
  private eventHandlers: Record<string, (params?: Record<string, any>) => void> = {};
  private currentId = 1;
  private selectedDeviceId?: string;
  private responseCallbacks = new Map<number, ResponseCallback>();
  private _currentDevice?: Device;
  private _devices = new Map<string, Device>();
  private workspaceState: Memento;
  private globalState: Memento;

  get currentDevice(): Device | undefined {
    return this._currentDevice;
  }

  get devices(): Device[] {
    return [...this._devices.values()];
  }

  get config(): WorkspaceConfiguration {
    return workspace.getConfiguration('flutter');
  }

  private loadSelectedDeviceId() {
    const selectedDeviceIdConfig = this.config.inspect<string>(selectedDeviceIdKey);
    const selectedDeviceIdWorkspaceState = this.workspaceState.get<string>(selectedDeviceIdKey);
    const selectedDeviceIdGlobalState = this.globalState.get<string>(selectedDeviceIdKey);
    if (selectedDeviceIdConfig?.workspaceValue) {
      this.selectedDeviceId = selectedDeviceIdConfig.workspaceValue;
    } else if (selectedDeviceIdWorkspaceState) {
      this.selectedDeviceId = selectedDeviceIdWorkspaceState;
    } else if (selectedDeviceIdConfig?.globalValue) {
      this.selectedDeviceId = selectedDeviceIdConfig.globalValue;
    } else if (selectedDeviceIdGlobalState) {
      this.selectedDeviceId = selectedDeviceIdGlobalState;
    }
  }

  constructor(props: { workspaceState: Memento; globalState: Memento }) {
    super();
    this.workspaceState = props.workspaceState;
    this.globalState = props.globalState;

    this.loadSelectedDeviceId();

    this.push(
      Disposable.create(() => {
        this.responseCallbacks.clear();
        try {
          this.process?.kill();
          this.process = undefined;
        } catch (error) {
          log(`dispose server error: ${error.message}`);
        }
      }),
    );
    this.eventHandlers['daemon.logMessage'] = this.logMessage;
    this.eventHandlers['daemon.connected'] = this.connected;
    this.eventHandlers['device.added'] = this.deviceAdded;
    this.eventHandlers['device.removed'] = this.deviceRemoved;
  }

  async sendRequest(request: Request): Promise<Message | void> {
    return new Promise((res, rej) => {
      if (!this.process || !this.process.stdin.writable) {
        rej(`Daemon not running but got request: ${JSON.stringify(request)}`);
        return;
      }
      this.responseCallbacks.set(request.id, (message: Message) => {
        res(message);
      });
      setTimeout(() => {
        if (this.responseCallbacks.has(request.id)) {
          this.responseCallbacks.delete(request.id);
          res();
        }
      }, REQUEST_TIMEOUT);
      const rpcRequest = `[${JSON.stringify(request)}]\n`;
      this.process.stdin.write(rpcRequest);
    });
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
    process.on('error', this.onError);
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
    const lines = chunk
      .toString()
      .trim()
      .split('\n')
      .map((line) => line.trim());
    lines.forEach((line) => {
      if (line.match(/^\[{.*}\]$/)) {
        const message = JSON.parse(line)[0];
        this.onMessage(message);
      } else {
        outputLog(line);
      }
    });
  };

  private onMessage = (message: Message) => {
    log(`got message: ${JSON.stringify(message, null, 2)}`);
    const responseId = message.id;
    if (responseId && this.responseCallbacks.has(responseId)) {
      this.responseCallbacks.get(responseId)!(message);
      this.responseCallbacks.delete(responseId);
    }
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

  private connected = async () => {
    statusBar.updateDevice(undefined, true);
    try {
      await this.sendRequest({
        id: this.currentId++,
        method: 'device.enable',
      });
      // wait 15 seconds
      await delay(REQUEST_TIMEOUT);
      if (!this.devices.length) {
        statusBar.updateDevice(undefined, false);
      }
    } catch (error) {
      log(`${error}`);
    }
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

  selectDevice(device: Device, storageOption: StorageOption) {
    this._currentDevice = device;
    if (storageOption !== StorageOption.dontStore) {
      this.selectedDeviceId = device.id;
    }
    switch (storageOption) {
      case StorageOption.workspaceState:
        this.workspaceState.update(selectedDeviceIdKey, device.id);
        this.config.update(selectedDeviceIdKey, undefined);
        break;
      case StorageOption.globalState:
        this.globalState.update(selectedDeviceIdKey, device.id);
        break;
      case StorageOption.workspaceConfig:
        this.config.update(selectedDeviceIdKey, device.id);
        break;
      case StorageOption.globalConfig:
        this.config.update(selectedDeviceIdKey, device.id, true);
        break;
    }
    statusBar.updateDevice(this._currentDevice?.name, false);
  }
}
