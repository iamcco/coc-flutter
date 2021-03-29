import { IList, ListAction, ListItem, commands, workspace } from 'coc.nvim';
import colors from 'colors/safe';

import { DaemonServer, Device, StorageOption } from '../server/deamon';

export default class DevicesList implements IList {
  public readonly name = 'FlutterDevices';
  public readonly description = 'flutter devices list';
  public actions: ListAction[] = [];
  private daemon: DaemonServer;

  public get defaultAction() {
    const config = workspace.getConfiguration('flutter');
    const option = config.get<string>('devicesDefaultAction', 'workspaceState');
    switch (option) {
      case 'runOnce':
        return 'run';
      case 'globalState':
        return 'select (global state)';
      case 'globalConfig':
        return 'select (global config)';
      case 'workspaceConfig':
        return 'select (workspace config)';
      case 'currentSession':
        return 'select (current session)';
      default:
        return 'select (workspace state)';
    }
  }

  constructor(daemon: DaemonServer) {
    this.daemon = daemon;
    this.actions.push({
      name: 'select (workspace state)',
      multiple: false,
      execute: async (item) => {
        if (Array.isArray(item)) {
          return;
        }
        const device = item.data! as Device;
        daemon.selectDevice(device, StorageOption.workspaceState);
      },
    });
    this.actions.push({
      name: 'select (workspace config)',
      multiple: false,
      execute: async (item) => {
        if (Array.isArray(item)) {
          return;
        }
        const device = item.data! as Device;
        daemon.selectDevice(device, StorageOption.workspaceConfig);
      },
    });
    this.actions.push({
      name: 'select (global state)',
      multiple: false,
      execute: async (item) => {
        if (Array.isArray(item)) {
          return;
        }
        const device = item.data! as Device;
        daemon.selectDevice(device, StorageOption.globalState);
      },
    });
    this.actions.push({
      name: 'select (global config)',
      multiple: false,
      execute: async (item) => {
        if (Array.isArray(item)) {
          return;
        }
        const device = item.data! as Device;
        daemon.selectDevice(device, StorageOption.globalConfig);
      },
    });
    this.actions.push({
      name: 'select (current session)',
      multiple: false,
      execute: async (item) => {
        if (Array.isArray(item)) {
          return;
        }
        const device = item.data! as Device;
        daemon.selectDevice(device, StorageOption.memory);
      },
    });
    this.actions.push({
      name: 'run',
      multiple: false,
      execute: async (item, context) => {
        if (Array.isArray(item)) {
          return;
        }
        commands.executeCommand(`flutter.run`, '-d', item.data!.deviceId, ...context.args);
      },
    });
  }

  public async loadItems(): Promise<ListItem[]> {
    const devices = this.daemon.devices;
    return devices.map((device) => {
      return {
        label: `${colors.yellow(device.name)} • ${colors.gray(`${device.id} • ${device.platform}`)}`,
        filterText: device.name,
        data: device,
      };
    });
  }
}
