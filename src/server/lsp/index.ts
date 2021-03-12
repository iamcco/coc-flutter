import {
  Executable,
  ExecutableOptions,
  LanguageClient,
  LanguageClientOptions,
  OutputChannel,
  RevealOutputChannelOn,
  ServerOptions,
  services,
  Uri,
  window,
  workspace,
} from 'coc.nvim';
import { homedir } from 'os';
import { flutterSDK } from '../../lib/sdk';
import { statusBar } from '../../lib/status';
import { Dispose } from '../../util/dispose';
import { logger } from '../../util/logger';
import { DaemonServer } from '../deamon';
import { ClosingLabels } from './closingLabels';
import { codeActionProvider } from './codeActionProvider';
import { completionProvider } from './completionProvider';
import { executeCommandProvider } from './extractProvider';

const log = logger.getlog('lsp-server');

class _ExecOptions implements Executable {
  get command(): string {
    return flutterSDK.dartCommand;
  }
  get args(): string[] {
    return [flutterSDK.analyzerSnapshotPath, '--lsp'];
  }
  options?: ExecutableOptions | undefined;
}

export class LspServer extends Dispose {
  private _client: LanguageClient | undefined;

  constructor(daemon: DaemonServer) {
    super();
    this.daemon = daemon;
    this.init();
  }

  public get client(): LanguageClient | undefined {
    return this._client;
  }

  private execOptions = new _ExecOptions();
  private outchannel?: OutputChannel;
  private daemon: DaemonServer;

  async init(): Promise<void> {
    this.outchannel = window.createOutputChannel('flutter-lsp');
    this.push(this.outchannel);
    const config = workspace.getConfiguration('flutter');
    // is force lsp debug
    const isLspDebug = config.get<boolean>('lsp.debug');
    // dart sdk analysis snapshot path
    if (!flutterSDK.state) {
      await flutterSDK.init(config);
      this.push(this.daemon);
      this.daemon.start();
    }

    if (!flutterSDK.state) {
      log('flutter SDK not found!');
      return;
    }

    // TODO: debug options
    // If the extension is launched in debug mode then the debug server options are used
    // Otherwise the run options are used
    const serverOptions: ServerOptions = {
      run: this.execOptions,
      debug: this.execOptions,
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

      outputChannel: this.outchannel,
      // do not automatically open outchannel
      revealOutputChannelOn: RevealOutputChannelOn.Never,

      middleware: {
        provideCompletionItem: config.get<boolean>('provider.enableSnippet', true) ? completionProvider : undefined,
        provideCodeActions: codeActionProvider,
        executeCommand: executeCommandProvider,
        workspace: {
          didChangeWorkspaceFolders(data, next) {
            if (data.added.length && flutterSDK.sdkHome !== '') {
              const ignore = config
                .get<string[]>('workspaceFolder.ignore', [])
                .concat(flutterSDK.sdkHome)
                .map((p) => {
                  p = p.replace(/^(~|\$HOME)/, homedir());
                  return Uri.file(p).toString();
                });
              data.added = data.added.filter((fold) => !ignore.some((i) => fold.uri.startsWith(i)));
            }
            if (data.added.length || data.removed.length) {
              next(data);
            }
          },
        },
      },
    };

    // Create the language client and start the client.
    const client = new LanguageClient(`flutter`, 'flutter analysis server', serverOptions, clientOptions, isLspDebug);
    this._client = client;

    if (!statusBar.isInitialized) {
      statusBar.init();
      this.push(statusBar);
    }

    client
      .onReady()
      .then(() => {
        log('analysis server ready!');
        if (initialization.closingLabels) {
          // register closing label
          this.push(new ClosingLabels(client));
        }
        statusBar.ready();
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

  async reloadSdk(): Promise<void> {
    const config = workspace.getConfiguration('flutter');
    await flutterSDK.init(config);
  }

  async restart(): Promise<void> {
    statusBar.restartingLsp();
    await this.reloadSdk();
    await this._client?.stop();
    this.daemon.stop();
    this.daemon.start();
    this._client?.onReady().then(() => {
      statusBar.ready();
    });
    this._client?.start();
  }
}
