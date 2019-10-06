import {registerHotReloadProvider} from './hotreload';
import {Dispose} from '../util/dispose';

export class Providers extends Dispose {
  constructor() {
    super()
    this.push(
      registerHotReloadProvider()
    )
  }
}
