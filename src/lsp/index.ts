import {
  workspace,
  Executable,
  ServerOptions,
  LanguageClientOptions,
  RevealOutputChannelOn,
  LanguageClient,
  services,
} from 'coc.nvim';

import {flutterSDK} from '../lib/sdk';
import {logger} from '../util/logger';
import {statusBar} from '../lib/status';
import {Dispose} from '../util/dispose';
import {resolveProvider} from './resolveProvider';

const log = logger.getlog('lsp-server')

export class LspServer extends Dispose {

  constructor() {
    super()
    this.init()
  }

  async init() {
    const config = workspace.getConfiguration('flutter')
    // is force lsp debug
    const isLspDebug = config.get<boolean>('lsp.debug')
    // dart sdk analysis snapshot path
    await flutterSDK.init(config)

    if (!flutterSDK.state) {
      log('flutter SDK not found!')
      return
    }

    const execOptions: Executable = {
      command: flutterSDK.dartCommand,
      args: [
        flutterSDK.analyzerSnapshotPath,
        '--lsp'
      ],
    };

    // TODO: debug options
    // If the extension is launched in debug mode then the debug server options are used
    // Otherwise the run options are used
    let serverOptions: ServerOptions = {
      run : execOptions,
      debug: execOptions
    }

    const traceServer = config.get<'off' | 'messages' | 'verbose'>('trace.server', 'off')

    // Options to control the language client
    const clientOptions: LanguageClientOptions = {
      // FIXME: https://github.com/dart-lang/sdk/issues/38490#issuecomment-537450963
      // only nightly build had fix the issue
      disableDynamicRegister: true,
      // Register the server for dart document
      documentSelector: [{
        scheme: 'file',
        language: 'dart'
      }],

      outputChannel: logger.outchannel,
      revealOutputChannelOn: traceServer === 'off' ? RevealOutputChannelOn.Never : RevealOutputChannelOn.Info,

      middleware: {
        resolveCompletionItem: config.get<boolean>('provider.enableSnippet', true)
        ? resolveProvider
        : undefined
      }
    }

    // Create the language client and start the client.
    let client = new LanguageClient(
      'flutter',
      'flutter analysis server',
      serverOptions,
      clientOptions,
      isLspDebug,
    );

    statusBar.init()
    this.push(statusBar)
    statusBar.show('Flutter', true)

    client.onReady()
      .then(() => {
        statusBar.ready()
        log('analysis server ready!')
      })
      .catch((error: Error) => {
        statusBar.hide()
        log(error.message || 'start analysis server fail!')
        log(error.stack)
      })

    // Push the disposable to the context's subscriptions so that the
    // client can be deactivated on extension deactivation
    this.push(services.registLanguageClient(client));
  }
}
