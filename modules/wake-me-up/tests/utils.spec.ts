import { formatTargetTime, parseDuration, parseDelayMs } from '../src/utils'

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


})
