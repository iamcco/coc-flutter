import { CancellationToken, CompletionContext, CompletionItem, CompletionList, Position, ProvideCompletionItemsSignature, Range, TextDocument, workspace } from 'coc.nvim';
import { getResolveCompleteItemFunc } from './resolveCompleteItem';

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
  const config = workspace.getConfiguration('dart');
  const resolveCompleteItem = getResolveCompleteItemFunc({
    completeFunctionCalls: config.get<boolean>('completeFunctionCalls', true),
  });
  // resolve complete item
  list = list.map(resolveCompleteItem);
  return (res as CompletionList).isIncomplete !== undefined
    ? {
        items: list,
        isIncomplete: (res as CompletionList).isIncomplete,
      }
    : list;
};
