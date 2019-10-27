import { IList, ListAction, ListItem, commands } from 'coc.nvim';
import colors from 'colors/safe';

import { execCommand } from '../util/fs';
import { lineBreak } from '../util/constant';

interface Device {
  name: string;
  deviceId: string;
  platform: string;
  system: string;
}

export default class DevicesList implements IList {
  public readonly name = 'FlutterDevices';
  public readonly description = 'flutter devices list';
  public readonly defaultAction = 'run';
  public actions: ListAction[] = [];

  constructor() {
    this.actions.push({
      name: 'run',
      multiple: false,
      execute: async item => {
        if (Array.isArray(item)) {
          return;
        }
        commands.executeCommand(`flutter.run`, '-d', item.data!.deviceId);
      },
    });
  }

  public async loadItems(): Promise<ListItem[]> {
    const { err, stdout } = await execCommand('flutter devices');
    let devices: Device[] = [];
    if (!err) {
      devices = stdout
        .split(lineBreak)
        .filter(line => line.split('•').length === 4)
        .map(line => {
          // MI 6 • 1ba39646 • android-arm64 • Android 9 (API 28)
          const items = line.split('•');
          return {
            name: items[0].trim(),
            deviceId: items[1].trim(),
            platform: items[2].trim(),
            system: items[3].trim(),
          };
        });
    }
    return devices.map(device => {
      return {
        label: `${colors.yellow(device.name)} • ${colors.gray(
          `${device.deviceId} • ${device.platform} • ${device.system}`,
        )}`,
        filterText: device.name,
        data: device,
      };
    });
  }
}
