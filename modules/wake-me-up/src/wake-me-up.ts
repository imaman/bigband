export function parseDelayMs(argv: readonly string[]): number {
  const raw = argv[2]
  if (raw === undefined) {
    throw new Error('Usage: wake-me-up <duration> (e.g., 13, 13m, 30s)')
  }

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

export function formatTargetTime(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0')
  const mins = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${mins}`
}
