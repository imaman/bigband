// eslint-disable-next-line @typescript-eslint/no-var-requires
const { app, BrowserWindow, ipcMain } = require('electron')

import { generateNotificationHtml } from './notification-html'
import { formatTargetTime } from './wake-me-up'

const delayMs = Number(process.argv[2])

app.on('ready', () => {
  // Hide dock icon on macOS so it stays invisible until notification
  if (app.dock) {
    app.dock.hide()
  }

  setTimeout(() => {
    const now = new Date()
    const timeString = formatTargetTime(now)
    const html = generateNotificationHtml(timeString)

    const win = new BrowserWindow({
      width: 480,
      height: 340,
      frame: false,
      alwaysOnTop: true,
      resizable: false,
      skipTaskbar: false,
      center: true,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      },
    })

    win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
    win.show()
    win.focus()

    ipcMain.on('dismiss', () => {
      app.quit()
    })
  }, delayMs)
})

app.on('window-all-closed', () => {
  app.quit()
})
