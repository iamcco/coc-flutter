import { ProvideCodeActionsSignature, CodeAction } from 'coc.nvim';
import {
  TextDocument,
  CodeActionContext,
  CancellationToken,
  Range,
  TextDocumentEdit,
} from 'vscode-languageserver-protocol';

// add delete widget action

export const codeActionProvider = async (
  document: TextDocument,
  range: Range,
  context: CodeActionContext,
  token: CancellationToken,
  next: ProvideCodeActionsSignature,
) => {
  const res = await next(document, range, context, token);
  if (!res) {
    return res;
  }
  const codeActions = res.slice();
  res.some(item => {
    if (item.title === 'Wrap with widget...' && (item as CodeAction).edit) {
      const edit = (item as CodeAction).edit;
      if (!edit || !edit.documentChanges) {
        return true;
      }
      const documentChanges = edit.documentChanges as TextDocumentEdit[];
      if (!documentChanges || documentChanges.length === 0) {
        return true;
      }
      const codeAction = {
        ...item,
        title: 'Delete this widget',
        edit: {
          ...edit,
          documentChanges: [
            {
              ...documentChanges[0],
              edits: [
                {
                  ...(documentChanges[0].edits[0] || {}),
                  newText: '',
                },
              ],
            },
          ],
        },
      };
      codeActions.push(codeAction);
      return true;
    }
    return false;
  });
  return codeActions;
};
