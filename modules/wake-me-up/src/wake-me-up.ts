#!/usr/bin/env node

import { spawn } from 'child_process'
import electron from 'electron'
import path from 'path'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

import { formatTargetTime, parseDuration } from './utils'

const electronPath = String(electron)
const mainScript = path.join(__dirname, 'main.js')

function spawnElectron(args: string[]): void {
  const child = spawn(electronPath, ['--no-sandbox', mainScript, ...args], {
    detached: true,
    stdio: 'ignore',
  })
  child.unref()
}

yargs(hideBin(process.argv))
  .command(
    '* [duration]',
    'Set a wake-up alarm (opens scheduler UI if no duration given)',
    y => y.positional('duration', { type: 'string', describe: 'e.g. 10s, 13m, 0.5' }),
    argv => {
      if (!argv.duration) {
        spawnElectron([])
      } else {
        const delayMs = parseDuration(argv.duration)
        const targetTime = new Date(Date.now() + delayMs)
        process.stdout.write(`will wake you up at ${formatTargetTime(targetTime)}\n`)
        spawnElectron([String(delayMs)])
      }
    },
  )
  .strict()
  .help()
  .parse()
