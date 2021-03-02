import { commands, window, workspace } from 'coc.nvim';
import { Location, TextDocumentPositionParams } from 'vscode-languageserver-protocol';
import { notification } from '../lib/notification';
import { LspServer } from '../server/lsp';
import {deleteCommandTitle, setCommandTitle} from '../util';
import { cmdPrefix } from '../util/constant';
import { Dispose } from '../util/dispose';

export class SuperCommand extends Dispose {
  private requestType = 'dart/textDocument/super';
  private cmdId = `${cmdPrefix}.gotoSuper`;

  constructor(lsp: LspServer) {
    super();
    this.push(
      commands.registerCommand(this.cmdId, async () => {
        if (!lsp.client) {
          return notification.show('analyzer LSP server is not running');
        }
        const doc = await workspace.document;
        if (!doc || !doc.textDocument || doc.textDocument.languageId !== 'dart') {
          return;
        }
        const position = await window.getCursorPosition();
        const args: TextDocumentPositionParams = {
          textDocument: {
            uri: doc.uri,
          },
          position,
        };
        const params = await lsp.client.sendRequest<Location | null>(this.requestType, args);
        if (params) {
          workspace.jumpTo(params.uri, params.range.start);
        }
      }),
    );
    setCommandTitle(this.cmdId, 'jump to the location of the super definition of the class or method');
  }

  dispose(): void {
    super.dispose();
    deleteCommandTitle(this.cmdId);
  }
}
