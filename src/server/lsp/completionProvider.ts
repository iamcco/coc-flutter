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
  if (character === '(') {
    return null;
  }
  const res = await next(document, position, context, token);
  let list: CompletionItem[];
  if ((res as CompletionList).isIncomplete !== undefined) {
    list = (res as CompletionList).items;
  } else {
    list = res as CompletionItem[];
  }
  // reduce items since https://github.com/dart-lang/sdk/issues/42152
  if (list.length > 1000 && /[a-zA-Z]/i.test(character)) {
    list = list.filter(item => new RegExp(character, 'i').test(item.label));
  }
  list = list.map(item => {
    if (!item.data) {
      item.data = {
        isCustom: true,
      };
    }
    item.data.custom = {} as any;
    if (item.textEdit) {
      item.data.custom.textEdit = item.textEdit;
      delete item.textEdit;
    }
    if (item.insertTextFormat === InsertTextFormat.Snippet && item.insertText && item.insertText.endsWith('${1:}')) {
      item.data.custom.insertTextFormat = item.insertTextFormat;
      item.data.custom.insertText = item.insertText;
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
