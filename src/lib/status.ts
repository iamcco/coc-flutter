import { StatusBarItem, window, workspace } from 'coc.nvim';
import { Dispose } from '../util/dispose';

class StatusBar extends Dispose {
  private displayMode = '';
  private isLSPReady = false;
  private statusBar: StatusBarItem | undefined = undefined;
  private currentDevice?: string;
  private loadingDevices?: boolean;

  constructor() {
    super();
    this.displayMode = workspace.getConfiguration('flutter').get<string>('status', '');
  }

  get isInitialized(): boolean {
    return this.statusBar != undefined;
  }

  ready() {
    this.isLSPReady = true;
    this.progress(false);
    // this.show('flutter', false);
  }

  init() {
    this.statusBar = window.createStatusBarItem(0, { progress: false });
    this.push(this.statusBar);

    this.push(
      workspace.registerAutocmd({
        event: 'BufEnter',
        request: false,
        callback: async () => {
          if (this.isLSPReady) {
            const doc = await workspace.document;
            if (doc.filetype === 'dart') {
              if (this.isLSPReady) {
                this.statusBar?.show();
              }
            } else {
              this.hide();
            }
          }
        },
      }),
    );
  }

  updateDevice(name: string | undefined, isLoading: boolean) {
    this.currentDevice = name;
    if (this.displayMode !== 'device') return;
    if (isLoading) {
      this.loadingDevices = true;
      this.show('Loading devices...', true);
    } else if (this.loadingDevices) {
      this.loadingDevices = false;
      this.progress(false);
    } else {
      this.show(this.currentDevice || 'No device available');
    }
  }

  updateUIPath(path: string) {
    if (this.displayMode === 'uipath') this.show(path);
  }

  restartingLsp() {
    this.isLSPReady = false;
    this.loadingDevices = undefined;
    this.currentDevice = undefined;
    this.show('restartingLsp...', true);
  }

  private show(message: string, isProgress?: boolean) {
    if (this.statusBar) {
      this.statusBar.text = message;
      if (isProgress !== undefined) {
        this.statusBar.isProgress = isProgress;
      }
      this.statusBar.show();
    }
  }

  hide() {
    if (this.statusBar) {
      this.statusBar.hide();
    }
  }

  private progress(isProgress = true) {
    if (this.statusBar) {
      this.statusBar.isProgress = isProgress;
      if (!isProgress && this.loadingDevices != undefined) {
        this.show(this.currentDevice || 'No device available');
      } else {
        this.hide();
      }
    }
  }

  dispose() {
    super.dispose();
    this.statusBar = undefined;
  }
}

export const statusBar = new StatusBar();
