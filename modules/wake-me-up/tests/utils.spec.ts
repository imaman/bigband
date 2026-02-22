import fs from 'fs'
import os from 'os'
import path from 'path'

import {
  alarmFileName,
  formatTargetTime,
  listPendingAlarms,
  parseAlarmFileName,
  parseDelayMs,
  parseDuration,
  removeAlarmFile,
  removeExpiredAlarms,
  writeAlarmFile,
} from '../src/utils'

describe('wake-me-up', () => {
  describe('parseDuration', () => {
    test('bare number is treated as minutes', () => {
      expect(parseDuration('13')).toBe(13 * 60_000)
    })

    test('explicit m suffix is treated as minutes', () => {
      expect(parseDuration('13m')).toBe(13 * 60_000)
    })

    test('s suffix is treated as seconds', () => {
      expect(parseDuration('30s')).toBe(30 * 1_000)
    })

    test('fractional minutes', () => {
      expect(parseDuration('0.5')).toBe(0.5 * 60_000)
    })

    test('fractional seconds', () => {
      expect(parseDuration('1.5s')).toBe(1.5 * 1_000)
    })

    test('throws on non-numeric input', () => {
      expect(() => parseDuration('abc')).toThrow('Invalid duration: abc')
    })

    test('throws on zero', () => {
      expect(() => parseDuration('0')).toThrow('Expected a positive duration, got: 0')
    })

    test('throws on zero seconds', () => {
      expect(() => parseDuration('0s')).toThrow('Expected a positive duration, got: 0s')
    })

    test('throws on negative number', () => {
      expect(() => parseDuration('-5')).toThrow('Invalid duration: -5')
    })

    test('throws on unknown unit', () => {
      expect(() => parseDuration('5h')).toThrow('Invalid duration: 5h')
    })
  })

  describe('parseDelayMs', () => {
    test('extracts duration from argv[2]', () => {
      expect(parseDelayMs(['node', 'cli.js', '13'])).toBe(13 * 60_000)
    })

    test('throws on missing argument', () => {
      expect(() => parseDelayMs(['node', 'cli.js'])).toThrow('Usage: wake-me-up <duration>')
    })
  })

  describe('formatTargetTime', () => {
    test('formats a time with zero-padded hours and minutes', () => {
      const date = new Date(2026, 1, 21, 9, 5)
      expect(formatTargetTime(date)).toBe('09:05')
    })

    test('formats afternoon time', () => {
      const date = new Date(2026, 1, 21, 14, 30)
      expect(formatTargetTime(date)).toBe('14:30')
    })

    test('formats midnight', () => {
      const date = new Date(2026, 1, 21, 0, 0)
      expect(formatTargetTime(date)).toBe('00:00')
    })

    test('formats end of day', () => {
      const date = new Date(2026, 1, 21, 23, 59)
      expect(formatTargetTime(date)).toBe('23:59')
    })
  })

  describe('alarmFileName', () => {
    test('produces ISO-like format with dashes replacing colons', () => {
      const date = new Date('2026-02-22T14:30:00.000Z')
      expect(alarmFileName(date)).toBe('2026-02-22T14-30-00.000Z')
    })

    test('contains no colons', () => {
      const date = new Date('2026-12-31T23:59:59.999Z')
      expect(alarmFileName(date)).not.toContain(':')
    })
  })

  describe('parseAlarmFileName', () => {
    test('roundtrips with alarmFileName', () => {
      const original = new Date('2026-02-22T14:30:00.000Z')
      const name = alarmFileName(original)
      const parsed = parseAlarmFileName(name)
      expect(parsed.getTime()).toBe(original.getTime())
    })

    test('roundtrips with a different date', () => {
      const original = new Date('2025-06-15T08:05:30.123Z')
      const name = alarmFileName(original)
      const parsed = parseAlarmFileName(name)
      expect(parsed.getTime()).toBe(original.getTime())
    })
  })

  describe('alarm file operations', () => {
    let tmpDir: string

    beforeEach(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wake-me-up-test-'))
    })

    afterEach(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    })

    describe('writeAlarmFile', () => {
      test('creates a file with the correct name', () => {
        const date = new Date('2026-02-22T14:30:00.000Z')
        writeAlarmFile(date, tmpDir)
        const files = fs.readdirSync(tmpDir)
        expect(files).toEqual(['2026-02-22T14-30-00.000Z'])
      })

      test('created file is empty', () => {
        const date = new Date('2026-02-22T14:30:00.000Z')
        writeAlarmFile(date, tmpDir)
        const content = fs.readFileSync(path.join(tmpDir, alarmFileName(date)), 'utf-8')
        expect(content).toBe('')
      })
    })

    describe('removeAlarmFile', () => {
      test('removes an existing alarm file', () => {
        const date = new Date('2026-02-22T14:30:00.000Z')
        writeAlarmFile(date, tmpDir)
        removeAlarmFile(date, tmpDir)
        expect(fs.readdirSync(tmpDir)).toEqual([])
      })

      test('does not throw if file does not exist', () => {
        const date = new Date('2026-02-22T14:30:00.000Z')
        expect(() => removeAlarmFile(date, tmpDir)).not.toThrow()
      })
    })

    describe('listPendingAlarms', () => {
      test('returns sorted array of future dates', () => {
        const future1 = new Date(Date.now() + 3_600_000)
        const future2 = new Date(Date.now() + 7_200_000)
        const future3 = new Date(Date.now() + 1_800_000)
        writeAlarmFile(future1, tmpDir)
        writeAlarmFile(future2, tmpDir)
        writeAlarmFile(future3, tmpDir)

        const result = listPendingAlarms(tmpDir)
        expect(result).toHaveLength(3)
        expect(result[0].getTime()).toBe(future3.getTime())
        expect(result[1].getTime()).toBe(future1.getTime())
        expect(result[2].getTime()).toBe(future2.getTime())
      })

      test('excludes past dates', () => {
        const past = new Date(Date.now() - 3_600_000)
        const future = new Date(Date.now() + 3_600_000)
        writeAlarmFile(past, tmpDir)
        writeAlarmFile(future, tmpDir)

        const result = listPendingAlarms(tmpDir)
        expect(result).toHaveLength(1)
        expect(result[0].getTime()).toBe(future.getTime())
      })

      test('returns empty array if directory does not exist', () => {
        const nonExistent = path.join(tmpDir, 'does-not-exist')
        expect(listPendingAlarms(nonExistent)).toEqual([])
      })
    })

    describe('removeExpiredAlarms', () => {
      test('removes past alarm files and keeps future ones', () => {
        const past1 = new Date(Date.now() - 3_600_000)
        const past2 = new Date(Date.now() - 7_200_000)
        const future = new Date(Date.now() + 3_600_000)
        writeAlarmFile(past1, tmpDir)
        writeAlarmFile(past2, tmpDir)
        writeAlarmFile(future, tmpDir)

        removeExpiredAlarms(tmpDir)

        const remaining = fs.readdirSync(tmpDir)
        expect(remaining).toEqual([alarmFileName(future)])
      })

      test('does not throw if directory does not exist', () => {
        const nonExistent = path.join(tmpDir, 'does-not-exist')
        expect(() => removeExpiredAlarms(nonExistent)).not.toThrow()
      })
    })
  })
})
