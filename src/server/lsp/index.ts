import {
  workspace,
  Executable,
  ServerOptions,
  LanguageClientOptions,
  RevealOutputChannelOn,
  LanguageClient,
  services,
  Uri,
} from 'coc.nvim';
import { homedir } from 'os';

import { flutterSDK } from '../../lib/sdk';
import { logger } from '../../util/logger';
import { statusBar } from '../../lib/status';
import { Dispose } from '../../util/dispose';
import { ClosingLabels } from './closingLabels';
import { SignatureHelpProvider } from './signatureHelp';
import { completionProvider } from './completionProvider';
import { codeActionProvider } from './codeActionProvider';

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
      onlyAnalyzeProjectsWithOpenFiles: true,
      suggestFromUnimportedLibraries: true,
      closingLabels: true,
    });

    /**
     * disable disableDynamicRegister for version less then 2.6.0
     * issue: https://github.com/dart-lang/sdk/issues/38490
     */
    const rightVersion = await flutterSDK.isVersionGreatOrEqualTo([2, 6, 0]);
    log(`rightVersion ${rightVersion}`);

    // Options to control the language client
    const clientOptions: LanguageClientOptions = {
      disableDynamicRegister: !rightVersion,
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
        provideCompletionItem: config.get<boolean>('provider.enableSnippet', true) ? completionProvider : undefined,
        provideCodeActions: codeActionProvider,
        workspace: {
          didChangeWorkspaceFolders(data, next) {
            if (data.added.length && flutterSDK.sdkHome !== '') {
              const ignore = config
                .get<string[]>('workspaceFolder.ignore', [])
                .concat(flutterSDK.sdkHome)
                .map(p => {
                  p = p.replace(/^(~|\$HOME)/, homedir());
                  return Uri.file(p).toString();
                });
              data.added = data.added.filter(fold => !ignore.some(i => fold.uri.startsWith(i)));
            }
            if (data.added.length || data.removed.length) {
              next(data);
            }
          },
        },
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
        // FIXME
        setTimeout(() => {
          // https://github.com/iamcco/coc-flutter/issues/8
          this.push(new SignatureHelpProvider(client));
        }, 2000);
        // update lsp status
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
