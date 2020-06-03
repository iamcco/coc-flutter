import { ResolveCompletionItemSignature } from 'coc.nvim';
import { InsertTextFormat, CompletionItem, CancellationToken } from 'vscode-languageserver-protocol';

/**
 * extend CompletionItem's label functionName(…) to functionName(${1})${0}
 */
const funcCallRegex = /\(…?\)$/;
const propertyRegex = /^([^ ]+?:\s+),$/;

export const resolveProvider = (
  oldItem: CompletionItem,
  token: CancellationToken,
  next: ResolveCompletionItemSignature,
) => {
  // user new Object
  const nextItem = {
    ...oldItem,
  };
  if (nextItem.data && nextItem.data.custom) {
    const custom = nextItem.data.custom;
    if (!nextItem.textEdit && custom.textEdit) {
      nextItem.textEdit = custom.textEdit;
    }
    if (custom.insertText && custom.insertTextFormat) {
      nextItem.insertText = custom.insertText;
      nextItem.insertTextFormat = custom.insertTextFormat;
    }
    if (nextItem.data.isCustom) {
      delete nextItem.data;
    } else {
      delete nextItem.data.custom;
    }
  }
  return Promise.resolve(next(nextItem, token)).then((item: CompletionItem | null | undefined) => {
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

    // improve property${1:}
    // snippet is not necessary here
    if (insertText && insertText.endsWith('${1:}')) {
      if (item.textEdit) {
        delete item.textEdit;
      }
      item.insertTextFormat = InsertTextFormat.PlainText;
      item.insertText = insertText.slice(0, -5);
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
      item.insertText = `${item.insertText}(\${1})\${0}`;
      item.insertTextFormat = InsertTextFormat.Snippet;
      return item;
    }
    return item;
  });
};
