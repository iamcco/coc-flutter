import {Dispose} from '../util/dispose'
import {Dev} from './dev'
import {Pub} from './pub'

export class Commands extends Dispose {
  constructor() {
    super()
    this.push(
      new Dev(),
      new Pub()
    )
  }
}
