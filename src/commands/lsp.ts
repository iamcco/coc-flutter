import { commands } from 'coc.nvim';
import { notification } from '../lib/notification';
import { LspServer } from '../server/lsp';
import { deleteCommandTitle, setCommandTitle } from '../util';
import { cmdPrefix } from '../util/constant';
import { Dispose } from '../util/dispose';

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
    setCommandTitle(this.restartCmdId, 'restart the lsp server');
  }

  dispose(): void {
    super.dispose();
    deleteCommandTitle(this.restartCmdId);
  }
}
