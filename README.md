# coc-flutter

Flutter support for (Neo)vim

![2019-10-07 23-31-40 2019-10-08 00_04_07](https://user-images.githubusercontent.com/5492542/66328510-58a6c480-e95f-11e9-95ca-0b4ed7c8e83f.gif)

## Features

- LSP features is power by [analysis_server](https://github.com/dart-lang/sdk/blob/master/pkg/analysis_server/tool/lsp_spec/README.md)
- Automatically finds SDKs from PATH
- Automatic hot reloads on save
- Support flutter dev server
- Snippet enhance `flutter.provider.enableSnippet`

## Install

`:CocInstall coc-flutter`

## Settings

- `flutter.trace.server` Trace level of log
- `flutter.enabled` Enable coc-flutter extension
- `flutter.lsp.debug` Enable debug for language server
- `flutter.sdk.dart-command` dart command
- `flutter.provider.hot-reload` Enable hot reload after save
- `flutter.provider.enableSnippet` Enable completion item snippet
  - `import '';` => `import '${1}';${0}`
  - `someName(…)` => `someName(${1})${0}`
  - `setState(() {});` => `setState(() {\n\t${1}\n});${0}`

## Commands

Open flutter only commands list: `CocList --input=flutter commands`

**Global Commands**:

- `flutter.run` Run flutter server
- `flutter.createProject` Create flutter project using: flutter create project-name
- `flutter.doctor` Run: flutter doctor
- `flutter.upgrade` Run: flutter upgrade

**Dev Server Commands**:

> available when dev server running

- `flutter.quit` Quit server
- `flutter.detach` Detach server
- `flutter.hotReload` Hot reload
- `flutter.hotRestart` Hot restart
- `flutter.screenshot` To save a screenshot to flutter.png
- `flutter.openProfiler` Open observatory debugger and profiler web page
- `flutter.debugDumpAPP` You can dump the widget hierarchy of the app (debugDumpApp)
- `flutter.elevationChecker` To toggle the elevation checker
- `flutter.debugDumpLayerTree` For layers (debugDumpLayerTree)
- `flutter.debugDumpRenderTree` To dump the rendering tree of the app (debugDumpRenderTree)
- `flutter.debugPaintSizeEnabled` To toggle the display of construction lines (debugPaintSizeEnabled)
- `flutter.defaultTargetPlatform` To simulate different operating systems, (defaultTargetPlatform)
- `flutter.showPerformanceOverlay` To display the performance overlay (WidgetsApp.showPerformanceOverlay)
- `flutter.debugProfileWidgetBuilds` To enable timeline events for all widget build methods, (debugProfileWidgetBuilds)
- `flutter.showWidgetInspectorOverride` To toggle the widget inspector (WidgetsApp.showWidgetInspectorOverride)
- `flutter.debugDumpSemanticsHitTestOrder` Accessibility (debugDumpSemantics) for inverse hit test order
- `flutter.debugDumpSemanticsTraversalOrder` Accessibility (debugDumpSemantics) for traversal order

## TODO

- [x] analysis server
- [ ] coc-list
  - [ ] devices list by `flutter devices`
- [ ] watch pubspec.yaml and update package
  - flutter pub get
- [ ] flutter commands
  - [ ] `flutter create project-name`
  - [x] `flutter doctor`
  - [x] `flutter upgrade`
- [x] hot-reload after save
- [ ] dev server output notification optimize
