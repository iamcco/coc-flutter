import os from 'os';
import { join, dirname } from 'path';
import { WorkspaceConfiguration } from 'coc.nvim';
import which from 'which';
import { logger } from '../util/logger';
import { exists, getRealPath, execCommand } from '../util/fs';

const log = logger.getlog('sdk');

const ANALYZER_SNAPSHOT_NAME = join('bin', 'snapshots', 'analysis_server.dart.snapshot');
const DART_COMMAND = join('bin', os.platform() === 'win32' ? 'dart.bat' : 'dart');

class FlutterSDK {
  private _state = false;
  private _dartHome = '';
  private _analyzerSnapshotPath = '';
  private _dartCommand = '';

  public get state(): boolean {
    return this._state;
  }

  public get dartHome(): string {
    return this._dartHome;
  }

  public get analyzerSnapshotPath(): string {
    return this._analyzerSnapshotPath;
  }

  public get dartCommand(): string {
    return this._dartCommand;
  }

  public async getVersion(): Promise<[number, number, number] | undefined> {
    if (this._dartCommand) {
      const { stderr } = await execCommand(`${this._dartCommand} --version`);
      if (stderr) {
        const m = stderr.match(/version:\s+(\d+)\.(\d+)\.(\d+)/);
        if (m) {
          log(`dart version: v${m[1]}.${m[2]}.${m[3]}`);
          return [parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3])];
        }
      }
    }
    return undefined;
  }

  public async isVersionGreatOrEqualTo(version: [number, number, number]): Promise<boolean> {
    const v = await this.getVersion();
    if (!v) {
      return false;
    }
    return v.every((n, idx) => n >= version[idx]);
  }

  async init(config: WorkspaceConfiguration): Promise<void> {
    this._dartCommand = config.get<string>('sdk.dart-command', '');
    const flutterLookup = config.get<string>('sdk.flutter-lookup', '');
    const dartLookup = config.get<string>('sdk.dart-lookup', '');

    try {
      // dart sdk from flutter sdk
      // => cache/dart-sdk
      await this.initDarkSdkHomeFromFlutter(flutterLookup);
      // if do not have flutter sdk, detect dart sdk
      const isPathExists = await exists(this._dartHome);
      if (!isPathExists) {
        await this.initDarkSdkHome(dartLookup);
      }
      await this.initDartSdk();
      if (!this._state) {
        log('Dart SDK not found!');
        log(
          JSON.stringify(
            {
              dartHome: this._dartHome,
              analyzerSnapshotPath: this._analyzerSnapshotPath,
            },
            null,
            2,
          ),
        );
      }
    } catch (error) {
      log(error.message || 'find dart sdk error!');
      log(error.stack);
    }
  }

  private async initDarkSdkHomeFromFlutter(flutterLookup: string) {
    try {
      let flutterPath: string;

      if (flutterLookup.length == 0) {
        flutterPath = await which('flutter');
      } else {
        const { stdout } = await execCommand(flutterLookup);
        flutterPath = stdout;
        if (stdout.length == 0) {
          throw new Error('flutter lookup returned empty string');
        }
      }
      log(`which flutter command => ${flutterPath}`);

      if (flutterPath) {
        flutterPath = await getRealPath(flutterPath);
        log(`flutter command path => ${flutterPath}`);
        this._dartHome = join(dirname(flutterPath), 'cache', 'dart-sdk');
        log(`dart sdk home => ${this._dartHome}`);
      }
    } catch (error) {
      log(`flutter command not found: ${error.message}`);
    }
  }

  private async initDarkSdkHome(dartLookup: string) {
    try {
      let dartPath: string;

      if (dartLookup.length == 0) {
        dartPath = await which('dart');
      } else {
        const { stdout } = await execCommand(dartLookup);
        dartPath = stdout;
        if (stdout.length == 0) {
          throw new Error('dart lookup returned empty string');
        }
      }
      log(`which dart command => ${dartPath}`);

      if (dartPath) {
        dartPath = await getRealPath(dartPath);
        log(`dart command path => ${dartPath}`);
        this._dartHome = join(dirname(dartPath), '..');
        log(`dart sdk home => ${this._dartHome}`);
      }
    } catch (error) {
      log(`dart command not found: ${error.message}`);
    }
  }

  private async initDartSdk() {
    this._analyzerSnapshotPath = join(this._dartHome, ANALYZER_SNAPSHOT_NAME);
    log(`analyzer path => ${this._analyzerSnapshotPath}`);
    this._state = await exists(this._analyzerSnapshotPath);
    if (!this._dartCommand) {
      this._dartCommand = join(this.dartHome, DART_COMMAND);
      if (os.platform() === 'win32') {
        const isCommandExists = await exists(this._dartCommand);
        if (!isCommandExists) {
          this._dartCommand = this._dartCommand.replace(/bat$/, 'exe');
        }
      }
    }
    log(`dart command path => ${this._dartCommand}`);
  }
}

export const flutterSDK = new FlutterSDK();
