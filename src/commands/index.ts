import { Dispose } from '../util/dispose';
import { Dev } from './dev';
import { Global } from './global';
import { LspServer } from '../server/lsp';
import { SuperCommand } from './super';
import { LspCommands } from './lsp';
import { DaemonServer } from '../server/deamon';

export class Commands extends Dispose {
  constructor(lsp: LspServer, daemon: DaemonServer) {
    super();
    this.push(new Dev(daemon), new Global(), new LspCommands(lsp), new SuperCommand(lsp));
  }
}
