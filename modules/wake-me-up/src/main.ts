// eslint-disable-next-line @typescript-eslint/no-var-requires
const { app, BrowserWindow, ipcMain } = require('electron')

import fs from 'fs'
import path from 'path'

import { generateNotificationHtml } from './notification-html'
import { generateSchedulerHtml } from './scheduler-html'
import { formatTargetTime, parseDuration } from './utils'

app.setName('wake-me-up')

let timerPending = false

function appendLog(message: string): void {
  const logDir = path.join(app.getPath('logs'))
  fs.mkdirSync(logDir, { recursive: true })
  const d = new Date()
  const date = [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join(
    '-',
  )
  const time = [d.getHours(), d.getMinutes(), d.getSeconds()].map(n => String(n).padStart(2, '0')).join(':')
  fs.appendFileSync(path.join(logDir, 'ledger.log'), `${date} ${time} ${message}\n`)
}

function showNotification(delayMs: number): void {
  timerPending = true
  const fireAt = new Date(Date.now() + delayMs)
  appendLog(`scheduled wake-at=${fireAt.toISOString()}`)

  setTimeout(() => {
    timerPending = false
    const now = new Date()
    const timeString = formatTargetTime(now)
    appendLog(`bell time=${timeString}`)
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

  }, delayMs)
}

function showScheduler(): void {
  const html = generateSchedulerHtml()

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

  ipcMain.on('schedule', (_event: unknown, raw: string) => {
    const delayMs = parseDuration(raw)
    win.close()
    showNotification(delayMs)
  })
}

const lastArg = process.argv[process.argv.length - 1]
const delayMs = Number(lastArg)
const isTimerMode = Number.isFinite(delayMs) && delayMs > 0

ipcMain.on('dismiss', () => {
  app.quit()
})

app.on('ready', () => {
  // Hide dock icon on macOS so it stays invisible until notification
  if (app.dock) {
    app.dock.hide()
  }

  if (isTimerMode) {
    showNotification(delayMs)
  } else {
    showScheduler()
  }
})

app.on('window-all-closed', () => {
  if (!timerPending) {
    app.quit()
  }
})
