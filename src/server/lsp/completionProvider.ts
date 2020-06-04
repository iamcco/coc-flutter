import { CompletionContext, ProvideCompletionItemsSignature } from 'coc.nvim';
import {
  CompletionItem,
  CancellationToken,
  TextDocument,
  Position,
  Range,
  CompletionList,
  InsertTextFormat,
} from 'vscode-languageserver-protocol';

export const completionProvider = async (
  document: TextDocument,
  position: Position,
  context: CompletionContext,
  token: CancellationToken,
  next: ProvideCompletionItemsSignature,
): Promise<CompletionItem[] | CompletionList | undefined | null> => {
  const character = document.getText(Range.create(Position.create(position.line, position.character - 1), position));
  const res = await next(document, position, context, token);
  let list: CompletionItem[];
  // CompletionItem[] or CompletionList
  if ((res as CompletionList).isIncomplete !== undefined) {
    list = (res as CompletionList).items;
  } else {
    list = res as CompletionItem[];
  }
  // reduce items since it's too many
  // ref: https://github.com/dart-lang/sdk/issues/42152
  if (list.length > 1000 && /[a-zA-Z]/i.test(character)) {
    list = list.filter(item => new RegExp(character, 'i').test(item.label));
  }
  // the textEdit is not necessary from LSP
  // snippet and textEdit from LSP do the same thing
  // remove textEdit reduce the flicker
  list = list.map(item => {
    if (item.textEdit) {
      delete item.textEdit;
    }
    // remove unnecessary snippet
    // snippet xxxx${1:} === xxxx PlainText
    if (item.insertTextFormat === InsertTextFormat.Snippet && item.insertText && item.insertText.endsWith('${1:}')) {
      item.insertTextFormat = InsertTextFormat.PlainText;
      item.insertText = item.insertText.slice(0, -5);
    }
    return item;
  });
  return (res as CompletionList).isIncomplete !== undefined
    ? {
        items: list,
        isIncomplete: (res as CompletionList).isIncomplete,
      }
    : list;
};
