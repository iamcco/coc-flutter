import {Disposable} from 'coc.nvim';

export class FlutterCommand {
  public subscriptions: Disposable[] = []

  dispose() {
    if (this.subscriptions.length) {
      this.subscriptions.forEach(item => {
        item.dispose()
      })
    }
  }
}
