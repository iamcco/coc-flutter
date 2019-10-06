import {OutputChannel, workspace} from 'coc.nvim';

export type logLevel = 'off' | 'messages' | 'verbose'

let outchannel: OutputChannel | undefined
let traceServer: logLevel

export const logger = {
  init(level: logLevel) {
    traceServer = level
    if (traceServer !== 'off') {
      outchannel = workspace.createOutputChannel('flutter')
    }
  },
  set outchannel(channel: OutputChannel | undefined) {
    outchannel = channel
  },
  get outchannel(): OutputChannel | undefined {
    return outchannel
  },
  get traceServer() : logLevel {
    return traceServer
  },
  getlog(name: string): (message: string | undefined) => void {
    return (message: string | undefined) => {
      (message && outchannel) && outchannel.appendLine(`[${name}]: ${message}`)
    }
  },
  dispose() {
    if (outchannel) {
      outchannel.dispose()
      outchannel = undefined
    }
  }
}
