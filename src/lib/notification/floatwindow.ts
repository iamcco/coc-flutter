import { Buffer as NVIMBuffer, Window, workspace } from 'coc.nvim';
import { Dispose } from '../../util/dispose';
import { logger } from '../../util/logger';
import { Message } from './message';

const log = logger.getlog('floatWin');

export class FloatWindow extends Dispose {
  private buf: NVIMBuffer | undefined;
  private win: Window | undefined;

  constructor(public readonly message: Message) {
    super();
  }

  public async show(top: number) {
    const { nvim } = workspace;
    const { message } = this;

    const buf = await nvim.createNewBuffer(false, true);
    await buf.setLines(message.lines, { start: 0, end: -1, strictIndexing: false });
    const col = (await nvim.getOption('columns')) as number;
    const win = await nvim.openFloatWindow(
      buf,
      false, // do not enter
      {
        focusable: false, // can not be focusable
        relative: 'editor',
        anchor: 'NE',
        height: message.height,
        width: message.width + 2,
        row: top,
        col,
      },
    );
    this.buf = buf;
    this.win = win;

    nvim.pauseNotification();
    await win.setOption('number', false);
    await win.setOption('wrap', true);
    await win.setOption('relativenumber', false);
    await win.setOption('cursorline', false);
    await win.setOption('cursorcolumn', false);
    await win.setOption('conceallevel', 2);
    await win.setOption('signcolumn', 'no');
    await win.setOption('winhighlight', 'FoldColumn:NormalFloat');
    await nvim.resumeNotification();
    try {
      // vim is number and neovim is string
      await win.setOption('foldcolumn', workspace.isVim ? 1 : '1');
    } catch (error) {
      log(`set foldcolumn error: ${error.message || error}`);
    }
  }

  public async dispose() {
    super.dispose();
    if (this.buf) {
      this.buf = undefined;
    }
    if (this.win) {
      await this.win.close(true);
    }
  }

  public async update(top: number) {
    const { win } = this;
    if (win) {
      const config = await win.getConfig();
      await win.setConfig({
        ...config,
        row: top,
      });
    }
  }
}
