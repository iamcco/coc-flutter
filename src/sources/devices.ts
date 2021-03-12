import { IList, ListAction, ListItem, commands } from 'coc.nvim';
import colors from 'colors/safe';

import { DaemonServer, Device } from '../server/deamon';

export default class DevicesList implements IList {
  public readonly name = 'FlutterDevices';
  public readonly description = 'flutter devices list';
  public readonly defaultAction = 'select';
  public actions: ListAction[] = [];
  private daemon: DaemonServer;

  constructor(daemon: DaemonServer) {
    this.daemon = daemon;
    this.actions.push({
      name: 'select',
      multiple: false,
      execute: async (item) => {
        if (Array.isArray(item)) {
          return;
        }
        const device = item.data! as Device;
        daemon.selectDevice(device);
      },
    });
    this.actions.push({
      name: 'select and run',
      multiple: false,
      execute: async (item, context) => {
        if (Array.isArray(item)) {
          return;
        }
        const device = item.data! as Device;
        daemon.selectDevice(device);
        commands.executeCommand(`flutter.run`, ...context.args);
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
