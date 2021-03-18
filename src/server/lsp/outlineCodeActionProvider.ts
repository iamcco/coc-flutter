import {
  languages,
  CodeAction,
  workspace,
  diagnosticManager,
  Diagnostic,
  CodeActionContext,
  Range,
  Position,
  Disposable,
} from 'coc.nvim';
import { Outline } from './outline';

export const registerOutlineCodeActionProvider = (outlines: Map<string, Outline>): Disposable => {
  return languages.registerCodeActionProvider(
    [
      {
        scheme: 'outline',
      },
    ],
    {
      provideCodeActions: async (document, range, _context, token): Promise<CodeAction[]> => {
        const outline = outlines.get(document.uri);
        if (!outline || !outline.curUri) {
          return [];
        }
        const doc = workspace.getDocument(outline.curUri);
        if (!doc || !doc.textDocument) {
          return [];
        }
        const outlineItems = outline.outlinePanelData[outline.curUri];
        if (!Array.isArray(outlineItems)) {
          return [];
        }
        const outlineItem = outlineItems[range.start.line];
        if (outlineItem === undefined) {
          return [];
        }

        // target wiglet range
        const targetRange = outlineItem.codeRange || outlineItem.range;

        const diagnostics = diagnosticManager.getDiagnosticsInRange(doc.textDocument, targetRange) as Diagnostic[];
        const newContext: CodeActionContext = { diagnostics };
        // FIXME
        // latest coc.nvim does not export getCodeActions
        return await (languages as any).getCodeActions(
          doc.textDocument,
          Range.create(
            Position.create(targetRange.start.line, targetRange.start.character),
            Position.create(targetRange.start.line, targetRange.start.character + 1),
          ),
          newContext,
          token,
        );
      },
    },
    'flutter.outline',
  );
};
