import { failMe } from '../fail-me'
import type { WhisperWord } from '../types'

export interface DisplayWord {
  word: string
  start: number
  end: number
  orpIndex: number
}

/**
 * Calculate the Optimal Recognition Point (ORP) index for a word.
 * Roughly 1/3 into the word, biased toward the start.
 */
export function orpIndex(word: string): number {
  const len = word.length
  if (len <= 1) return 0
  if (len <= 3) return 0
  if (len <= 5) return 1
  return Math.floor(len * 0.3)
}

/**
 * Filter words based on display threshold — skip words whose display
 * duration is shorter than the threshold.
 */
export function applyThreshold(words: WhisperWord[], thresholdMs: number): DisplayWord[] {
  const result: DisplayWord[] = []

  for (let i = 0; i < words.length; i++) {
    const w = words[i] ?? failMe(`word at index ${i} not found`)
    const durationMs = (w.end - w.start) * 1000

    if (durationMs >= thresholdMs) {
      result.push({
        word: w.word.trim(),
        start: w.start,
        end: w.end,
        orpIndex: orpIndex(w.word.trim()),
      })
    } else if (result.length > 0) {
      // Extend previous word's end time to cover the gap
      const prev = result[result.length - 1] ?? failMe('expected previous display word')
      prev.end = w.end
    }
  }

  return result
}

/**
 * Find the currently displayed word given a playback time.
 */
export function findCurrentWord(words: DisplayWord[], time: number): DisplayWord | null {
  for (const w of words) {
    if (time >= w.start && time < w.end) {
      return w
    }
  }
  return null
}
