import { ExtensionContext, workspace } from 'coc.nvim';

import { logger, logLevel } from './util/logger';
import { Commands } from './commands';
import { Providers } from './provider';
import { LspServer } from './server/lsp';
import { SourceList } from './sources';
import { DaemonServer } from './server/deamon';

export async function activate(context: ExtensionContext): Promise<void> {
  const config = workspace.getConfiguration('flutter');
  const isEnabled = config.get<boolean>('enabled', true);

  // if not enabled then return
  if (!isEnabled) {
    return;
  }

  context.subscriptions.push(logger);
  // logger init
  logger.init(config.get<logLevel>('trace.server', 'off'));

  const daemon = new DaemonServer();
  context.subscriptions.push(daemon);
  // register lsp server
  const lsp = new LspServer(daemon);
  context.subscriptions.push(lsp);

  // register commands
  context.subscriptions.push(new Commands(lsp, daemon));

  // register providers
  context.subscriptions.push(new Providers());

  // register sources
  context.subscriptions.push(new SourceList(lsp, daemon));
}
