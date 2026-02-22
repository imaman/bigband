// eslint-disable-next-line @typescript-eslint/no-var-requires
const { app, BrowserWindow, ipcMain, Tray, Menu } = require('electron')

import fs from 'fs'
import os from 'os'
import path from 'path'

import {
  alarmFileExists,
  alarmsDir,
  formatTargetTime,
  listPendingAlarms,
  parseDuration,
  removeAlarmFile,
  removeExpiredAlarms,
} from './utils'

const moduleRoot = path.join(__dirname, '..', '..')
const iconPath = path.join(moduleRoot, 'icon.png')
const trayPidPath = path.join(os.homedir(), '.config', 'wake-me-up', 'tray.pid')

app.setName('wake-me-up')

let timerPending = false
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let tray: any = null
let isTrayOwner = false
let alarmTimeout: ReturnType<typeof setTimeout> | null = null
let currentFireAt: Date | null = null
let alarmsWatcher: fs.FSWatcher | null = null
let pidWatcher: fs.FSWatcher | null = null

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

function tryClaimTray(): boolean {
  const dir = path.dirname(trayPidPath)
  fs.mkdirSync(dir, { recursive: true })

  try {
    const content = fs.readFileSync(trayPidPath, 'utf-8')
    const pid = Number(content.trim())
    if (Number.isFinite(pid) && pid !== process.pid && isProcessAlive(pid)) {
      return false
    }
  } catch {
    // File doesn't exist — we can claim
  }

  fs.writeFileSync(trayPidPath, String(process.pid))
  return true
}

function releaseTrayOwnership(): void {
  isTrayOwner = false
  try {
    const content = fs.readFileSync(trayPidPath, 'utf-8')
    if (content.trim() === String(process.pid)) {
      fs.unlinkSync(trayPidPath)
    }
  } catch {
    // ignore
  }
}

function rebuildTrayMenu(): void {
  if (!tray) {
    return
  }
  const alarms = listPendingAlarms()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const menuItems: any[] = []

  if (alarms.length === 0) {
    menuItems.push({ label: 'No pending alarms', enabled: false })
  } else {
    for (const date of alarms) {
      menuItems.push({ label: `Alarm: ${formatTargetTime(date)}`, enabled: false })
    }
    menuItems.push({ type: 'separator' })
    for (const date of alarms) {
      const timeLabel = formatTargetTime(date)
      menuItems.push({
        label: `Cancel ${timeLabel}`,
        click: () => cancelAlarm(date),
      })
    }
  }

  const tooltip =
    alarms.length > 0 ? `Wake at ${alarms.map(d => formatTargetTime(d)).join(', ')}` : 'wake-me-up'
  tray.setToolTip(tooltip)
  tray.setContextMenu(Menu.buildFromTemplate(menuItems))
}

function cancelAlarm(date: Date): void {
  removeAlarmFile(date)

  // If this is our own alarm, clear the timer
  if (currentFireAt && date.getTime() === currentFireAt.getTime()) {
    if (alarmTimeout) {
      clearTimeout(alarmTimeout)
    }
    alarmTimeout = null
    currentFireAt = null
    timerPending = false
  }

  // Menu will rebuild via fs.watch, but also check if we should quit
  if (listPendingAlarms().length === 0 && !timerPending) {
    app.quit()
  }
}

function watchAlarmsDir(): void {
  const dir = alarmsDir()
  fs.mkdirSync(dir, { recursive: true })
  alarmsWatcher = fs.watch(dir, () => {
    rebuildTrayMenu()
    if (listPendingAlarms().length === 0 && !timerPending) {
      app.quit()
    }
  })
}

function watchPidFile(): void {
  const dir = path.dirname(trayPidPath)
  fs.mkdirSync(dir, { recursive: true })
  pidWatcher = fs.watch(dir, (_eventType, filename) => {
    if (filename !== path.basename(trayPidPath)) {
      return
    }
    if (isTrayOwner || listPendingAlarms().length === 0) {
      return
    }
    if (!tryClaimTray()) {
      return
    }
    if (pidWatcher) {
      pidWatcher.close()
      pidWatcher = null
    }
    isTrayOwner = true
    tray = new Tray(iconPath)
    rebuildTrayMenu()
    watchAlarmsDir()
  })
}

function setupTray(): void {
  if (!tryClaimTray()) {
    watchPidFile()
    return
  }

  isTrayOwner = true
  tray = new Tray(iconPath)
  rebuildTrayMenu()
  watchAlarmsDir()
}

function destroyTray(): void {
  if (alarmsWatcher) {
    alarmsWatcher.close()
    alarmsWatcher = null
  }
  if (pidWatcher) {
    pidWatcher.close()
    pidWatcher = null
  }
  if (tray) {
    tray.destroy()
    tray = null
  }
  if (isTrayOwner) {
    releaseTrayOwnership()
  }
}

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
  currentFireAt = fireAt
  appendLog(`scheduled wake-at=${fireAt.toISOString()}`)
  setupTray()

  alarmTimeout = setTimeout(() => {
    timerPending = false
    alarmTimeout = null
    currentFireAt = null

    // If alarm was cancelled externally (via another process's tray), skip notification
    if (!alarmFileExists(fireAt)) {
      if (isTrayOwner && listPendingAlarms().length > 0) {
        return
      }
      app.quit()
      return
    }

    removeAlarmFile(fireAt)
    const now = new Date()
    const timeString = formatTargetTime(now)
    appendLog(`bell time=${timeString}`)

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

    win.loadFile(path.join(moduleRoot, 'notification.html'), { query: { time: timeString } })
    win.show()
    win.focus()
  }, delayMs)
}

function showScheduler(): void {
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

  win.loadFile(path.join(moduleRoot, 'scheduler.html'))
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
  // If we're tray owner with other pending alarms, just close windows but stay alive
  if (isTrayOwner && listPendingAlarms().length > 0) {
    for (const w of BrowserWindow.getAllWindows()) {
      w.close()
    }
    return
  }
  app.quit()
})

app.on('ready', () => {
  removeExpiredAlarms()

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
  if (timerPending) {
    return
  }
  if (isTrayOwner && listPendingAlarms().length > 0) {
    return
  }
  app.quit()
})

app.on('will-quit', () => {
  destroyTray()
})
