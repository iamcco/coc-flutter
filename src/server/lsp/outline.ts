import { commands, LanguageClient, workspace } from 'coc.nvim';
import { statusBar } from '../../lib/status';
import { cmdPrefix } from '../../util/constant';
import { Range } from 'vscode-languageserver-protocol';

import { Dispose } from '../../util/dispose';
import { logger } from '../../util/logger';

const log = logger.getlog('outline');

const verticalLine = '│';
// const horizontalLine = '─';
const bottomCorner = '└';
const middleCorner = '├';
const icons = {
  TOP_LEVEL_VARIABLE: '\uf435 ',
  CLASS: '\uf0e8 ',
  FIELD: '\uf93d',
  CONSTRUCTOR: '\ue624 ',
  CONSTRUCTOR_INVOCATION: '\ufc2a ',
  FUNCTION: '\u0192 ',
  METHOD: '\uf6a6 ',
  GETTER: '\uf9fd',
  ENUM: '\uf779 ',
  ENUM_CONSTANT: '\uf02b ',
};
const icon_default = '\ue612 ';
const outlineBufferName = 'Flutter Outline';

function ucs2ToBinaryString(str: string) {
  const escstr = encodeURIComponent(str);
  const binstr = escstr.replace(/%([0-9A-F]{2})/gi, function (_, hex) {
    const i = parseInt(hex, 16);
    return String.fromCharCode(i);
  });
  return binstr;
}

interface ClientParams_Outline {
  uri: string;
  outline: OutlineParams;
}

interface OutlineParams {
  element: ElementParams;
  range: Range;
  codeRange: Range;
  children: OutlineParams[];
  folded: boolean;
  lineNumber: number | undefined;
  startCol: number | undefined;
  endCol: number | undefined;
}

interface ElementParams {
  name: string;
  range: Range;
  kind: string;
  parameters: string | undefined;
  typeParameters: string | undefined;
  returnType: string | undefined;
}

export class Outline extends Dispose {
  public outlines: Record<string, OutlineParams> = {};
  public outlineStrings: Record<string, string[]> = {};
  // the corresponding outline item for each line number in the outline panel
  public outlinePanelData: Record<string, OutlineParams[]> = {};
  public outlineVersions: Record<string, number> = {};
  public outlineVersions_Rendered: Record<string, number> = {};
  public renderedOutlineUri = '';
  public outlineBuffer: any;
  public curOutlineItem: OutlineParams | undefined;
  public highlightIds: number[] = [];
  public showPath: boolean | undefined;
  public outlineWidth = 30;
  public curUri = '';
  public iconSpacing = '';

  constructor(client: LanguageClient) {
    super();
    this.init(client);
    const config = workspace.getConfiguration('flutter');
    this.showPath = config.get<boolean>('UIPath', true);
    this.outlineWidth = config.get<number>('outlineWidth', 30);
    this.iconSpacing = ' '.repeat(config.get<number>('outlineIconPadding', 0));
  }

  generateOutlineStrings = (uri: string) => {
    const root = this.outlines[uri];
    const lines: string[] = [];
    const outlineItems: OutlineParams[] = [];
    const iconSpacing = this.iconSpacing;
    function genOutline(outline: OutlineParams, indentStr: string) {
      let indent = indentStr;
      // let foldIndicator = '  ';
      let icon = icons[outline.element.kind];
      if (icon === undefined) icon = icon_default;
      // icon += ' ';
      // if (Array.isArray(outline.children) && outline.children.length > 0 && outline.folded === true)
      // foldIndicator = '▸ ';
      const newLine = `${indent} ${icon}${iconSpacing}${outline.element.name}: ${outline.codeRange.start.line + 1}`;
      outline.lineNumber = lines.length;
      outline.startCol = ucs2ToBinaryString(indent).length;
      outline.endCol = ucs2ToBinaryString(newLine).length;
      lines.push(newLine);
      outlineItems.push(outline);
      const len = indent.length;
      if (len > 0) {
        if (indent[len - 1] == middleCorner) {
          indent = indent.substr(0, len - 1) + verticalLine;
        } else if (indent[len - 1] == bottomCorner) {
          indent = indent.substr(0, len - 1) + ' ';
        }
      }
      if (Array.isArray(outline.children))
        if (outline.children.length == 1) {
          genOutline(outline.children[0], `${indent} `);
        } else if (outline.children.length > 1) {
          for (let i = 0; i < outline.children.length; ++i) {
            if (i == outline.children.length - 1) {
              // indent = indent.substr(0, len - 2) + '  ';
              genOutline(outline.children[i], `${indent}${bottomCorner}`);
            } else {
              genOutline(outline.children[i], `${indent}${middleCorner}`);
            }
          }
        }
    }
    if (Array.isArray(root.children) && root.children.length > 0)
      for (const child of root.children) genOutline(child, '');
    this.outlineStrings[uri] = lines;
    this.outlinePanelData[uri] = outlineItems;
    if (this.outlineVersions[uri] === undefined) {
      this.outlineVersions[uri] = 0;
    } else {
      this.outlineVersions[uri] += 1;
    }
  };

  highlightCurrentOutlineItem = async () => {
    if (
      this.curOutlineItem !== undefined &&
      this.outlineBuffer !== undefined &&
      this.curOutlineItem.lineNumber !== undefined &&
      this.curOutlineItem.startCol !== undefined &&
      this.curOutlineItem.endCol !== undefined
    ) {
      const windows = await workspace.nvim.windows;
      for (const win of windows) {
        try {
          const buf = await win.buffer;
          if (buf.id === this.outlineBuffer.id) {
            buf.clearHighlight();
            win.setCursor([this.curOutlineItem.lineNumber + 1, 0]).catch((e) => {
              log(e);
            });
            buf
              .addHighlight({
                hlGroup: 'HighlightedOutlineArea',
                line: this.curOutlineItem.lineNumber,
                colStart: this.curOutlineItem.startCol,
                colEnd: this.curOutlineItem.endCol,
              })
              .catch((e) => {
                log(e);
              });
          }
        } catch (e) {
          log(e);
        }
      }
    }
  };

  updateOutlineBuffer = async (uri: string, force = false) => {
    if (
      ((this.outlineVersions[uri] === this.outlineVersions_Rendered[uri] && this.outlineVersions[uri] === undefined) ||
        this.outlineVersions[uri] !== this.outlineVersions_Rendered[uri] ||
        uri !== this.renderedOutlineUri ||
        force) &&
      this.outlineBuffer
    ) {
      this.renderedOutlineUri = uri;
      let content: string[] = [];
      if (this.outlineStrings[uri]) {
        this.outlineVersions_Rendered[uri] = this.outlineVersions[uri];
        content = this.outlineStrings[uri];
      }
      await this.outlineBuffer.length
        .then(async (len: number) => {
          if (Number.isInteger(len)) {
            await this.outlineBuffer.setOption('modifiable', true);
            if (len > content.length) {
              await this.outlineBuffer.setLines([], {
                start: 0,
                end: len - 1,
                strictIndexing: false,
              });
              await this.outlineBuffer.setLines(content, {
                start: 0,
                end: 0,
                strictIndexing: false,
              });
            } else {
              await this.outlineBuffer.setLines(content, {
                start: 0,
                end: len - 1,
                strictIndexing: false,
              });
            }
            await this.outlineBuffer.setOption('modifiable', false);
          }
        })
        .catch((e) => {
          log(e);
        });
      await this.outlineBuffer.length
        .then(async (len: number) => {
          await this.outlineBuffer.setOption('modifiable', true);
          if (len > content.length) {
            await this.outlineBuffer.setLines([], {
              start: 0,
              end: len - 1,
              strictIndexing: false,
            });
            await this.outlineBuffer.setLines(content, {
              start: 0,
              end: 0,
              strictIndexing: false,
            });
          }
          await this.outlineBuffer.setOption('modifiable', false);
        })
        .catch((e) => {
          log(e);
        });
    }
    await this.highlightCurrentOutlineItem();
  };

  getUIPathFromCursor(outline: OutlineParams, cursor: number[]) {
    let elementPath = '';
    let foundChild = true;
    while (foundChild) {
      foundChild = false;
      if (Array.isArray(outline.children) && outline.children.length > 0) {
        for (const child of outline.children) {
          const curLine = cursor[0] - 1,
            curCol = cursor[1] - 1;
          const startLine = child.codeRange.start.line,
            startCol = child.codeRange.start.character;
          const endLine = child.codeRange.end.line,
            endCol = child.codeRange.end.character;
          if (
            (curLine > startLine || (curLine == startLine && curCol >= startCol)) &&
            (curLine < endLine || (curLine == endLine && curCol < endCol))
          ) {
            outline = child;
            foundChild = true;
            break;
          }
        }
      }
      if (foundChild) {
        elementPath += ` > ${outline.element.name}`;
      } else {
        break;
      }
    }
    this.curOutlineItem = outline;
    if (this.showPath) statusBar.show(elementPath, false);
  }

  async getCurrentUri() {
    const path = await workspace.nvim.commandOutput('echo expand("%:p")');
    return `file://${path}`;
  }

  async init(client: LanguageClient) {
    const { nvim } = workspace;

    (nvim as any).on('notification', async (...args) => {
      if (args[0] === 'CocAutocmd') {
        if (args[1][0] === 'CursorMoved') {
          const bufId = args[1][1];
          const cursor = args[1][2];
          if (this.outlineBuffer && bufId === this.outlineBuffer.id) {
          } else {
            this.curUri = await this.getCurrentUri();
            const outline = this.outlines[this.curUri];
            if (outline) {
              this.getUIPathFromCursor(outline, cursor);
              this.updateOutlineBuffer(this.curUri);
            }
          }
        } else if (args[1][0] === 'BufEnter' && Number.isInteger(args[1][1])) {
          if (this.outlineBuffer && args[1][1] === this.outlineBuffer.id) {
            const wins = await nvim.windows;
            if (Array.isArray(wins)) {
              if (wins.length === 1) {
                nvim.command('q');
              } else {
                const curWin = await nvim.window;
                const curTab = await curWin.tabpage;
                let winTabCount = 0;
                for (const win of wins) {
                  const tab = await win.tabpage;
                  if ((await tab.number) === (await curTab.number)) winTabCount += 1;
                }
                if (winTabCount === 1) curWin.close(true);
              }
            }
          }
        }
      }
    });
    client.onNotification('dart/textDocument/publishOutline', this.onOutline);
    const openOutlinePanel = async () => {
      const curWin = await nvim.window;
      await nvim.command('set splitright');
      await nvim.command(`${this.outlineWidth}vsplit ${outlineBufferName}`);
      const win = await nvim.window;
      await nvim.command('setlocal filetype=flutterOutline');
      await nvim.command('set buftype=nofile');
      await nvim.command('setlocal noswapfile');
      await nvim.command('setlocal nomodifiable');
      await nvim.command('setlocal winfixwidth');
      await nvim.command('setlocal nocursorline');
      await nvim.command('setlocal nobuflisted');
      await nvim.command('setlocal bufhidden=wipe');
      await nvim.command('setlocal nonumber');
      await nvim.command('setlocal norelativenumber');
      await nvim.command('setlocal nowrap');
      await nvim.command(
        `syntax match OutlineLine /^\\(${verticalLine}\\| \\)*\\(${middleCorner}\\|${bottomCorner}\\)\\?/`,
      );
      await nvim.command('highlight default link HighlightedOutlineArea IncSearch');
      await nvim.command(`highlight default link OutlineLine Comment`);
      await nvim.command(`syntax match FlutterOutlineFunction /${icons.FUNCTION}/`);
      await nvim.command(`highlight default link FlutterOutlineFunction Function`);
      await nvim.command(`syntax match FlutterOutlineType /${icons.FIELD}/`);
      await nvim.command(`highlight default link FlutterOutlineType Identifier`);
      await nvim.command(`syntax match FlutterOutlineClass /${icons.CLASS}/`);
      await nvim.command(`highlight default link FlutterOutlineClass Type`);
      await nvim.command(`syntax match FlutterOutlineMethod /${icons.METHOD}/`);
      await nvim.command(`highlight default link FlutterOutlineMethod Function`);
      await nvim.command(`syntax match FlutterOutlineTopLevelVar /${icons.TOP_LEVEL_VARIABLE}/`);
      await nvim.command(`highlight default link FlutterOutlineTopLevelVar Identifier`);
      await nvim.command(`syntax match FlutterOutlineConstructor /${icons.CONSTRUCTOR}/`);
      await nvim.command(`highlight default link FlutterOutlineConstructor Identifier`);
      await nvim.command(`syntax match FlutterOutlineGetter /${icons.GETTER}/`);
      await nvim.command(`highlight default link FlutterOutlineGetter Function`);
      await nvim.command(`syntax match FlutterOutlineConstructorInvocation /${icons.CONSTRUCTOR_INVOCATION}/`);
      await nvim.command(`highlight default link FlutterOutlineConstructorInvocation Special`);
      await nvim.command(`syntax match FlutterOutlineEnum /${icons.ENUM}/`);
      await nvim.command(`highlight default link FlutterOutlineEnum Type`);
      await nvim.command(`syntax match FlutterOutlineEnumMember /${icons.ENUM_CONSTANT}/`);
      await nvim.command(`highlight default link FlutterOutlineEnumMember Identifier`);
      await nvim.command(`syntax match FlutterOutlineLineNumber /: \\d\\+$/`);
      await nvim.command(`highlight default link FlutterOutlineLineNumber Number`);
      this.outlineBuffer = await win.buffer;
      const goto = async () => {
        const curWin = await nvim.window;
        const cursor = await curWin.cursor;
        const outlineItems = this.outlinePanelData[this.curUri];
        if (!Array.isArray(outlineItems)) return;
        const outline = outlineItems[cursor[0] - 1];
        if (outline === undefined) return;
        const wins = await nvim.windows;
        if (Array.isArray(wins)) {
          const curWin = await nvim.window;
          const curTab = await curWin.tabpage;
          for (const win of wins) {
            const tab = await win.tabpage;
            if (
              (await tab.number) === (await curTab.number) &&
              `file://${await (await win.buffer).name}` === this.curUri
            ) {
              win.setCursor([outline.codeRange.start.line + 1, outline.codeRange.start.character]).catch((e) => {
                log(e);
              });
              await nvim.call('win_gotoid', [win.id]);
              break;
            }
          }
        }
      };
      workspace.registerLocalKeymap('n', '<CR>', goto);
      workspace.registerLocalKeymap('n', '<LeftRelease>', goto);
      await nvim.call('win_gotoid', [curWin.id]);
      const uri = await this.getCurrentUri();
      this.updateOutlineBuffer(uri, true);
      // const buf = await win.buffer;
    };
    commands.registerCommand(`${cmdPrefix}.outline`, async () => {
      await openOutlinePanel();
    });
    commands.registerCommand(`${cmdPrefix}.toggleOutline`, async () => {
      if (this.outlineBuffer === undefined) {
        await openOutlinePanel();
        return;
      }
      const curWin = await nvim.window;
      const curTab = await curWin.tabpage;
      const wins = await nvim.windows;
      let shouldOpenOutlinePanel = true;
      for (const win of wins) {
        const tab = await win.tabpage;
        if ((await tab.number) === (await curTab.number)) {
          if ((await win.buffer).id === this.outlineBuffer.id) {
            shouldOpenOutlinePanel = false;
            win.close(true).catch((e) => {
              log(e);
            });
          }
        }
      }
      if (shouldOpenOutlinePanel) await openOutlinePanel();
    });
  }

  onOutline = async (params: ClientParams_Outline) => {
    log('onOutline');
    log(params.toString());
    const { uri, outline } = params;
    const doc = workspace.getDocument(uri);
    // ensure the document is exists
    if (!doc) {
      return;
    }

    this.outlines[uri] = outline;
    this.generateOutlineStrings(uri);
    this.updateOutlineBuffer(uri);
  };
}
