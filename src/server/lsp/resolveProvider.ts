import { ResolveCompletionItemSignature, workspace } from 'coc.nvim';
import { InsertTextFormat, CompletionItem, CancellationToken } from 'vscode-languageserver-protocol';

/**
 * extend CompletionItem's label functionName(…) to functionName(${1})${0}
 */
const funcCallRegex = /^(.*)\(…?\)$/;
const propertyRegex = /^([^ ]+?:\s+),$/;

export const resolveProvider = (
  oldItem: CompletionItem,
  token: CancellationToken,
  next: ResolveCompletionItemSignature,
) => {
  return Promise.resolve(next(oldItem, token)).then((item: CompletionItem | null | undefined) => {
    if (!item) {
      return item;
    }
    const { label, insertText, insertTextFormat } = item;

    // improve import
    if (label === "import '';" && insertTextFormat !== InsertTextFormat.Snippet) {
      if (item.textEdit) {
        delete item.textEdit;
      }
      item.insertText = "import '${1}';${0}";
      item.insertTextFormat = InsertTextFormat.Snippet;
      return item;
    }

    // improve setState
    if (label === 'setState(() {});' && insertTextFormat !== InsertTextFormat.Snippet) {
      if (item.textEdit) {
        delete item.textEdit;
      }
      item.insertText = ['setState(() {', '\t${1}', '});${0}'].join('\n');
      item.insertTextFormat = InsertTextFormat.Snippet;
      return item;
    }

    // improve `key: ,`
    let m = label.match(propertyRegex);
    if (m) {
      if (item.textEdit) {
        delete item.textEdit;
      }
      item.insertText = `${m[1]}\${1},\${0}`;
      item.insertTextFormat = InsertTextFormat.Snippet;
      return item;
    }

    // improve function(…?)
    m = label.match(funcCallRegex);
    if (m) {
      if (item.textEdit) {
        delete item.textEdit;
      }
      item.insertText = `${m[1]}(\${1})\${0}`;
      item.insertTextFormat = InsertTextFormat.Snippet;
      workspace.showMessage(`${item.insertText}--${item.insertTextFormat}`)
      return item;
    }
    return item;
  });
};
