import {Disposable} from 'coc.nvim';

export class Dispose {
  private subscriptions: Disposable[] = []

  push(...disposes: Disposable[]) {
    this.subscriptions.push(...disposes)
  }

  dispose() {
    if (this.subscriptions.length) {
      this.subscriptions.forEach(item => {
        item.dispose()
      })
    }
  }
}
