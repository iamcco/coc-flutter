import { ExecuteCommandSignature, window } from 'coc.nvim';
import { validClassNameRegex, validMethodNameRegex, validVariableNameRegex } from '../../util/constant';

// code from https://github.com/Dart-Code/Dart-Code/commit/48b3f213fe1efb6f4aa00bebbf7ee8b0a58f21d6
export const executeCommandProvider = async (command: string, args: any[], next: ExecuteCommandSignature) => {
  if (command === 'refactor.perform') {
    const expectedCount = 6;
    if (args && args.length === expectedCount) {
      const refactorFailedErrorCode = -32011;
      const refactorKind = args[0];
      const optionsIndex = 5;
      // Intercept EXTRACT_METHOD and EXTRACT_WIDGET to prompt the user for a name, since
      // LSP doesn't currently allow us to prompt during a code-action invocation.
      let name: string | undefined;
      switch (refactorKind) {
        case 'EXTRACT_METHOD':
          name = await window.requestInput('Enter a name for the method', 'NewMethod');
          if (!name) return;
          if (!validMethodNameRegex.test(name)) {
            return window.showErrorMessage('Enter a valid method name');
          }
          args[optionsIndex] = Object.assign({}, args[optionsIndex], { name });
          break;
        case 'EXTRACT_WIDGET':
          name = await window.requestInput('Enter a name for the widget', 'NewWidget');
          if (!name) return;
          if (!validClassNameRegex.test(name)) {
            return window.showErrorMessage('Enter a valid widget name');
          }
          args[optionsIndex] = Object.assign({}, args[optionsIndex], { name });
          break;
        case 'EXTRACT_LOCAL_VARIABLE':
          name = await window.requestInput('Enter a name for the variable', 'NewVariable');
          if (!name) return;
          if (!validVariableNameRegex.test(name)) {
            return window.showErrorMessage('Enter a valid variable name');
          }
          args[optionsIndex] = Object.assign({}, args[optionsIndex], { name });
          break;
      }

      // The server may return errors for things like invalid names, so
      // capture the errors and present the error better if it's a refactor
      // error.
      try {
        return await next(command, args);
      } catch (e) {
        window.showErrorMessage(e.message);
        if (e?.code === refactorFailedErrorCode) {
          window.showErrorMessage(e.message);
          return;
        } else {
          throw e;
        }
      }
    }
  }
  return next(command, args);
};
