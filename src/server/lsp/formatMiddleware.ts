import { ProvideDocumentFormattingEditsSignature, workspace } from 'coc.nvim';
import { FormattingOptions, CancellationToken, TextEdit } from 'vscode-languageserver-protocol';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { diffLines } from 'diff';

export const provideDocumentFormattingEdits = async (
  document: TextDocument,
  options: FormattingOptions,
  token: CancellationToken,
  next: ProvideDocumentFormattingEditsSignature,
): Promise<TextEdit[] | null | undefined> => {
  const edits = await next(document, options, token);
  if (!token.isCancellationRequested && edits && edits.length === 1) {
    const lineCount = document.lineCount;
    const textEdit = edits[0];
    const { range } = textEdit;
    // range === whole document range
    // replace the  whole document with new text
    if (
      range.start.line === 0 &&
      range.start.character === 0 &&
      range.end.line === lineCount - 1 &&
      range.end.character === 0
    ) {
      const oldText = document.getText();
      const newText = textEdit.newText;
      const start = Date.now();
      const changes: Array<{
        count: number;
        added: boolean;
        removed: boolean;
        value: string;
      }> = diffLines(oldText, newText, {
        ignoreWhitespace: false,
        newlineIsToken: false,
      });
      workspace.showMessage(`dur ${Date.now() - start}`);
      const newEdits: Array<TextEdit> = [];
      let lineNum = 0;
      if (changes && changes.length > 0) {
        for (let i = 0, len = changes.length; i < len; i += 1) {
          const change = changes[i];
          if (change.added) {
            newEdits.push({
              newText: change.value,
              range: {
                start: {
                  line: lineNum,
                  character: 0,
                },
                end: {
                  line: lineNum + 1,
                  character: 0,
                },
              },
            });
          }
          if (change.removed) {
            const nextChange = changes[i + 1];
            if (nextChange && nextChange.added) {
              newEdits.push({
                newText: nextChange.value,
                range: {
                  start: {
                    line: lineNum,
                    character: 0,
                  },
                  end: {
                    line: lineNum + change.count,
                    character: 0,
                  },
                },
              });
              i += 1;
            } else {
              newEdits.push({
                newText: '',
                range: {
                  start: {
                    line: lineNum,
                    character: 0,
                  },
                  end: {
                    line: lineNum + change.count,
                    character: 0,
                  },
                },
              });
            }
          }
          if ((!change.added && !change.removed) || change.removed) {
            lineNum += change.count;
          }
        }
      }
      if (newEdits.length) {
        return newEdits;
      }
    }
  }
  return edits;
};
