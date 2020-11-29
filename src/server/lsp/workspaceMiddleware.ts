import { WorkspaceConfiguration, Uri } from 'coc.nvim';
import { homedir } from 'os';
import { WorkspaceFoldersChangeEvent } from 'vscode-languageserver-protocol';

import { flutterSDK } from '../../lib/sdk';

export const getDidChangeWorkspaceFolders = (config: WorkspaceConfiguration) => (
  data: WorkspaceFoldersChangeEvent,
  next: (data: WorkspaceFoldersChangeEvent) => void,
): void => {
  if (data.added.length && flutterSDK.sdkHome !== '') {
    const ignore = config
      .get<string[]>('workspaceFolder.ignore', [])
      .concat(flutterSDK.sdkHome)
      .map((p) => {
        p = p.replace(/^(~|\$HOME)/, homedir());
        return Uri.file(p).toString().replace(/\/$/, '');
      });
    data.added = data.added.filter((fold) => !ignore.some((i) => fold.uri.startsWith(i)));
  }
  if (data.added.length || data.removed.length) {
    next(data);
  }
};
