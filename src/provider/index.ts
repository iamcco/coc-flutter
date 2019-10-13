import {registerHotReloadProvider} from './hotreload';
import {Dispose} from '../util/dispose';
import {pubUpdateProvider} from './pub';

export class Providers extends Dispose {
  constructor() {
    super()
    this.push(
      registerHotReloadProvider(),
      pubUpdateProvider()
    )
  }
}
