import { Dispose } from '../util/dispose';
import { LspServer } from '../server/lsp';
import { commands } from 'coc.nvim';
import { cmdPrefix } from '../util/constant';
import { notification } from '../lib/notification';

export class LspCommands extends Dispose {
  private restartCmdId = `${cmdPrefix}.lsp.restart`;

  constructor(lsp: LspServer) {
    super();
    this.push(
      commands.registerCommand(this.restartCmdId, async () => {
        if (!lsp.client) {
          return notification.show('analyzer LSP server is not running');
        }
        await lsp.restart();
      }),
    );
    commands.titles.set(this.restartCmdId, 'restart the lsp server');
  }

  dispose(): void {
    super.dispose();
    commands.titles.delete(this.restartCmdId);
  }
}
