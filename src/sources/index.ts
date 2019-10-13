import {listManager} from 'coc.nvim';

import {Dispose} from '../util/dispose';
import DevicesList from './devices';
import EmulatorsList from './emulators';

export class SourceList extends Dispose {
  constructor() {
    super()
    this.push(
      listManager.registerList(new DevicesList()),
      listManager.registerList(new EmulatorsList())
    )
  }
}
