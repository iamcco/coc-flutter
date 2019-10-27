import { LanguageClient, workspace } from 'coc.nvim';
import { Range } from 'vscode-languageserver-protocol';

import { Dispose } from '../../util/dispose';
import { logger } from '../../util/logger';

const log = logger.getlog('lsp-closing-labels');

// closing label namespace
const virtualNamespace = 'flutter-closing-lablel';
// closing label highlight group
const flutterClosingLabel = 'FlutterClosingLabel';

interface ClosingLabelsParams {
  uri: string;
  labels: {
    label: string;
    range: Range;
  }[];
}

export class ClosingLabels extends Dispose {
  private nsIds: Record<string, number> = {};

  constructor(client: LanguageClient) {
    super();
    this.init(client);
    log('register closing labels');
  }

  async init(client: LanguageClient) {
    const { nvim } = workspace;
    // vim do not support virtual text
    if (!nvim.hasFunction('nvim_buf_set_virtual_text')) {
      return;
    }
    await nvim.command(`highlight default link ${flutterClosingLabel} Comment`);
    client.onNotification('dart/textDocument/publishClosingLabels', this.onClosingLabels);
  }

  onClosingLabels = async (params: ClosingLabelsParams) => {
    const { uri, labels } = params;
    if (!labels.length) {
      return;
    }
    const doc = workspace.getDocument(uri);
    // ensure the document is exists
    if (!doc) {
      return;
    }

    const { nvim } = workspace;
    const { buffer } = doc;

    // clear previous virtual text
    if (this.nsIds[uri] !== undefined) {
      buffer.clearNamespace(this.nsIds[uri], 1, -1);
    }

    this.nsIds[uri] = await nvim.createNamespace(virtualNamespace);
    nvim.pauseNotification();
    for (const label of labels) {
      buffer.setVirtualText(this.nsIds[uri], label.range.end.line, [[`// ${label.label}`, flutterClosingLabel]]);
    }
    await nvim.resumeNotification();
  };

  dispose() {
    super.dispose();
    // clear closing labels
    const uris = Object.keys(this.nsIds);
    if (uris.length) {
      uris.forEach(uri => {
        const doc = workspace.getDocument(uri);
        if (!doc) {
          return;
        }
        doc.buffer.clearNamespace(this.nsIds[uri], 1, -1);
      });
    }
  }
}
