import { workspace, ConfigurationChangeEvent, Disposable, diagnosticManager } from 'coc.nvim';
import { TextDocument, DiagnosticSeverity } from 'vscode-languageserver-protocol';

import { devServer } from '../server/dev';

export const registerHotReloadProvider = (): Disposable => {
  const enableHotReload = workspace.getConfiguration('flutter').get<boolean>('provider.hot-reload', true);
  let subscription: Disposable | undefined;
  if (enableHotReload) {
    subscription = workspace.onDidSaveTextDocument((doc: TextDocument) => {
      if (doc.languageId === 'dart' && devServer.state) {
        // do not reload if there ara errors for the save file
        const diagnostics = diagnosticManager.getDiagnostics(doc.uri);
        const hasErrors =
          diagnostics && diagnostics.find(d => d.source === 'dart' && d.severity === DiagnosticSeverity.Error) != null;
        if (!hasErrors) {
          devServer.sendCommand('r');
        }
      }
    });
  }

  const configChangeSubs = workspace.onDidChangeConfiguration((e: ConfigurationChangeEvent) => {
    if (e.affectsConfiguration('flutter')) {
      const isEnableHotReload = workspace.getConfiguration('flutter').get<boolean>('provider.hot-reload', true);
      // disable hot reload
      if (enableHotReload && !isEnableHotReload) {
        if (subscription) {
          subscription.dispose();
          subscription = undefined;
        }
        // enable hot reload
      } else if (!enableHotReload && isEnableHotReload) {
        subscription = workspace.onDidSaveTextDocument((doc: TextDocument) => {
          if (doc.languageId === 'dart' && devServer.state) {
            devServer.sendCommand('r');
          }
        });
      }
    }
  });

  return {
    dispose() {
      if (subscription) {
        subscription.dispose();
      }
      configChangeSubs.dispose();
    },
  };
};
