# ![](https://flutter.dev/images/favicon.png) coc-flutter

Flutter support for (Neo)vim

![2019-10-07 23-31-40 2019-10-08 00_04_07](https://user-images.githubusercontent.com/5492542/66328510-58a6c480-e95f-11e9-95ca-0b4ed7c8e83f.gif)

## Features

- LSP features is power by [analysis_server](https://github.com/dart-lang/sdk/blob/master/pkg/analysis_server/tool/lsp_spec/README.md)
  - autocomplete
  - diagnostics
  - format
  - rename
  - hover document
  - signature help
  - go to definition
  - go to implementation
  - go to references
  - document highlight
  - document symbol
  - code actions
  - [more detail](https://github.com/dart-lang/sdk/blob/master/pkg/analysis_server/tool/lsp_spec/README.md)
    > need flutter sdk and add to `PATH` environment
- Automatically finds SDKs from PATH
- Automatic hot reloads on save
- Automatically run `flutter pub get` when `pubspec.yaml` change
- Support flutter dev server
- Snippet enhance `flutter.provider.enableSnippet`
- Devices List
- Emulators List

## Install

`:CocInstall coc-flutter`

> **NOTE**: install `dart-vim-plugin` plugin if your (neo)vim detect filetype incorrect

## coc-list sources

- FlutterDevices
  > `:CocList FlutterDevices`
- FlutterEmulators
  > `:CocList FlutterEmulators`

## Settings

- `flutter.trace.server` Trace level of log, default: `off`
- `flutter.enabled` Enable coc-flutter extension, default: `true`
- `flutter.lsp.debug` Enable debug for language server, default: `false`
- `flutter.lsp.initialization.onlyAnalyzeProjectsWithOpenFiles`: default: `true`
  > When set to true, analysis will only be performed for projects that have open files rather than the root workspace folder.
- `flutter.lsp.initialization.suggestFromUnimportedLibraries`: default: `true`
  > When set to false, completion will not include synbols that are not already imported into the current file
- [`flutter.lsp.initialization.closingLabels`](#closing-labels): default: `true`
  > When set to true, will display closing labels at end of closing, only neovim support.
- `flutter.sdk.dart-command` dart command, leave empty should just work, default: `''`
- `flutter.sdk.dart-lookup` command to find dart executable location, used to infer dart-sdk location, default: `''`
- `flutter.sdk.flutter-lookup` command to find flutter executable location, used to infer location of dart-sdk in flutter cache: `''`
- `flutter.provider.hot-reload` Enable hot reload after save, default: `true`
  > only when there are no errors for the save file
- `flutter.provider.enableSnippet` Enable completion item snippet, default: true
  - `import '';` => `import '${1}';${0}`
  - `someName(…)` => `someName(${1})${0}`
  - `setState(() {});` => `setState(() {\n\t${1}\n});${0}`
- `flutter.openDevLogSplitCommand` Vim command to open dev log window, like: `botright 10split`, default: ''
- `flutter.workspaceFolder.ignore` Path start within the list will not treat as workspaceFolder, default: []
  - also flutter sdk will not treat as workspaceFolder, more detail issues [50](https://github.com/iamcco/coc-flutter/issues/50)
- `flutter.runDevToolsAtStartup` Automatically open devtools debugger web page when a project is run, default: 'false'


**Enable format on save**:

```jsonc
"coc.preferences.formatOnSaveFiletypes": [
  "dart"
],
```

## Code Actions

Add below config mapping

> this config should be in the coc.nvim README

``` vim
xmap <leader>a  <Plug>(coc-codeaction-selected)
nmap <leader>a  <Plug>(coc-codeaction-selected)
```

Applying codeAction to the selected region.

Example: `<leader>aap` for current paragraph, `<leader>aw` for the current word

Then you will see action list:

- Wrap with Widget
- Wrap with Center
- etc

## Commands

Open flutter only commands list: `CocList --input=flutter commands`

**Global Commands**:

- `flutter.run` Run flutter dev server
- `flutter.attach` Attach running application
- `flutter.create` Create flutter project using: `flutter create`
- `flutter.doctor` Run: `flutter doctor`
- `flutter.upgrade` Run: `flutter upgrade`
- `flutter.pub.get` Run: `flutter pub get`
- `flutter.devices` open devices list
- `flutter.emulators` open emulators list

**LSP Commands**

- `flutter.gotoSuper` jump to the location of the super definition of the class or method

**Dev Server Commands**:

> available when dev server running

- `flutter.dev.quit` Quit server
- `flutter.dev.detach` Detach server
- `flutter.dev.hotReload` Hot reload
- `flutter.dev.hotRestart` Hot restart
- `flutter.dev.screenshot` To save a screenshot to flutter.png
- `flutter.dev.openDevLog` Open flutter dev server log
- `flutter.dev.clearDevLog` Clear the flutter dev server log
- `flutter.dev.openProfiler` Open observatory debugger and profiler web page
- `flutter.dev.copyProfilerUrl` Copy the url of observatory debugger and profiler web page to the system clipboard (register +)
- `flutter.dev.openDevToolsProfiler` Open devtools debugger web page
- `flutter.dev.debugDumpAPP` You can dump the widget hierarchy of the app (debugDumpApp)
- `flutter.dev.elevationChecker` To toggle the elevation checker
- `flutter.dev.debugDumpLayerTree` For layers (debugDumpLayerTree)
- `flutter.dev.debugDumpRenderTree` To dump the rendering tree of the app (debugDumpRenderTree)
- `flutter.dev.debugPaintSizeEnabled` To toggle the display of construction lines (debugPaintSizeEnabled)
- `flutter.dev.defaultTargetPlatform` To simulate different operating systems, (defaultTargetPlatform)
- `flutter.dev.showPerformanceOverlay` To display the performance overlay (WidgetsApp.showPerformanceOverlay)
- `flutter.dev.debugProfileWidgetBuilds` To enable timeline events for all widget build methods, (debugProfileWidgetBuilds)
- `flutter.dev.showWidgetInspectorOverride` To toggle the widget inspector (WidgetsApp.showWidgetInspectorOverride)
- `flutter.dev.debugDumpSemanticsHitTestOrder` Accessibility (debugDumpSemantics) for inverse hit test order
- `flutter.dev.debugDumpSemanticsTraversalOrder` Accessibility (debugDumpSemantics) for traversal order

### Closing Labels

when `flutter.lsp.initialization.closingLabels` is true,
the closing labels will be display at end of closing.

> this feature only support neovim since vim do not support virtual text

| disabled                                                                                                                         | enabled                                                                                                                          |
| -------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| <img height="300px" src="https://user-images.githubusercontent.com/5492542/67616073-f0812b00-f806-11e9-8e5c-ac42ab3a293c.png" /> | <img height="300px" src="https://user-images.githubusercontent.com/5492542/67616063-c16ab980-f806-11e9-8522-1c89217096e0.png" /> |

### Buy Me A Coffee ☕️

![btc](https://img.shields.io/keybase/btc/iamcco.svg?style=popout-square)

![image](https://user-images.githubusercontent.com/5492542/42771079-962216b0-8958-11e8-81c0-520363ce1059.png)
