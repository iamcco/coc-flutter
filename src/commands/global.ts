import { commands, workspace } from 'coc.nvim';

import { Dispose } from '../util/dispose';
import { cmdPrefix } from '../util/constant';
import { getFlutterWorkspaceFolder } from '../util/fs';
import { logger } from '../util/logger';
import { notification } from '../lib/notification';
import { formatMessage } from '../util';
import {flutterSDK} from '../lib/sdk';

const log = logger.getlog('global-commands');

interface GCmd {
  name?: string;
  cmd: string;
  desc: string;
  execute: (cmd: GCmd, ...args: string[]) => Promise<void>;
  getArgs?: () => Promise<string[]>;
}

const getCmd = () => {
  return async ({ cmd, getArgs }: GCmd, ...inputArgs: string[]): Promise<void> => {
    let args: string[] = [];
    if (getArgs) {
      args = await getArgs();
    }
    if (inputArgs.length) {
      args = args.concat(inputArgs);
    }
    const { err, stdout, stderr } = await flutterSDK.execFlutterCommand(`${cmd} ${args.join(' ')}`);
    const devLog = logger.devOutchannel;
    if (stdout) {
      devLog.append(`\n${stdout}\n`);
    }
    if (stderr) {
      devLog.append(`\n${stderr}\n`);
    }
    if (err) {
      devLog.append([err.message, err.stack].join('\n'));
    }
    devLog.show();
  };
};

const cmds: GCmd[] = [
  {
    cmd: 'upgrade',
    desc: 'flutter upgrade',
    execute: getCmd(),
  },
  {
    cmd: 'doctor',
    desc: 'flutter doctor',
    execute: getCmd(),
  },
  {
    cmd: 'create',
    desc: 'flutter create',
    execute: getCmd(),
    getArgs: async (): Promise<string[]> => {
      const params = await workspace.requestInput('Input project name and other params: ');
      return params.split(' ');
    },
  },
  {
    cmd: 'pub get',
    name: 'pub.get',
    desc: 'flutter pub get',
    execute: async (): Promise<void> => {
      const workspaceFolder = await getFlutterWorkspaceFolder();
      log(`pub get command, workspace: ${workspaceFolder}`);
      if (!workspaceFolder) {
        notification.show('Flutter project workspaceFolder not found!');
        return;
      }
      const { code, err, stdout, stderr } = await flutterSDK.execFlutterCommand(`pub get`, { cwd: workspaceFolder });
      notification.show(formatMessage(stdout));
      if (err || code) {
        notification.show(formatMessage(stderr));
      }
    },
  },
  {
    cmd: 'devices',
    desc: 'open devices list',
    execute: async (_, ...args: string[]): Promise<void> => {
      workspace.nvim.command(`CocList FlutterDevices ${args.join(' ')}`);
    },
  },
  {
    cmd: 'emulators',
    desc: 'open emulators list',
    execute: async (): Promise<void> => {
      workspace.nvim.command('CocList FlutterEmulators');
    },
  },
];

export class Global extends Dispose {
  constructor() {
    super();
    cmds.forEach(cmd => {
      const { desc, execute, name } = cmd;
      const cmdId = `${cmdPrefix}.${name || cmd.cmd}`;
      this.push(
        commands.registerCommand(cmdId, async (...args: string[]) => {
          const statusBar = workspace.createStatusBarItem(0, { progress: true });
          this.push(statusBar);
          statusBar.text = desc;
          statusBar.show();
          await execute(cmd, ...args);
          this.remove(statusBar);
        }),
      );
      commands.titles.set(cmdId, desc);
    });
  }
}
