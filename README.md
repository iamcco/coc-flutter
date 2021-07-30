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
- Sdk switching
- Devices List
- Emulators List

## Install

`:CocInstall coc-flutter`

> **NOTE**: install `dart-vim-plugin` plugin if your (neo)vim detect filetype incorrect

Most likely the extension will find your sdk automatically as long as the `flutter` command maps to an sdk location on your system.

If you are using a version manager like `asdf` that maps the `flutter` command to another binary instead of an sdk location or this extension cannot find your sdk for another reason you'll have to provide the extension with how to find your sdk.
To do this there are a few options:
1. If your version manager supports a `which` command like then you can set the `flutter.sdk.flutter-lookup` config option. Eg. `"flutter.sdk.flutter-lookup": "asdf which flutter"`.
2. You can add the path where to find the sdk to the `flutter.sdk.searchPaths` config option.
   Either specify the exact folder the sdk is installed in or a folder that contains other folders which directly have an sdk in them. *Note that not all of these folders need to have an sdk, if they don't contain one they will simply be ignored*
3. Set the `flutter.sdk.path` config option to the exact path you want to use for your sdk.
   If you have also set the `flutter.sdk.searchPaths` then you can use the `FlutterSDKs` list (see below) to see what versions you have installed and set the config option for you. **Note that this means that the `flutter.sdk.path` option will be overriden by this list**

## Running the app

When the extension starts and has found an sdk it will request from flutter the available devices.
The device it will run the app on will be shown in the statusbar and can be changed using the `FlutterDevices` list.
If you call `flutter.run` with an explicit `-d deviceId` argument then the selected device will be ignored.

After making sure that the correct device is selected you can run the app by calling the `flutter.run`:
> :CocCommand flutter.run

If you want to give arguments to the flutter run command you can simply append them:
> :CocCommand flutter.run -t lib/main.dart --flavor myflavor


## coc-list sources

- FlutterSDKs
  > `:CocList FlutterSDKs`

  Shows all the sdks that can be found by using the `searchPaths` config and the `flutter-lookup` config options and allows you to switch between them, either only for your current workspace or globally.
  Besides those two ways to find sdks it also checks if you are using fvm and if so uses those directories to find your sdk.
  *You can disable this using the `flutter.fvm.enabled` config option.*

  You can also use this list to see what your current sdk is since it will have `(current)` behind it clearly.

- FlutterDevices
  > `:CocList FlutterDevices`

  Shows a list of available devices that can be selected to use as run destination.
  When selecting a device it will by default be stored in the `workspaceState` such that a device can be selected on a per project basis.
  If no device is stored yet in the `workspaceState` it will fall back to the `globalState` and otherwise simply use the first device reported by flutter.
  It also has the `run` action which only runs the app once on that device without changing the selected device.

  You can configure the default action that us used using the `flutter.devicesDefaultAction` config option as described below.

- FlutterEmulators
  > `:CocList FlutterEmulators`

  Shows emulators available to start.

## Settings

- `flutter.trace.server` default: `off`
  > Trace level of log

- `flutter.enabled` default: `true`
  > Enable coc-flutter extension

- `flutter.lsp.debug` default: `false`
  > Enable debug for language server

- `flutter.lsp.initialization.onlyAnalyzeProjectsWithOpenFiles`: default: `true`
  > When set to true, analysis will only be performed for projects that have open files rather than the root workspace folder.

- `flutter.lsp.initialization.suggestFromUnimportedLibraries`: default: `true`
  > When set to false, completion will not include synbols that are not already imported into the current file

- `[flutter.lsp.initialization.closingLabels](#closing-labels)`: default: `true`
  > When set to true, will display closing labels at end of closing, only neovim support.

- `flutter.sdk.searchPaths` default: `[]`
  > the paths to search for flutter sdks, either directories where flutter is installed or directories which contain directories where flutter versions have been installed
  > eg. `/path/to/flutter` (command at `/path/to/flutter/bin/flutter`) or
  > `~/flutter_versions` (command at `~/flutter_versions/version/bin/flutter`).

- `flutter.sdk.dart-command` default: `''`
  > dart command, leave empty should just work

- `flutter.sdk.dart-lookup` default: `''`
  > (**only use this if you don't have a flutter installation but only dart**) command to find dart executable location, used to infer dart-sdk location

- `flutter.sdk.flutter-lookup` default: `''`
  > command to find flutter executable location, used to infer location of dart-sdk in flutter cache

- `flutter.provider.hot-reload` default: `true`
  > Enable hot reload after save.
  > Only when there are no errors for the save file

- `flutter.provider.enableSnippet` Enable completion item snippet, default: `true`
  - `import '';` => `import '${1}';${0}`
  - `someName(…)` => `someName(${1})${0}`
  - `setState(() {});` => `setState(() {\n\t${1}\n});${0}`

- `flutter.openDevLogSplitCommand` default: `''`
  >  Vim command to open dev log window, like: `botright 10split`

- `flutter.workspaceFolder.ignore` default: `[]`
  > Path start within the list will not treat as workspaceFolder.
  > Also flutter sdk will not treat as workspaceFolder, more detail issues [50](https://github.com/iamcco/coc-flutter/issues/50)

- `flutter.runDevToolsAtStartup` default: `false`
  > Automatically open devtools debugger web page when a project is run

- `flutter.autoOpenDevLog` default: `false`
  > Automatically open the dev log after calling flutter run

- `flutter.autoHideDevLog` default: `false`
  > Automatically hide the dev log when the app stops running

- `flutter.selectedDeviceId` default: `null`
  > The id of the device that was last selected using the FlutterDevices list (only if the device is selected using one of the `config` actions).

- `flutter.devicesDefaultAction` default: `workspaceState`
  > The default action to use when pressing enter in the `FlutterDevices` list.
  > The `state` options will store the selected device in coc's `memos.json` file.
  > The `config` options will store the selected device in the `coc-settings.json` file.

- `dart.analysisExcludedFolders` default: `[]`
  > An array of paths (absolute or relative to each workspace folder) that should be excluded from analysis.

- `dart.enableSdkFormatter` default: `true`
  > When set to false, prevents registration (or unregisters) the SDK formatter. When set to true or not supplied, will register/reregister the SDK formatter.

- `dart.lineLength` default: `80`
  > The number of characters the formatter should wrap code at. If unspecified, code will be wrapped at 80 characters.

- `dart.completeFunctionCalls` default: `true`
  > Completes functions/methods with their required parameters.

- `dart.showTodos` default: `true`
  > Whether to generate diagnostics for TODO comments. If unspecified, diagnostics will not be generated.


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
