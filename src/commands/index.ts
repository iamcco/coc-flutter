import { Dispose } from '../util/dispose';
import { Dev } from './dev';
import { Global } from './global';
import { LspServer } from '../server/lsp';
import { SuperCommand } from './super';
import { LspCommands } from './lsp';

export class Commands extends Dispose {
  constructor(lsp: LspServer) {
    super();
    this.push(new Dev(), new Global(), new LspCommands(lsp), new SuperCommand(lsp));
  }
}
