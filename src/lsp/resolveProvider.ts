import {ResolveCompletionItemSignature} from 'coc.nvim';
import {InsertTextFormat, CompletionItemKind, CompletionItem, CancellationToken} from 'vscode-languageserver-protocol'

/**
 * extend CompletionItem's label functionName(…) to functionName(${1})${0}
 */
const funcCallRegex = /\(…\)$/
/**
 * extend `import '';` to `import '${1}';${0}`
 */
const importRegex = /^import\s+('');$/

export const resolveProvider = (
  item: CompletionItem,
  token: CancellationToken,
  next: ResolveCompletionItemSignature
) => {
  return Promise.resolve(next(item, token)).then((item: CompletionItem | null | undefined) => {
    if (!item) {
      return item
    }
    const { label, insertText, insertTextFormat } = item
    let m = label.match(funcCallRegex)
    if (m && insertTextFormat !== InsertTextFormat.Snippet) {
      item.kind = CompletionItemKind.Snippet
      item.textEdit = undefined
      item.insertText = `${insertText}(\${1})\${0}`
      item.insertTextFormat = InsertTextFormat.Snippet
      return item
    }
    m = label.match(importRegex)
    if (m && insertTextFormat !== InsertTextFormat.Snippet) {
      item.kind = CompletionItemKind.Snippet
      item.textEdit = undefined
      item.insertText = "import '${1}';${0}"
      item.insertTextFormat = InsertTextFormat.Snippet
    }
    return item
  })
}
