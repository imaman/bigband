import fs from 'fs'
import os from 'os'
import path from 'path'

export function parseDuration(raw: string): number {
  const match = raw.match(/^(\d+(?:\.\d+)?)(s|m)?$/)
  if (!match) {
    throw new Error(`Invalid duration: ${raw}`)
  }

  const value = Number(match[1])
  if (value <= 0) {
    throw new Error(`Expected a positive duration, got: ${raw}`)
  }

  const unit = match[2] ?? 'm'
  return unit === 's' ? value * 1_000 : value * 60_000
}

export function parseDelayMs(argv: readonly string[]): number {
  const raw = argv[2]
  if (raw === undefined) {
    throw new Error('Usage: wake-me-up <duration> (e.g., 13, 13m, 30s)')
  }

  return parseDuration(raw)
}

export function formatTargetTime(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0')
  const mins = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${mins}`
}

function hasCode(e: object): e is { code: unknown } {
  return 'code' in e
}

function isEnoent(e: unknown): boolean {
  return typeof e === 'object' && e !== null && hasCode(e) && e.code === 'ENOENT'
}

export function alarmsDir(): string {
  return path.join(os.homedir(), '.config', 'wake-me-up', 'alarms')
}

export function alarmFileName(date: Date): string {
  return date.toISOString().replace(/:/g, '-')
}

export function parseAlarmFileName(name: string): Date {
  // The ISO string has format like 2026-02-22T14-30-00.000Z
  // We need to restore colons in the time portion (positions after the T)
  const tIndex = name.indexOf('T')
  const datePart = name.slice(0, tIndex + 1)
  const timePart = name.slice(tIndex + 1).replace(/-/g, ':')
  return new Date(datePart + timePart)
}

export function writeAlarmFile(date: Date, dir?: string): void {
  const d = dir ?? alarmsDir()
  fs.mkdirSync(d, { recursive: true })
  fs.writeFileSync(path.join(d, alarmFileName(date)), '')
}

export function removeAlarmFile(date: Date, dir?: string): void {
  const d = dir ?? alarmsDir()
  try {
    fs.unlinkSync(path.join(d, alarmFileName(date)))
  } catch (e: unknown) {
    if (isEnoent(e)) {
      return
    }
    throw e
  }
}

export function removeExpiredAlarms(dir?: string): void {
  const d = dir ?? alarmsDir()
  let entries: string[]
  try {
    entries = fs.readdirSync(d)
  } catch (e: unknown) {
    if (isEnoent(e)) {
      return
    }
    throw e
  }

  const now = new Date()
  for (const name of entries) {
    const date = parseAlarmFileName(name)
    if (date.getTime() <= now.getTime()) {
      fs.unlinkSync(path.join(d, name))
    }
  }
}

export function listPendingAlarms(dir?: string): Date[] {
  const d = dir ?? alarmsDir()
  let entries: string[]
  try {
    entries = fs.readdirSync(d)
  } catch (e: unknown) {
    if (isEnoent(e)) {
      return []
    }
    throw e
  }

  const now = new Date()
  return entries
    .map(name => parseAlarmFileName(name))
    .filter(date => date.getTime() > now.getTime())
    .sort((a, b) => a.getTime() - b.getTime())
}
