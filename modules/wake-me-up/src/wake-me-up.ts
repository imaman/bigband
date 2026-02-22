#!/usr/bin/env node

import { spawn } from 'child_process'
import path from 'path'

import { formatTargetTime, listPendingAlarms, parseDelayMs, writeAlarmFile } from './utils'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const electronPath: string = require('electron')
const mainScript = path.join(__dirname, 'main.js')

if (process.argv[2] === 'list') {
  const alarms = listPendingAlarms()
  for (const date of alarms) {
    const y = date.getFullYear()
    const mo = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    const h = String(date.getHours()).padStart(2, '0')
    const mi = String(date.getMinutes()).padStart(2, '0')
    process.stdout.write(`${y}-${mo}-${d} ${h}:${mi}\n`)
  }
} else if (process.argv[2] === undefined) {
  const child = spawn(electronPath, ['--no-sandbox', mainScript], {
    detached: true,
    stdio: 'ignore',
  })
  child.unref()
} else {
  const delayMs = parseDelayMs(process.argv)
  const targetTime = new Date(Date.now() + delayMs)

  writeAlarmFile(targetTime)
  process.stdout.write(`will wake you up at ${formatTargetTime(targetTime)}\n`)

  const child = spawn(electronPath, ['--no-sandbox', mainScript, String(delayMs)], {
    detached: true,
    stdio: 'ignore',
  })
  child.unref()
}
