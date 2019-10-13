import {Disposable, workspace, commands} from 'coc.nvim';
import {Dispose} from '../util/dispose';

export const pubUpdateProvider = (): Disposable => {
  const dispose = new Dispose()
  const watch = workspace.createFileSystemWatcher('**/pubspec.yaml')
  dispose.push(
    watch
  )
  watch.onDidChange(() => {
    commands.executeCommand('flutter.pub.get')
  }, null, dispose.subscriptions)
  return dispose
}
