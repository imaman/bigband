#!/usr/bin/env node

import { spawn } from 'child_process'
import path from 'path'

import { formatTargetTime, parseDelayMs } from './wake-me-up'

const delayMs = parseDelayMs(process.argv)
const targetTime = new Date(Date.now() + delayMs)

process.stdout.write(`will wake you up at ${formatTargetTime(targetTime)}\n`)

// eslint-disable-next-line @typescript-eslint/no-var-requires
const electronPath: string = require('electron')
const mainScript = path.join(__dirname, 'main.js')

const child = spawn(electronPath, ['--no-sandbox', mainScript, String(delayMs)], {
  detached: true,
  stdio: 'ignore',
})
child.unref()
