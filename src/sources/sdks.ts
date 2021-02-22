import { commands, IList, ListAction, ListItem, workspace } from 'coc.nvim';
import colors from 'colors/safe';

import { flutterSDK } from '../lib/sdk';
import { execCommand, exists, getRealPath, readDir } from '../util/fs';
import { join } from 'path';
import { readFile } from 'fs/promises';
import { logger } from '../util/logger';
import { homedir } from 'os';
import { LspServer } from '../server/lsp';

interface Sdk {
  location: string;
  version: string;
  fvmVersion?: string;
  isFvm: boolean;
  isCurrent: boolean;
}

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
        let sdk: Sdk = item.data;
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
  }

  public async loadItems(): Promise<ListItem[]> {
    let sdks: Sdk[] = [];

    let currentSdk = await getRealPath(flutterSDK.sdkHome);

    const config = workspace.getConfiguration('flutter');
    const fvmEnabled = config.get<boolean>('fvm.enabled', true);
    let home = homedir();

    if (fvmEnabled) {
      let fvmCachePath = join(home, 'fvm', 'versions');
      const settingsPath = join(home, 'fvm', '.settings');
      try {
        const fvmSettingsFileExists = exists(settingsPath);
        if (fvmSettingsFileExists) {
          const settingsRaw = await readFile(settingsPath);
          const settings = JSON.parse(settingsRaw.toString());
          if (typeof(settings.cachePath) == 'string' && settings.cachePath.trim() != '') {
            fvmCachePath = settings.cachePath;
          }
        }
      } catch(error) {
        log(`Failed to load fvm settings: ${error.message}`);
      }

      const fvmVersions = await readDir(fvmCachePath);
      for (const version of fvmVersions) {
        let location = join(fvmCachePath, version);
        const isFlutterDir = await exists(join(location, 'bin', 'flutter'));
        if (!isFlutterDir) continue;
        const flutterVersion = await execCommand(`cat ${join(location, 'version')}`);
        sdks.push({
          location: location,
          fvmVersion: version,
          isFvm: true,
          version: flutterVersion.err ? version: `${version} (${flutterVersion.stdout})`,
          isCurrent: location == currentSdk,
        });
      }
    }



    const paths = config.get<string[]>('sdk.searchPaths', []);

    for (let path of paths) {
      path = path.replace('~', home);
      const isFlutterDir = await exists(join(path, 'bin', 'flutter'));
      if (isFlutterDir) {
        const version = await execCommand(`cat ${join(path, 'version')}`);
        if (!version.err) {
          sdks.push({
            location: path,
            isFvm: false,
            version: version.stdout,
            isCurrent: path == currentSdk,
          });
          continue;
        }
      }

      const files = await readDir(path);
      for (const file of files) {
        let location = join(path, file);
        const isFlutterDir = await exists(join(location, 'bin', 'flutter'));
        if (!isFlutterDir) continue;
        const version = await execCommand(`cat ${join(location, 'version')}`);
        sdks.push({
          location: location,
          isFvm: false,
          version: version.err ? 'unknown' : version.stdout,
          isCurrent: location == currentSdk,
        });
      }
    }

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
