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
