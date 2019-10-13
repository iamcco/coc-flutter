# ![](https://flutter.dev/images/favicon.png) coc-flutter

Flutter support for (Neo)vim

![2019-10-07 23-31-40 2019-10-08 00_04_07](https://user-images.githubusercontent.com/5492542/66328510-58a6c480-e95f-11e9-95ca-0b4ed7c8e83f.gif)

## Features

- LSP features is power by [analysis_server](https://github.com/dart-lang/sdk/blob/master/pkg/analysis_server/tool/lsp_spec/README.md)
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

## coc-list sources

- FlutterDevices
  > `:CocList FlutterDevices`
- FlutterEmulators
  > `:CocList FlutterEmulators`


## Settings

- `flutter.trace.server` Trace level of log, default: `off`
- `flutter.enabled` Enable coc-flutter extension, default: `true`
- `flutter.lsp.debug` Enable debug for language server, default: `false`
- `flutter.sdk.dart-command` dart command, default: `dart`
- `flutter.provider.hot-reload` Enable hot reload after save, default: `true`
  > only when there are no errors for the save file
- `flutter.provider.enableSnippet` Enable completion item snippet, default: true
  - `import '';` => `import '${1}';${0}`
  - `someName(…)` => `someName(${1})${0}`
  - `setState(() {});` => `setState(() {\n\t${1}\n});${0}`

## Commands

Open flutter only commands list: `CocList --input=flutter commands`

**Global Commands**:

- `flutter.run` Run flutter dev server
- `flutter.create` Create flutter project using: `flutter create`
- `flutter.doctor` Run: `flutter doctor`
- `flutter.upgrade` Run: `flutter upgrade`
- `flutter.pub.get` Run: `flutter pub get`
- `flutter.devices` open devices list
- `flutter.emulators` open emulators list

**Dev Server Commands**:

> available when dev server running

- `flutter.dev.quit` Quit server
- `flutter.dev.detach` Detach server
- `flutter.dev.hotReload` Hot reload
- `flutter.dev.hotRestart` Hot restart
- `flutter.dev.screenshot` To save a screenshot to flutter.png
- `flutter.dev.openDevLog` Open flutter dev server log
- `flutter.dev.openProfiler` Open observatory debugger and profiler web page
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

### Buy Me A Coffee ☕️

![btc](https://img.shields.io/keybase/btc/iamcco.svg?style=popout-square)

![image](https://user-images.githubusercontent.com/5492542/42771079-962216b0-8958-11e8-81c0-520363ce1059.png)
