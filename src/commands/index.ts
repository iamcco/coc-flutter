import {Run} from './dev'
import {Dispose} from '../util/dispose'

export class Commands extends Dispose {
  constructor() {
    super()
    this.push(
      new Run()
    )
  }
}
