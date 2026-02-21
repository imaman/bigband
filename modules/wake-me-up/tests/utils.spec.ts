import { generateNotificationHtml } from '../src/notification-html'
import { generateSchedulerHtml } from '../src/scheduler-html'
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

  describe('generateNotificationHtml', () => {
    test('returns HTML containing the time string', () => {
      const html = generateNotificationHtml('14:30')
      expect(html).toContain('14:30')
    })

    test('returns HTML with dismiss button', () => {
      const html = generateNotificationHtml('09:00')
      expect(html).toContain('id="dismiss"')
    })

    test("returns HTML with Time's up message", () => {
      const html = generateNotificationHtml('09:00')
      expect(html).toContain("Time's up!")
    })

    test('returns a complete HTML document', () => {
      const html = generateNotificationHtml('12:00')
      expect(html).toContain('<!DOCTYPE html>')
      expect(html).toContain('</html>')
    })
  })

  describe('generateSchedulerHtml', () => {
    test('returns a complete HTML document', () => {
      const html = generateSchedulerHtml()
      expect(html).toContain('<!DOCTYPE html>')
      expect(html).toContain('</html>')
    })

    test('returns HTML with duration input field', () => {
      const html = generateSchedulerHtml()
      expect(html).toContain('id="duration"')
    })

    test('returns HTML with start button', () => {
      const html = generateSchedulerHtml()
      expect(html).toContain('id="start"')
    })

    test('sends schedule IPC message on submit', () => {
      const html = generateSchedulerHtml()
      expect(html).toContain("ipcRenderer.send('schedule'")
    })
  })
})
