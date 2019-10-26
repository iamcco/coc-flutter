import {TextDocumentPositionParams, Location} from 'vscode-languageserver-protocol'
import {Dispose} from '../util/dispose'
import {LspServer} from '../server/lsp'
import {commands, workspace} from 'coc.nvim'
import {cmdPrefix} from '../util/constant'
import {notification} from '../lib/notification'

export class SuperCommand extends Dispose {
  private requestType: string = 'dart/textDocument/super'
  private cmdId: string = `${cmdPrefix}.gotoSuper`

  constructor(lsp: LspServer) {
    super()
    this.push(
      commands.registerCommand(this.cmdId, async () => {
        if (!lsp.client) {
          return notification.show('analyzer LSP server is not running')
        }
        const doc = await workspace.document
        if (!doc || !doc.textDocument || doc.textDocument.languageId !== 'dart') {
          return
        }
        const position = await workspace.getCursorPosition()
        const args: TextDocumentPositionParams = {
          textDocument: {
            uri: doc.uri
          },
          position
        }
        const params = await lsp.client.sendRequest<Location | null>(
          this.requestType,
          args
        )
        if (params) {
          workspace.jumpTo(params.uri, params.range.start)
        }
      })
    )
    commands.titles.set(this.cmdId, 'jump to the location of the super definition of the class or method')
  }

  dispose() {
    super.dispose()
    commands.titles.delete(this.cmdId)
  }
}
