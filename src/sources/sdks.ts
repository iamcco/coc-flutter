import { commands, IList, ListAction, ListItem, workspace } from 'coc.nvim';
import colors from 'colors/safe';

import { flutterSDK, FlutterSdk } from '../lib/sdk';
import { execCommand, exists, getRealPath, readDir } from '../util/fs';
import { logger } from '../util/logger';
import { LspServer } from '../server/lsp';

const log = logger.getlog('SdksList')

export default class SdksList implements IList {
  public readonly name = 'FlutterSDKs';
  public readonly description = 'list of local flutter sdks';
  public readonly defaultAction = 'switch';
  public actions: ListAction[] = [];

  constructor(lsp: LspServer) {
    this.actions.push({
      name: 'switch',
      multiple: false,
      execute: async (item) => {
        if (Array.isArray(item)) {
          return;
        }
        let sdk: FlutterSdk = item.data;
        if (sdk.isCurrent) return;
        const config = workspace.getConfiguration('flutter');
        if (sdk.isFvm) {
          await execCommand(`fvm use ${sdk.fvmVersion!}`);
          config.update('sdk.path', '.fvm/flutter_sdk');
          log(`swithed to ${sdk.version} using fvm`);
        } else {
          config.update('sdk.path', sdk.location);
        }
        await flutterSDK.reloadWithSdk(sdk.location);
        await lsp.restart();
        commands.executeCommand('flutter.pub.get');
      },
    });
    this.actions.push({
      name: 'global switch',
      multiple: false,
      execute: async (item) => {
        if (Array.isArray(item)) {
          return;
        }
        let sdk: FlutterSdk = item.data;
        if (sdk.isCurrent) return;
        const config = workspace.getConfiguration('flutter');
        config.update('sdk.path', sdk.location, true);
        await flutterSDK.reloadWithSdk(sdk.location);
        await lsp.restart();
        commands.executeCommand('flutter.pub.get');
      },
    });
  }

  public async loadItems(): Promise<ListItem[]> {
    const sdks = await flutterSDK.findSdks();
    return sdks.map(sdk => {
      return {
        label: `${sdk.isCurrent ? colors.yellow(sdk.version) + colors.bold(' (current)') : colors.yellow(sdk.version)} • ${colors.gray(
          `${sdk.location}`,
        )}`,
        filterText: sdk.location,
        data: sdk,
      };
    });
  }
}
