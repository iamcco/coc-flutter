import os from 'os';
import { join, dirname } from 'path';
import { WorkspaceConfiguration } from 'coc.nvim';
import which from 'which';
import { logger } from '../util/logger';
import { exists, getRealPath } from '../util/fs';

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

  async init(config: WorkspaceConfiguration): Promise<void> {
    this._dartCommand = config.get<string>('sdk.dart-command', 'dart');
    try {
      // cache/dart-sdk/bin/dart
      let flutterPath = await which('flutter');
      if (flutterPath) {
        flutterPath = await getRealPath(flutterPath);
        log(`flutter command path => ${flutterPath}`);
        this._dartHome = join(dirname(flutterPath), 'cache', 'dart-sdk');
        log(`dart sdk home => ${this._dartHome}`);
        this._analyzerSnapshotPath = join(this._dartHome, ANALYZER_SNAPSHOT_NAME);
        log(`analyzer path => ${this._analyzerSnapshotPath}`);
        this._state = await exists(this._analyzerSnapshotPath);
        if (!this._dartCommand) {
          this._dartCommand = join(this.dartHome, DART_COMMAND);
        }
        log(`dart command path => ${this._dartCommand}`);
      }
      if (!this._state) {
        log('Dart SDK not found!');
        log(
          JSON.stringify(
            {
              flutterPath,
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
}

export const flutterSDK = new FlutterSDK();
