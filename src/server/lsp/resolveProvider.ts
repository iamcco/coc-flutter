import { ResolveCompletionItemSignature } from 'coc.nvim';
import {
  InsertTextFormat,
  CompletionItemKind,
  CompletionItem,
  CancellationToken,
} from 'vscode-languageserver-protocol';

/**
 * extend CompletionItem's label functionName(…) to functionName(${1})${0}
 */
const funcCallRegex = /\(…\)$/;
const propertyRegex = /^([^ ]+?:\s+),$/;

export const resolveProvider = (
  item: CompletionItem,
  token: CancellationToken,
  next: ResolveCompletionItemSignature,
) => {
  return Promise.resolve(next(item, token)).then((item: CompletionItem | null | undefined) => {
    if (!item) {
      return item;
    }
    const { label, insertText, insertTextFormat } = item;
    if (label === "import '';" && insertTextFormat !== InsertTextFormat.Snippet) {
      item.kind = CompletionItemKind.Snippet;
      if (item.textEdit) {
        item.textEdit.newText = "import '${1}';${0}";
      } else {
        item.insertText = "import '${1}';${0}";
      }
      item.insertTextFormat = InsertTextFormat.Snippet;
      return item;
    }
    if (label === 'setState(() {});' && insertTextFormat !== InsertTextFormat.Snippet) {
      item.kind = CompletionItemKind.Snippet;
      if (item.textEdit) {
        item.textEdit.newText = ['setState(() {', '\t${1}', '});${0}'].join('\n');
      } else {
        item.insertText = ['setState(() {', '\t${1}', '});${0}'].join('\n');
      }
      item.insertTextFormat = InsertTextFormat.Snippet;
      return item;
    }
    let m = label.match(propertyRegex);
    if (m && insertTextFormat !== InsertTextFormat.Snippet) {
      item.kind = CompletionItemKind.Snippet;
      if (item.textEdit) {
        item.textEdit.newText = `${m[1]}\${1},\${0}`;
      } else {
        item.insertText = `${m[1]}\${1},\${0}`;
      }
      item.insertTextFormat = InsertTextFormat.Snippet;
      return item;
    }
    m = label.match(funcCallRegex);
    if (m && insertTextFormat !== InsertTextFormat.Snippet) {
      item.kind = CompletionItemKind.Snippet;
      if (item.textEdit) {
        item.textEdit.newText = `${insertText}(\${1})\${0}`;
      } else {
        item.insertText = `${insertText}(\${1})\${0}`;
      }
      item.insertTextFormat = InsertTextFormat.Snippet;
      return item;
    }
    return item;
  });
};
