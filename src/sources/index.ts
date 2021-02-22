import { listManager } from 'coc.nvim';
import { LspServer } from '../server/lsp';

import { Dispose } from '../util/dispose';
import DevicesList from './devices';
import EmulatorsList from './emulators';
import SdksList from './sdks';

export class SourceList extends Dispose {
  constructor(lsp: LspServer) {
    super();
    this.push(
      listManager.registerList(new DevicesList()),
      listManager.registerList(new EmulatorsList()),
      listManager.registerList(new SdksList(lsp)),
    );
  }
}
