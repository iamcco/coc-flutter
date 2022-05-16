import {
  CancellationToken,
  CompletionContext,
  CompletionItem,
  CompletionList,
  Position,
  ProvideCompletionItemsSignature,
  TextDocument,
  workspace,
} from 'coc.nvim';
import { getResolveCompleteItemFunc } from './resolveCompleteItem';

export const completionProvider = async (
  document: TextDocument,
  position: Position,
  context: CompletionContext,
  token: CancellationToken,
  next: ProvideCompletionItemsSignature,
): Promise<CompletionItem[] | CompletionList | undefined | null> => {
  const res = await next(document, position, context, token);
  let list: CompletionItem[];
  // CompletionItem[] or CompletionList
  if ((res as CompletionList)?.isIncomplete !== undefined) {
    list = (res as CompletionList).items;
  } else {
    list = res as CompletionItem[] ?? [];
  }
  const config = workspace.getConfiguration('dart');
  const resolveCompleteItem = getResolveCompleteItemFunc({
    completeFunctionCalls: config.get<boolean>('completeFunctionCalls', true),
  });
  // resolve complete item
  list = list.map(resolveCompleteItem);
  return (res as CompletionList)?.isIncomplete !== undefined
    ? {
        items: list,
        isIncomplete: (res as CompletionList).isIncomplete,
      }
    : list;
};
