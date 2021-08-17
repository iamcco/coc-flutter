import { Disposable, Document, LanguageClient, workspace } from 'coc.nvim';
import { Range } from 'vscode-languageserver-protocol';

import { Dispose } from '../../util/dispose';
import { logger } from '../../util/logger';

interface ClosingLabelsParams {
  uri: string;
  labels: {
    label: string;
    range: Range;
  }[];
}

const log = logger.getlog('lsp-closing-labels');

// closing label namespace
const virtualNamespace = 'flutter-closing-label';
// closing label highlight group
const flutterClosingLabel = 'FlutterClosingLabel';
// cache closing labels if in insert mode
// update after leave insert mode
let tmpClosingLabels: Record<string, ClosingLabelsParams> = {};

export class ClosingLabels extends Dispose {
  private nsIds: Record<string, number> = {};
  private flutterClosingLabelPrefix: string;

  constructor(client: LanguageClient) {
    super();
    this.init(client);
    log('register closing labels');
    this.flutterClosingLabelPrefix = workspace.getConfiguration('flutter').get('closingLabelPrefix', '// ');
  }

  async init(client: LanguageClient) {
    const { nvim } = workspace;
    // vim do not support virtual text
    if (!nvim.hasFunction('nvim_buf_set_virtual_text')) {
      return;
    }
    await nvim.command(`highlight default link ${flutterClosingLabel} Comment`);
    client.onNotification('dart/textDocument/publishClosingLabels', this.onClosingLabels);
    this.push(
      workspace.registerAutocmd({
        event: 'InsertLeave',
        pattern: '*.dart',
        callback: this.checkClosingLabels,
      }),
      Disposable.create(() => {
        tmpClosingLabels = {};
      }),
    );
  }

  onClosingLabels = async (params: ClosingLabelsParams) => {
    const { uri, labels } = params;
    if (!labels.length) {
      return;
    }
    const curDoc = await workspace.document;
    const doc = workspace.getDocument(uri);
    // ensure the document and current document exist
    if (!doc || !curDoc) {
      return;
    }

    const mode = await workspace.nvim.mode;
    if (mode.mode && mode.mode.startsWith('i')) {
      tmpClosingLabels[uri] = params;
      return;
    }
    this.updateClosingLabels(doc, params);
  };

  checkClosingLabels = async () => {
    const doc = await workspace.document;
    if (!doc || !tmpClosingLabels[doc.uri]) {
      return;
    }
    const params = tmpClosingLabels[doc.uri];
    delete tmpClosingLabels[doc.uri];
    this.onClosingLabels(params);
  };

  updateClosingLabels = async (doc: Document, params: ClosingLabelsParams) => {
    const { nvim } = workspace;
    const { buffer } = doc;
    const { uri, labels } = params;

    // clear previous virtual text
    if (this.nsIds[uri] !== undefined) {
      buffer.clearNamespace(this.nsIds[uri], 1, -1);
    }

    this.nsIds[uri] = await nvim.createNamespace(virtualNamespace);
    nvim.pauseNotification();
    for (const label of labels) {
      buffer.setVirtualText(this.nsIds[uri], label.range.end.line, [
        [`${this.flutterClosingLabelPrefix}${label.label}`, flutterClosingLabel],
      ]);
    }
    await nvim.resumeNotification();
  };

  dispose() {
    super.dispose();
    // clear closing labels
    const uris = Object.keys(this.nsIds);
    if (uris.length) {
      uris.forEach((uri) => {
        const doc = workspace.getDocument(uri);
        if (!doc) {
          return;
        }
        doc.buffer.clearNamespace(this.nsIds[uri], 1, -1);
      });
    }
  }
}
