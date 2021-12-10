import { ExecOptions } from 'child_process';
import { Uri, workspace, WorkspaceConfiguration } from 'coc.nvim';
import { readFileSync } from 'fs';
import os, { homedir } from 'os';
import { dirname, join } from 'path';
import which from 'which';
import { execCommand, exists, getRealPath, readDir, readFile } from '../util/fs';
import { logger } from '../util/logger';

const log = logger.getlog('sdk');

const ANALYZER_SNAPSHOT_NAME = join('bin', 'snapshots', 'analysis_server.dart.snapshot');
const DART_COMMAND = join('bin', os.platform() === 'win32' ? 'dart.bat' : 'dart');

const _defaultSearchPaths: string[] = ['~/snap/flutter/common/flutter'];

export interface FlutterSdk {
  location: string;
  version: string;
  fvmVersion?: string;
  isFvm: boolean;
  isCurrent: boolean;
}

class FlutterSDK {
  private _sdkHome = '';
  private _state = false;
  private _dartHome = '';
  private _analyzerSnapshotPath = '';
  private _dartCommand = '';
  private _flutterCommand?: string;
  private _fvmEnabled!: boolean;

  private config!: WorkspaceConfiguration;

  public get sdkHome(): string {
    return this._sdkHome;
  }

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

  public get flutterCommand(): string {
    return this._flutterCommand || 'flutter';
  }

  private async _hasValidFlutterSdk(): Promise<boolean> {
    return exists(this._sdkHome) && exists(join(this._sdkHome, 'bin', 'flutter'));
  }

  public async getVersion(): Promise<[number, number, number] | undefined> {
    if (this._dartCommand) {
      const { stderr, stdout } = await execCommand(`${this._dartCommand} --version`);
      if (stderr) {
        const m = stderr.match(/version:\s+(\d+)\.(\d+)\.(\d+)/);
        if (m) {
          log(`dart version: v${m[1]}.${m[2]}.${m[3]}`);
          return [parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3])];
        }
      } else if (stdout) {
        const m = stdout.match(/version:\s+(\d+)\.(\d+)\.(\d+)/);
        if (m) {
          log(`dart version: v${m[1]}.${m[2]}.${m[3]}`);
          return [parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3])];
        }
      } else {
        log('Failed to get dart version');
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
    this.config = config;
    await this._init();
  }

  private async _init(): Promise<void> {
    this._dartCommand = this.config.get<string>('sdk.dart-command', '');
    const dartLookup = this.config.get<string>('sdk.dart-lookup', '');
    this._fvmEnabled = this.config.get<boolean>('fvm.enabled', true);

    this._sdkHome = this.config.get<string>('sdk.path', '');
    let hasValidFlutterSdk = await this._hasValidFlutterSdk();
    if (hasValidFlutterSdk) await this.initFlutterCommandsFromSdkHome();

    try {
      if (this._fvmEnabled && !hasValidFlutterSdk) {
        await this.initDartSdkHomeFromLocalFvm();
        hasValidFlutterSdk = await this._hasValidFlutterSdk();
      }
      if (!hasValidFlutterSdk) {
        await this.initDarkSdkHomeFromSearchPaths();
        hasValidFlutterSdk = await this._hasValidFlutterSdk();
      }
      if (!hasValidFlutterSdk) {
        await this.initDarkSdkHome(dartLookup);
        hasValidFlutterSdk = await this._hasValidFlutterSdk();
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

  private async initDarkSdkHomeFromSearchPaths() {
    try {
      const sdks = await this.findSdks();
      if (sdks.length > 0) {
        this._sdkHome = sdks[0].location;
        await this.initFlutterCommandsFromSdkHome();
      }
    } catch (error) {
      log(`Error configuring sdk from searchPaths: ${error.message}}`);
    }
  }

  private async initDartSdkHomeFromLocalFvm() {
    try {
      const workspaceFolder = workspace.workspaceFolder
        ? Uri.parse(workspace.workspaceFolder.uri).fsPath
        : workspace.cwd;
      const fvmLocation = join(workspaceFolder, '.fvm', 'flutter_sdk');
      if (exists(fvmLocation)) {
        log('Found local fvm sdk');
        this._sdkHome = fvmLocation;
        await this.initFlutterCommandsFromSdkHome();
      } else {
        log('No local fvm sdk');
      }
    } catch (error) {
      log(`Error configuring local fvm sdk: ${error.message}}`);
    }
  }

  private async initFlutterCommandsFromSdkHome() {
    this._flutterCommand = join(this._sdkHome, 'bin', os.platform() === 'win32' ? 'flutter.bat' : 'flutter');
    log(`flutter command path => ${this.flutterCommand}`);
    if (!exists(this._flutterCommand)) {
      log('flutter command path does not exist');
    }
    this._dartHome = join(this._sdkHome, 'bin', 'cache', 'dart-sdk');
    log(`dart sdk home => ${this._dartHome}`);
    if (!exists(this._dartHome)) {
      log('dart sdk home path does not exist');
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
    this._state = exists(this._analyzerSnapshotPath);
    if (!this._dartCommand) {
      this._dartCommand = join(this.dartHome, DART_COMMAND);
      if (os.platform() === 'win32') {
        const isCommandExists = exists(this._dartCommand);
        if (!isCommandExists) {
          this._dartCommand = this._dartCommand.replace(/bat$/, 'exe');
        }
      }
    }
    log(`dart command path => ${this._dartCommand}`);
  }

  execDartCommand(
    command: string,
    options: ExecOptions = {},
  ): Promise<{
    code: number;
    err: Error | null;
    stdout: string;
    stderr: string;
  }> {
    return execCommand(`${this.dartCommand} ${command}`, options);
  }

  execFlutterCommand(
    command: string,
    options: ExecOptions = {},
  ): Promise<{
    code: number;
    err: Error | null;
    stdout: string;
    stderr: string;
  }> {
    return execCommand(`${this.flutterCommand} ${command}`, options);
  }

  private versionForSdk(location: string): string | undefined {
    const versionLocation = join(location, 'version');
    if (!exists(versionLocation)) {
      log(`${versionLocation} does not exist`);
      return;
    }
    const version = readFileSync(versionLocation).toString().trim();
    if (version.length == 0) {
      log(`${versionLocation} was empty`);
      return;
    }
    log(`${versionLocation} => ${version}`);
    return version;
  }

  private async sdkWithLookup(flutterLookup: string, currentSdk: string): Promise<FlutterSdk | undefined> {
    let flutterPath: string;
    if (flutterLookup.length == 0) {
      flutterPath = (await which('flutter')).trim();
    } else {
      const { stdout } = await execCommand(flutterLookup);
      flutterPath = stdout.trim();
      if (stdout.length == 0) {
        return;
      }
    }
    log(`which flutter command => ${flutterPath}`);

    if (flutterPath) {
      flutterPath = await getRealPath(flutterPath);
      flutterPath = flutterPath.trim();
      if (
        flutterPath.toLowerCase().endsWith(join('bin', 'flutter')) ||
        flutterPath.toLowerCase().endsWith(join('bin', 'flutter.bat'))
      ) {
        flutterPath = join(flutterPath, '..', '..');
      }
      const isFlutterDir = exists(join(flutterPath, 'bin', 'flutter'));
      if (!isFlutterDir) return;
      const version = this.versionForSdk(flutterPath);
      if (version) {
        return {
          location: flutterPath,
          version: version,
          isFvm: false,
          isCurrent: currentSdk == flutterPath,
        };
      }
    }
  }

  async findSdks(): Promise<FlutterSdk[]> {
    const sdks: FlutterSdk[] = [];

    const currentSdk = this.sdkHome.length == 0 ? '' : await getRealPath(this.sdkHome);

    const flutterLookup = this.config.get<string>('sdk.flutter-lookup', '');
    const fvmEnabled = this.config.get<boolean>('fvm.enabled', true);
    const home = homedir();

    const lookupSdk = await this.sdkWithLookup(flutterLookup, currentSdk);
    if (lookupSdk) {
      sdks.push(lookupSdk);
    }

    const paths = [...this.config.get<string[]>('sdk.searchPaths', []), ..._defaultSearchPaths];
    log(`searchPaths: ${paths}`);

    for (let path of paths) {
      path = path.replace(/^~/, home).trim();
      const isFlutterDir = exists(join(path, 'bin', 'flutter'));
      if (isFlutterDir) {
        const version = this.versionForSdk(path);
        if (version && !sdks.some((sdk) => sdk.location == path)) {
          sdks.push({
            location: path,
            isFvm: false,
            version: version,
            isCurrent: path == currentSdk,
          });
        }
        continue;
      }

      const files = await readDir(path);
      for (const file of files) {
        const location = join(path, file).trim();
        const isFlutterDir = exists(join(location, 'bin', 'flutter'));
        if (!isFlutterDir) continue;
        if (sdks.some((sdk) => sdk.location == location)) continue;
        const version = this.versionForSdk(location);
        sdks.push({
          location: location,
          isFvm: false,
          version: version || 'unknown',
          isCurrent: location == currentSdk,
        });
      }
    }

    if (fvmEnabled) {
      let fvmCachePath = join(home, 'fvm', 'versions');
      const settingsPath = join(home, 'fvm', '.settings');
      try {
        const fvmSettingsFileExists = exists(settingsPath);
        if (fvmSettingsFileExists) {
          const settingsRaw = await readFile(settingsPath);
          const settings = JSON.parse(settingsRaw.toString());
          if (typeof settings.cachePath == 'string' && settings.cachePath.trim() != '') {
            fvmCachePath = settings.cachePath;
          }
        }
      } catch (error) {
        log(`Failed to load fvm settings: ${error.message}`);
      }

      const fvmVersions = await readDir(fvmCachePath);
      for (const version of fvmVersions) {
        const location = join(fvmCachePath, version).trim();
        const isFlutterDir = exists(join(location, 'bin', 'flutter'));
        if (!isFlutterDir) continue;
        if (sdks.some((sdk) => sdk.location == location)) continue;
        const flutterVersion = this.versionForSdk(location);
        sdks.push({
          location: location,
          fvmVersion: version,
          isFvm: true,
          version: !flutterVersion ? version : `${version} (${flutterVersion})`,
          isCurrent: location == currentSdk,
        });
      }
    }

    return sdks;
  }
}

export const flutterSDK = new FlutterSDK();
