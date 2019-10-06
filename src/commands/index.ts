import {Disposable} from 'coc.nvim'

import {Run} from './run'
import {Dispose} from '../util/dispose'

export class Commands extends Dispose {
  constructor() {
    super()
    this.push(
      new Run()
    )
  }
}
