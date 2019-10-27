import { Window, Buffer as NVIMBuffer, workspace } from 'coc.nvim';

import { Message } from './message';
import { Dispose } from '../../util/dispose';

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
    await buf.replace(message.lines, 0);
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
    await win.setOption('foldcolumn', 1);
    await win.setOption('winhighlight', 'FoldColumn:NormalFloat');
    await nvim.resumeNotification();
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
