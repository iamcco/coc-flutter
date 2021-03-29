import { window, workspace } from 'coc.nvim';
import { formatMessage } from '../../util';
import { Dispose } from '../../util/dispose';
import { Message } from './message';

const messageMaxWidth = 60;
const detectTimeGap = 1000 / 30;
const messageDefaultShowTime = 3000;

class Notification extends Dispose {
  private isSupportFloat = false;
  // top to the viewpoint
  private top = 1;
  private maxWidth: number = messageMaxWidth;
  private messages: Message[] = [];
  private display: Message[] = [];
  private timeGap: number = detectTimeGap;
  private timer: NodeJS.Timer | undefined;

  constructor() {
    super();
    this.init();
  }

  private async init() {
    const { nvim } = workspace;
    this.isSupportFloat = !!(await nvim.call('exists', '*nvim_open_win'));
    const screenWidth = (await nvim.getOption('columns')) as number;
    this.maxWidth = Math.min(this.maxWidth, screenWidth);
  }

  private async detect() {
    if (this.timer) {
      clearTimeout(this.timer);
    }
    const { timeGap, display } = this;
    let { top } = this;
    this.display = [];
    for (const message of display) {
      if (!message.isInvalid) {
        await message.update(timeGap, top);
        top += message.height;
        this.display.push(message);
      } else {
        message.dispose();
      }
    }
    const { nvim } = workspace;
    const screenHeight = ((await nvim.getOption('lines')) as number) - 1; // 1 is statusline height
    while (this.messages.length) {
      const message = this.messages[this.messages.length - 1];
      if (top + message.height > screenHeight) {
        break;
      } else {
        this.messages.pop();
        await message.show(top);
        this.display.push(message);
        top += message.height;
      }
    }
    if (!this.messages.length && !this.display.length) return;
    this.timer = setTimeout(() => {
      this.detect();
    }, this.timeGap);
  }

  show(message: string | string[], showTime: number = messageDefaultShowTime) {
    const messages = typeof message === 'string' ? formatMessage(message) : message;
    if (messages.length === 0) {
      return;
    }
    if (!this.isSupportFloat) {
      return window.showMessage(messages.join('\n'));
    }
    this.messages.push(new Message(messages, this.maxWidth, showTime));
    this.detect();
  }

  dispose() {
    if (this.timer) {
      clearTimeout(this.timer);
    }
    this.push(...this.display);
    this.messages = [];
    this.display = [];
    super.dispose();
  }
}

export const notification = new Notification();
