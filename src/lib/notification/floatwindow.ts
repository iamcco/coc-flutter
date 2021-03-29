import { Buffer as NVIMBuffer, Window, workspace } from 'coc.nvim';
import { Dispose } from '../../util/dispose';
import { logger } from '../../util/logger';
import { Message } from './message';

const log = logger.getlog('floatWin');

export class FloatWindow extends Dispose {
  private buf: NVIMBuffer | undefined;
  private win: Window | undefined;
  // neovim >= 0.5.0
  private isNvimNightly: boolean | undefined;

  constructor(public readonly message: Message) {
    super();
  }

  public async show(top: number) {
    const { nvim } = workspace;
    const { message } = this;

    if (this.isNvimNightly === undefined) {
      this.isNvimNightly = await nvim.call('has', 'nvim-0.5.0');
    }
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
    win.setOption('number', false);
    win.setOption('wrap', true);
    win.setOption('relativenumber', false);
    win.setOption('cursorline', false);
    win.setOption('cursorcolumn', false);
    win.setOption('conceallevel', 2);
    win.setOption('signcolumn', 'no');
    win.setOption('winhighlight', 'FoldColumn:NormalFloat');
    await nvim.resumeNotification();
    try {
      // vim and neovim < 0.5.0 foldcolumn is number
      // refer https://github.com/neovim/neovim/pull/11716
      await win.setOption('foldcolumn', !this.isNvimNightly ? 1 : '1');
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
