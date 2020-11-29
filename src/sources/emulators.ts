import { IList, ListAction, ListItem } from 'coc.nvim';
import colors from 'colors/safe';

import { execCommand } from '../util/fs';
import { lineBreak } from '../util/constant';
import { notification } from '../lib/notification';

interface Emulator {
  name: string;
  id: string;
  platform: string;
  system: string;
}

export default class EmulatorsList implements IList {
  public readonly name = 'FlutterEmulators';
  public readonly description = 'flutter emulators list';
  public readonly defaultAction = 'run';
  public actions: ListAction[] = [];

  constructor() {
    this.actions.push({
      name: 'run',
      multiple: false,
      execute: async (item) => {
        if (Array.isArray(item)) {
          return;
        }
        notification.show(`launch emulator ${item.data!.id}`);
        await execCommand(`flutter emulators --launch ${item.data!.id}`);
      },
    });
  }

  public async loadItems(): Promise<ListItem[]> {
    const { err, stdout } = await execCommand('flutter emulators');
    let emulators: Emulator[] = [];
    if (!err) {
      emulators = stdout
        .split(lineBreak)
        .filter((line) => line.split('•').length === 4)
        .map((line) => {
          // apple_ios_simulator • iOS Simulator • Apple • ios
          const items = line.split('•');
          return {
            name: items[1].trim(),
            id: items[0].trim(),
            platform: items[2].trim(),
            system: items[3].trim(),
          };
        });
    }
    return emulators.map((emulator) => {
      return {
        label: `${colors.yellow(emulator.id)} • ${colors.gray(
          `${emulator.name} • ${emulator.platform} • ${emulator.system}`,
        )}`,
        filterText: emulator.name,
        data: emulator,
      };
    });
  }
}
