import {
  ExtensionContext,
  workspace,
} from 'coc.nvim';

import {logger, logLevel} from './util/logger';
import {Commands} from './commands';
import {Providers} from './provider';
import {LspServer} from './lsp';

export async function activate(context: ExtensionContext): Promise<void> {
  const config = workspace.getConfiguration('flutter')
  const isEnabled = config.get<boolean>('enabled', true)

  // if not enabled then return
  if (!isEnabled) {
    return
  }

  context.subscriptions.push(logger)
  // logger init
  logger.init(config.get<logLevel>('trace.server', 'off'))

  // register commands
  context.subscriptions.push(
    new Commands()
  )

  // register providers
  context.subscriptions.push(
    new Providers()
  )

  // register lsp server
  context.subscriptions.push(
    new LspServer()
  )
}
