import { languages, LanguageClient } from 'coc.nvim';
import { TextDocument, Position, CancellationToken, SignatureHelp } from 'vscode-languageserver-protocol';

import { Dispose } from '../../util/dispose';

export class SignatureHelpProvider extends Dispose {
  constructor(client: LanguageClient) {
    super();
    this.push(
      languages.registerSignatureHelpProvider(
        ['dart'],
        {
          async provideSignatureHelp(
            document: TextDocument,
            position: Position,
            token: CancellationToken,
          ): Promise<SignatureHelp | null> {
            return client.sendRequest(
              'textDocument/signatureHelp',
              {
                textDocument: {
                  uri: document.uri,
                },
                position,
              },
              token,
            );
          },
        },
        ['(', ','],
      ),
    );
  }
}
