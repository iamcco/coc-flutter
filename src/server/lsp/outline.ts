import { commands, LanguageClient, workspace, Buffer as VimBuffer, Range, Disposable, window } from 'coc.nvim';
import { statusBar } from '../../lib/status';
import { cmdPrefix } from '../../util/constant';

import { Dispose } from '../../util/dispose';
import { logger } from '../../util/logger';
import { registerOutlineCodeActionProvider } from './outlineCodeActionProvider';

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
const iconDefault = '\ue612 ';
const iconsNonNerdFont = {
  TOP_LEVEL_VARIABLE: 'V ',
  CLASS: 'C ',
  FIELD: 'P ',
  CONSTRUCTOR: 'C ',
  CONSTRUCTOR_INVOCATION: 'I ',
  FUNCTION: 'F ',
  METHOD: 'M ',
  GETTER: 'G ',
  ENUM: 'E ',
  ENUM_CONSTANT: 'E ',
};
const iconDefaultNonNerdFont = '* ';

// outline buffer name
const outlineBufferName = 'outline://outline';
// TODO
const flutterOutlineBufferName = 'outline://outline/flutter';

// outline request
const outlineRequest = 'dart/textDocument/publishOutline';
// TODO
const flutterOutlineRequest = 'dart/textDocument/publishFlutterOutline';

// highlight group
const fhlOutlineArea = 'FlutterHighlightedOutlineArea';
const fhlOutlineLine = 'FlutterOutlineLine';
const fhlOutlineFunction = 'FlutterOutlineFunction';
const fhlOutlineType = 'FlutterOutlineType';
const fhlOutlineClass = 'FlutterOutlineClass';
const fhlOutlineMethod = 'FlutterOutlineMethod';
const fhlOutlineTopLevelVar = 'FlutterOutlineTopLevelVar';
const fhlOutlineConstructor = 'FlutterOutlineConstructor';
const fhlOutlineGetter = 'FlutterOutlineGetter';
const fhlOutlineConstructorInvocation = 'FlutterOutlineConstructorInvocation';
const fhlOutlineEnum = 'FlutterOutlineEnum';
const fhlOutlineEnumMember = 'FlutterOutlineEnumMember';
const fhlOutlineLineNumber = 'FlutterOutlineLineNumber';

function ucs2ToBinaryString(str: string) {
  const escStr = encodeURIComponent(str);
  const binStr = escStr.replace(/%([0-9A-F]{2})/gi, function (_, hex) {
    const i = parseInt(hex, 16);
    return String.fromCharCode(i);
  });
  return binStr;
}

interface ClientParamsOutline {
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
  public outlineBuffer?: VimBuffer;
  public curOutlineItem: OutlineParams | undefined;
  public highlightIds: number[] = [];
  public outlineWidth = 30;
  // the latest visited dart document uri
  public curUri = '';
  public iconSpacing = '';
  public useNerdFont = true;

  constructor(client: LanguageClient) {
    super();
    const config = workspace.getConfiguration('flutter');
    const initialization = config.get('lsp.initialization', {
      outline: true,
      flutterOutline: true,
    });
    // outline does not enable
    if (!initialization.outline && !initialization.flutterOutline) {
      return;
    }
    this.outlineWidth = config.get<number>('outlineWidth', 30);
    this.useNerdFont = config.get<boolean>('useNerdFont', true);
    this.iconSpacing = ' '.repeat(config.get<number>('outlineIconPadding', 0));
    this.push(
      Disposable.create(() => {
        this.hideOutlinePanel();
      }),
      registerOutlineCodeActionProvider(this),
    );
    if (initialization.outline) {
      this.registerOutlineNotification(client);
    }
    if (initialization.flutterOutline) {
      // TODO
      // this.registerFlutterOutlineNotification(client);
    }
    this.initAutocmdAndCmd();
  }

  private async initAutocmdAndCmd() {
    this.push(
      workspace.registerAutocmd({
        event: 'CursorMoved',
        pattern: '*.dart',
        callback: async () => {
          await this.getUIPathFromCursor();
          await this.highlightCurrentOutlineItem();
        },
      }),
      workspace.registerAutocmd({
        event: 'BufEnter',
        pattern: '*.dart',
        callback: async () => {
          const doc = await workspace.document;
          if (!doc || !doc.textDocument) {
            return;
          }
          this.curUri = doc.uri;
          this.updateOutline();
        },
      }),
      workspace.registerAutocmd({
        event: 'BufEnter',
        pattern: `{${outlineBufferName},${flutterOutlineBufferName}}`,
        callback: this.closeOnlyOutline,
      }),
      commands.registerCommand(`${cmdPrefix}.outline`, this.openOutlinePanel),
      commands.registerCommand(`${cmdPrefix}.toggleOutline`, this.toggleOutlinePanel),
      // TODO
      // commands.registerCommand(`${cmdPrefix}.flutterOutline`, this.openOutlinePanel),
      // commands.registerCommand(`${cmdPrefix}.toggleFlutterOutline`, this.toggleOutlinePanel),
    );
  }

  // generate outline tree view strings
  // and flat outline data
  private generateOutlineStrings = (root: OutlineParams): [string[], OutlineParams[]] => {
    const lines: string[] = [];
    const outlineItems: OutlineParams[] = [];
    const iconSpacing = this.iconSpacing;
    const useNerdFont = this.useNerdFont;
    function genOutline(outline: OutlineParams, indentStr: string) {
      let indent = indentStr;
      // let foldIndicator = '  ';
      let icon = useNerdFont ? icons[outline.element.kind] : iconsNonNerdFont[outline.element.kind];
      if (icon === undefined) icon = useNerdFont ? iconDefault : iconDefaultNonNerdFont;
      // icon += ' ';
      // if (Array.isArray(outline.children) && outline.children.length > 0 && outline.folded === true)
      // foldIndicator = '▸ ';
      let newLine = `${indent} ${icon}${iconSpacing}${outline.element.name}`;
      if (outline.element.returnType) {
        newLine += `: ${outline.element.returnType}`;
      }
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
    return [lines, outlineItems];
  };

  // highlight widget at current position
  private highlightCurrentOutlineItem = async () => {
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
          if (!buf) {
            continue;
          }
          if (this.outlineBuffer && buf.id === this.outlineBuffer.id) {
            buf.clearHighlight();
            win.setCursor([this.curOutlineItem.lineNumber + 1, 0]).catch((e) => {
              log(e);
            });
            buf
              .addHighlight({
                hlGroup: fhlOutlineArea,
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

  private updateOutlineBuffer = async (uri: string) => {
    if (!this.outlineBuffer) return;
    let content: string[] = [];
    if (this.outlineStrings[uri]) {
      content = this.outlineStrings[uri];
    } else {
      content = ['No outline data yet'];
    }
    try {
      await this.outlineBuffer.setLines(content, {
        start: 0,
        end: -1,
        strictIndexing: false,
      });
    } catch (error) {
      log(`Update outline buffer error: ${error}`);
    }
  };

  async getUIPathFromCursor() {
    let outline = this.outlines[this.curUri];
    if (!outline) {
      return;
    }
    const cursor = await window.getCursorPosition();
    let elementPath = '';
    let foundChild = true;
    while (foundChild) {
      foundChild = false;
      if (Array.isArray(outline.children) && outline.children.length > 0) {
        for (const child of outline.children) {
          const curLine = cursor.line,
            curCol = cursor.character;
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
    statusBar.updateUIPath(elementPath);
  }

  private updateOutline = async () => {
    if (!this.outlineBuffer || !this.outlines[this.curUri]) {
      return;
    }
    const uri = this.curUri;
    // generate outline tree view string
    const [lines, outlineItems] = this.generateOutlineStrings(this.outlines[uri]);
    // new generate if same as before
    const oldLines = this.outlineStrings[uri];
    if (oldLines && oldLines.join() !== lines.join()) {
      this.outlineStrings[uri] = lines;
      this.outlinePanelData[uri] = outlineItems;
      // update outline buffer
      await this.updateOutlineBuffer(this.curUri);
    }
    // update ui path
    await this.getUIPathFromCursor();
    // highlight cursor
    await this.highlightCurrentOutlineItem();
  };

  private registerOutlineNotification(client: LanguageClient) {
    client.onNotification(outlineRequest, this.onOutline);
  }

  private registerFlutterOutlineNotification(client: LanguageClient) {
    client.onNotification(flutterOutlineRequest, this.onFlutterOutline);
  }

  private openOutlinePanel = async () => {
    const { nvim } = workspace;
    const curDartWin = await nvim.window;
    // open outline in the right
    await nvim.command(`rightbelow ${this.outlineWidth}vsplit ${outlineBufferName}`);
    const outlineWin = await nvim.window;
    const outlineBuf = await outlineWin.buffer;
    this.outlineBuffer = outlineBuf;
    nvim.pauseNotification();
    // buf init
    outlineBuf.setOption('filetype', 'flutterOutline');
    outlineBuf.setOption('buftype', 'nofile');
    outlineBuf.setOption('bufhidden', 'wipe');
    outlineBuf.setOption('buflisted', false);
    outlineBuf.setOption('swapfile', false);
    // win init
    outlineWin.setOption('winfixwidth', true);
    outlineWin.setOption('cursorline', false);
    outlineWin.setOption('number', false);
    outlineWin.setOption('relativenumber', false);
    outlineWin.setOption('wrap', false);
    // highlight
    nvim.command(
      `syntax match ${fhlOutlineLine} /^\\(${verticalLine}\\| \\)*\\(${middleCorner}\\|${bottomCorner}\\)\\?/`,
    );
    nvim.command(`highlight default link ${fhlOutlineArea} IncSearch`);
    nvim.command(`highlight default link ${fhlOutlineLine} Comment`);
    nvim.command(`syntax match ${fhlOutlineFunction} /${icons.FUNCTION}/`);
    nvim.command(`highlight default link ${fhlOutlineFunction} Function`);
    nvim.command(`syntax match ${fhlOutlineType} /${icons.FIELD}/`);
    nvim.command(`highlight default link ${fhlOutlineType} Identifier`);
    nvim.command(`syntax match ${fhlOutlineClass} /${icons.CLASS}/`);
    nvim.command(`highlight default link ${fhlOutlineClass} Type`);
    nvim.command(`syntax match ${fhlOutlineMethod} /${icons.METHOD}/`);
    nvim.command(`highlight default link ${fhlOutlineMethod} Function`);
    nvim.command(`syntax match ${fhlOutlineTopLevelVar} /${icons.TOP_LEVEL_VARIABLE}/`);
    nvim.command(`highlight default link ${fhlOutlineTopLevelVar} Identifier`);
    nvim.command(`syntax match ${fhlOutlineConstructor} /${icons.CONSTRUCTOR}/`);
    nvim.command(`highlight default link ${fhlOutlineConstructor} Identifier`);
    nvim.command(`syntax match ${fhlOutlineGetter} /${icons.GETTER}/`);
    nvim.command(`highlight default link ${fhlOutlineGetter} Function`);
    nvim.command(`syntax match ${fhlOutlineConstructorInvocation} /${icons.CONSTRUCTOR_INVOCATION}/`);
    nvim.command(`highlight default link ${fhlOutlineConstructorInvocation} Special`);
    nvim.command(`syntax match ${fhlOutlineEnum} /${icons.ENUM}/`);
    nvim.command(`highlight default link ${fhlOutlineEnum} Type`);
    nvim.command(`syntax match ${fhlOutlineEnumMember} /${icons.ENUM_CONSTANT}/`);
    nvim.command(`highlight default link ${fhlOutlineEnumMember} Identifier`);
    nvim.command(`syntax match ${fhlOutlineLineNumber} /: \.\\+$/`);
    nvim.command(`highlight default link ${fhlOutlineLineNumber} Number`);
    await nvim.resumeNotification();

    const goto = async () => {
      const cursor = await window.getCursorPosition();
      const outlineItems = this.outlinePanelData[this.curUri];
      if (!Array.isArray(outlineItems)) return;

      const outline = outlineItems[cursor.line];
      if (outline === undefined) return;

      const curWin = await nvim.window;
      const curTab = await curWin.tabpage;
      const wins = await curTab.windows;
      for (const win of wins) {
        if (`file://${await (await win.buffer).name}` === this.curUri) {
          win.setCursor([outline.codeRange.start.line + 1, outline.codeRange.start.character]).catch((e) => {
            log(e);
          });
          await nvim.call('win_gotoid', [win.id]);
          break;
        }
      }
    };
    const subs: Disposable[] = [];
    subs.push(
      workspace.registerLocalKeymap('n', '<CR>', goto),
      workspace.registerLocalKeymap('n', '<LeftRelease>', goto),
      workspace.registerAutocmd({
        event: 'BufUnload',
        pattern: `{${outlineBufferName},${flutterOutlineBufferName}}`,
        callback: () => {
          this.outlineBuffer = undefined;
          for (const item of subs) {
            item.dispose();
          }
        },
      }),
    );

    await nvim.call('win_gotoid', [curDartWin.id]);
    this.updateOutlineBuffer(this.curUri);
  };

  toggleOutlinePanel = async () => {
    if (this.outlineBuffer === undefined) {
      await this.openOutlinePanel();
      return;
    }
    this.hideOutlinePanel();
  };

  async hideOutlinePanel() {
    if (!this.outlineBuffer) return false;
    const nvim = workspace.nvim;
    const curWin = await nvim.window;
    const curTab = await curWin.tabpage;
    const wins = await curTab.windows;
    for (const win of wins) {
      const buf = await win.buffer;
      if (!buf) {
        continue;
      }
      if (this.outlineBuffer && buf.id === this.outlineBuffer.id) {
        win.close(true).catch((e) => {
          log(e);
        });
      }
    }
    this.outlineBuffer = undefined;
  }

  onOutline = async (params: ClientParamsOutline) => {
    log('onOutline');
    log(() => JSON.stringify(params));
    const { uri, outline } = params;
    const doc = workspace.getDocument(uri);
    // ensure the document is exists
    if (!doc) {
      return;
    }

    this.outlines[uri] = outline;
    if (uri === this.curUri) {
      await this.updateOutline();
    }
  };

  onFlutterOutline = async () => {
    // TODO
  };

  // close tab or win if there only one window of outline buffer
  private closeOnlyOutline = async () => {
    const { nvim } = workspace;
    const wins = await nvim.windows;
    if (!wins) {
      return;
    }
    if (wins.length === 1) {
      // Do q command instead of calling close since we want to close
      // the last window which the close function does not allow
      await nvim.command('silent! q');
    } else {
      const curWin = await nvim.window;
      const curTab = await curWin.tabpage;
      const curTabWins = await curTab.windows;
      if (curTabWins.length === 1) {
        await curWin.close(true);
      }
    }
  };
}
