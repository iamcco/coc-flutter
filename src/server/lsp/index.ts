import {
  workspace,
  Executable,
  ServerOptions,
  LanguageClientOptions,
  RevealOutputChannelOn,
  LanguageClient,
  services,
} from 'coc.nvim';

import { flutterSDK } from '../../lib/sdk';
import { logger } from '../../util/logger';
import { statusBar } from '../../lib/status';
import { Dispose } from '../../util/dispose';
import { resolveProvider } from './resolveProvider';
import { ClosingLabels } from './closingLabels';

const log = logger.getlog('lsp-server');

export class LspServer extends Dispose {
  private _client: LanguageClient | undefined;

  constructor() {
    super();
    this.init();
  }

  public get client(): LanguageClient | undefined {
    return this._client;
  }

  async init() {
    const config = workspace.getConfiguration('flutter');
    // is force lsp debug
    const isLspDebug = config.get<boolean>('lsp.debug');
    // dart sdk analysis snapshot path
    await flutterSDK.init(config);

    if (!flutterSDK.state) {
      log('flutter SDK not found!');
      return;
    }

    const execOptions: Executable = {
      command: flutterSDK.dartCommand,
      args: [flutterSDK.analyzerSnapshotPath, '--lsp'],
    };

    // TODO: debug options
    // If the extension is launched in debug mode then the debug server options are used
    // Otherwise the run options are used
    const serverOptions: ServerOptions = {
      run: execOptions,
      debug: execOptions,
    };

    // lsp initialization
    const initialization = config.get('lsp.initialization', {
      onlyAnalyzeProjectsWithOpenFiles: false,
      suggestFromUnimportedLibraries: true,
      closingLabels: true,
    });

    // Options to control the language client
    const clientOptions: LanguageClientOptions = {
      // FIXME: https://github.com/dart-lang/sdk/issues/38490#issuecomment-537450963
      // only nightly build had fix the issue
      disableDynamicRegister: true,
      // Register the server for dart document
      documentSelector: [
        {
          scheme: 'file',
          language: 'dart',
        },
      ],

      initializationOptions: initialization,

      // lsp outchannel use same as logger
      outputChannel: logger.outchannel,
      // do not automatically open outchannel
      revealOutputChannelOn: RevealOutputChannelOn.Never,

      middleware: {
        resolveCompletionItem: config.get<boolean>('provider.enableSnippet', true) ? resolveProvider : undefined,
      },
    };

    // Create the language client and start the client.
    const client = new LanguageClient('flutter', 'flutter analysis server', serverOptions, clientOptions, isLspDebug);
    this._client = client;

    statusBar.init();
    this.push(statusBar);

    client
      .onReady()
      .then(() => {
        log('analysis server ready!');
        if (initialization.closingLabels) {
          // register closing label
          this.push(new ClosingLabels(client));
        }
        // update flsp status
        statusBar.show('Flutter', true);
        statusBar.ready(client);
      })
      .catch((error: Error) => {
        statusBar.hide();
        log(error.message || 'start analysis server fail!');
        log(error.stack);
      });

    // Push the disposable to the context's subscriptions so that the
    // client can be deactivated on extension deactivation
    this.push(services.registLanguageClient(client));
  }
}
