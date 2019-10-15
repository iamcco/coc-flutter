import {join, dirname} from 'path';
import {WorkspaceConfiguration} from 'coc.nvim';
import which from 'which';
import {logger} from '../util/logger';
import {exists, getRealPath} from '../util/fs';

const log = logger.getlog('sdk')

const ANALYZER_SNAPSHOT_NAME = join('bin', 'snapshots', 'analysis_server.dart.snapshot')

class FlutterSDK {
  private _state: boolean = false
  private _dartHome: string = ''
  private _analyzerSnapshotPath: string = ''
  private _dartCommand: string = ''

  public get state() : boolean {
    return this._state
  }

  public get dartHome() : string {
    return this._dartHome
  }

  public get analyzerSnapshotPath() : string {
    return this._analyzerSnapshotPath
  }

  public get dartCommand() : string {
    return this._dartCommand
  }

  async init(config: WorkspaceConfiguration): Promise<void> {
    this._dartCommand = config.get<string>('sdk.dart-command', 'dart')
    try {
      // cache/dart-sdk/bin/dart
      let flutterPath = await which('flutter')
      if (flutterPath) {
        flutterPath = await getRealPath(flutterPath)
        this._dartHome = join(
          dirname(dirname(flutterPath)),
          'bin',
          'cache',
          'dart-sdk',
        )
        this._analyzerSnapshotPath = join(this._dartHome, ANALYZER_SNAPSHOT_NAME)
        this._state = await exists(this._analyzerSnapshotPath)
      }
      if (!this._state) {
        log('Dart SDK not found!')
        log(JSON.stringify({
          flutterPath,
          dartHome: this._dartHome,
          analyzerSnapshotPath: this._analyzerSnapshotPath
        }, null, 2))
      }
    } catch (error) {
      log(error.message || 'find dart sdk error!')
      log(error.stack)
    }
  }
}

export const flutterSDK = new FlutterSDK()
