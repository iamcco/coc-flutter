import { listManager } from 'coc.nvim';
import { DaemonServer } from '../server/deamon';
import { LspServer } from '../server/lsp';

import { Dispose } from '../util/dispose';
import DevicesList from './devices';
import EmulatorsList from './emulators';
import SdksList from './sdks';

export class SourceList extends Dispose {
  constructor(lsp: LspServer, daemon: DaemonServer) {
    super();
    this.push(
      listManager.registerList(new DevicesList(daemon)),
      listManager.registerList(new EmulatorsList()),
      listManager.registerList(new SdksList(lsp)),
    );
  }
}
