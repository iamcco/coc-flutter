import { Disposable } from 'coc.nvim';

export class Dispose {
  public subscriptions: Disposable[] = [];

  push(...disposes: Disposable[]) {
    this.subscriptions.push(...disposes);
  }

  remove(subscription: Disposable) {
    this.subscriptions = this.subscriptions.filter(dispose => {
      if (subscription === dispose) {
        dispose.dispose();
        return false;
      }
      return true;
    });
  }

  dispose() {
    if (this.subscriptions.length) {
      this.subscriptions.forEach(item => {
        item.dispose();
      });
      this.subscriptions = [];
    }
  }
}
