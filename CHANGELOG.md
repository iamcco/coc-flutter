# 1.9.9

- Fixed snippet code completion support with dart 2.18 analyzer.

# 1.9.7

- Fixed #146 where the dart version was not correctly parsed.
  This was caused by dart changing the output of `dart --version` from stderr to stdout.

# 1.9.6

- Fixed #127 by setting the default for `onlyAnalyzeProjectsWithOpenFiles` to `false`.

# 1.9.5

- Fixed #132 hot reload breaking with latest coc.nvim.

# 1.9.4

- Add `flutter.closingLabelPrefix` for custom closing label prefix by #131

# 1.9.3

- Fixed #123 where sdk discovery on windows was not working properly.

# 1.9.2

- The FlutterDevices list now has new actions and also a new default.
  It will now use the `workspaceState` as the default location to store the selected device.
  If you want the previous behavior then you can change the `flutter.devicesDefaultAction` config to `workspaceConfig`.
- Fixed #116 where `resumeNotification` was not called within the same tick when showing a floating notification.

# 1.9.1

- Fixed device loading status if there are no device connected.
- Fixed `foldcolumn` is number which vim and neovim < 0.5.0 and neovim 0.5.0 is string.
- Fixed flutter output channel being empty when reloading the extension.

# 1.9.0

- Added device selection for `flutter.run`.
- FlutterDevices list no longer runs the app but instead selects the device to run on.
- Started tracking changes in this changelog.
