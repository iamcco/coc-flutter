import { Disposable, workspace, commands } from 'coc.nvim';

import { getFlutterWorkspaceFolder } from '../util/fs';
import { logger } from '../util/logger';

const log = logger.getlog('Pub provider');

export const pubUpdateProvider = (): Disposable => {
  return workspace.onDidSaveTextDocument(async (document) => {
    if (document.uri && document.uri.endsWith('pubspec.yaml')) {
      const workspaceFolder = await getFlutterWorkspaceFolder();
      if (!workspaceFolder) {
        log('Flutter project not found!');
        return;
      }
      commands.executeCommand('flutter.pub.get');
    }
  });
};
