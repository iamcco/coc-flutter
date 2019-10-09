import {workspace} from 'coc.nvim'

import {Dispose} from '../../util/dispose'
import {Message} from './message'

const messageMaxWidth = 60
const detectTimeGap = 1000 / 30
const messageDefaultShowTime = 3000
const messageConcatTimeGap = 0

class Notification extends Dispose {
  // top to the viewpoint
  private top: number = 1
  private maxWidth: number = messageMaxWidth
  private tmp: {
    time: number
    text: string[]
  } | undefined
  private messages: Message[] = []
  private display: Message[] = []
  private timeGap: number = detectTimeGap
  private timer: NodeJS.Timer | undefined
  private tmpTimer: NodeJS.Timer | undefined

  constructor() {
    super()
    this.init()
  }

  private async init() {
    const { nvim } = workspace
    const screenWidth = await nvim.getOption('columns') as number
    this.maxWidth = Math.min(this.maxWidth, screenWidth)
  }

  private async detect() {
    if (this.timer) {
      clearTimeout(this.timer)
    }
    let { timeGap, top, display } = this
    this.display = []
    for (const message of display) {
      if (!message.isInvalid) {
        await message.update(timeGap, top)
        top += message.height
        this.display.push(message)
      } else {
        message.dispose()
      }
    }
    const { nvim } = workspace
    const screenHeight = await nvim.getOption('lines') as number - 1 // 1 is statusline height
    while(this.messages.length) {
      const message = this.messages[this.messages.length - 1]
      if ((top + message.height) > screenHeight) {
        break
      } else {
        this.messages.pop()
        await message.show(top)
        this.display.push(message)
        top += message.height
      }
    }
    this.timer = setTimeout(() => {
      this.detect()
    }, this.timeGap)
  }

  show(message: string | string[], showTime: number = messageDefaultShowTime) {
    if (this.tmp) {
      if (Date.now() - this.tmp.time > messageConcatTimeGap) {
        this.messages.push(
          new Message(
            this.tmp.text.concat(message),
            this.maxWidth,
            showTime
          )
        )
        this.tmp = undefined
        if (this.tmpTimer) {
          clearTimeout(this.tmpTimer)
        }
      } else {
        this.tmp.text = this.tmp.text.concat(message)
      }
    } else {
      this.tmp = {
        time: Date.now(),
        text: ([] as string[]).concat(message)
      }
      this.tmpTimer = setTimeout(() => {
        this.messages.push(
          new Message(
            this.tmp!.text,
            this.maxWidth,
            showTime
          )
        )
        this.tmp = undefined
        this.detect()
      }, messageConcatTimeGap)
    }
  }

  dispose() {
    if (this.timer) {
      clearTimeout(this.timer)
    }
    if (this.tmpTimer) {
      clearTimeout(this.tmpTimer)
    }
    this.push(...this.display)
    this.messages = []
    this.display = []
    super.dispose()
  }
}

export const notification = new Notification()
