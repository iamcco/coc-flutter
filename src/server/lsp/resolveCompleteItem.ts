import { CompletionItem, InsertTextFormat } from 'coc.nvim';

// functionName(…)
const funcCallWithArgsRegex = /^(.*)\(…\)$/;
// functionName()
const funcCallRegex = /^(.*)\(\)$/;
// keyName: ,
const propertyRegex = /^([^ ]+?:\s+),$/;

export const getResolveCompleteItemFunc = (options: { completeFunctionCalls: boolean }) => (item: CompletionItem) => {
  const { label, insertTextFormat } = item;

  // delete unnecessary filterText
  // ref: https://github.com/iamcco/coc-flutter/issues/70
  if (item.insertTextFormat === InsertTextFormat.Snippet && item.filterText) {
    delete item.filterText;
  }

  // delete unnecessary textEdit
  if (item.textEdit) {
    delete item.textEdit;
  }

  // remove unnecessary snippet
  // snippet xxxx${1:} === xxxx PlainText
  if (item.insertTextFormat === InsertTextFormat.Snippet && item.insertText && item.insertText.endsWith('${1:}')) {
    item.insertTextFormat = InsertTextFormat.PlainText;
    item.insertText = item.insertText.slice(0, -5);
  }

  // improve import
  if (label === "import '';" && insertTextFormat !== InsertTextFormat.Snippet) {
    item.insertText = "import '${1}';${0}";
    item.insertTextFormat = InsertTextFormat.Snippet;
    return item;
  }

  // improve setState
  if (label === 'setState(() {});' && insertTextFormat !== InsertTextFormat.Snippet) {
    item.insertText = ['setState(() {', '\t${1}', '});${0}'].join('\n');
    item.insertTextFormat = InsertTextFormat.Snippet;
    return item;
  }

  // improve `key: ,`
  let m = label.match(propertyRegex);
  if (m) {
    item.insertText = `${m[1]}\${1},\${0}`;
    item.insertTextFormat = InsertTextFormat.Snippet;
    return item;
  }

  // if dart.completeFunctionCalls: false
  // do not add `()` snippet
  if (options.completeFunctionCalls && item.insertTextFormat !== InsertTextFormat.Snippet) {
    // improve function()
    m = label.match(funcCallRegex);
    if (m) {
      item.insertText = `${m[1]}()\${0}`;
      item.insertTextFormat = InsertTextFormat.Snippet;
      return item;
    }
    // improve function(…?)
    m = label.match(funcCallWithArgsRegex);
    if (m) {
      item.insertText = `${m[1]}(\${1})\${0}`;
      item.insertTextFormat = InsertTextFormat.Snippet;
      return item;
    }
  }

  return item;
};
