import { CompletionContext, ProvideCompletionItemsSignature } from 'coc.nvim';
import {
  CompletionItem,
  CancellationToken,
  TextDocument,
  Position,
  Range,
  CompletionList,
} from 'vscode-languageserver-protocol';

export const completionProvider = (
  document: TextDocument,
  position: Position,
  context: CompletionContext,
  token: CancellationToken,
  next: ProvideCompletionItemsSignature,
): null | Promise<CompletionItem[] | CompletionList | undefined | null> => {
  const character = document.getText(Range.create(Position.create(position.line, position.character - 1), position));
  if (character === '(') {
    return null;
  }
  return Promise.resolve(next(document, position, context, token));
};
