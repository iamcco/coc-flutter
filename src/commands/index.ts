import {Dispose} from '../util/dispose'
import {Dev} from './dev'
import {Global} from './global'

export class Commands extends Dispose {
  constructor() {
    super()
    this.push(
      new Dev(),
      new Global()
    )
  }
}
