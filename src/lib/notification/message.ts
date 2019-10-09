import {Dispose} from '../../util/dispose'
import {FloatWindow} from './floatwindow'

export class Message extends Dispose {
  private top: number = 0
  public readonly height: number
  public readonly width: number
  public readonly floatWindow: FloatWindow

  constructor(
    public readonly lines: string[],
    maxWidth: number,
    private _time: number = 1000,
  ) {
    super()
    this.width = 0
    this.height = 0
    for (let line of lines) {
      const byteLength = Buffer.byteLength(line)
      this.width = Math.max(this.width, Math.min(byteLength, maxWidth))
      this.height = this.height + Math.max(1, Math.ceil(byteLength / (maxWidth - 2)))
    }
    this.floatWindow = new FloatWindow(this)
    this.push(this.floatWindow)
  }

  public get time() : number {
    return this._time
  }

  public get isInvalid(): boolean {
    return this._time <= 0
  }

  public async show(top: number) {
    this.top = top
    await this.floatWindow.show(top)
  }

  public async update(time: number, top: number) {
    this._time -= time
    if (this.top !== top) {
      this.top = top
      await this.floatWindow.update(top)
    }
  }
}
