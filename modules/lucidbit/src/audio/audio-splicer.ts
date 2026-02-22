import { failMe } from '../fail-me'
import type { WhisperWord } from '../types'

interface KeepRange {
  start: number
  end: number
  words: WhisperWord[]
}

const CROSSFADE_DURATION = 0.03 // 30ms

export function computeKeepRanges(
  words: WhisperWord[],
  isWordKept: (word: WhisperWord, index: number) => boolean,
): KeepRange[] {
  const ranges: KeepRange[] = []
  let currentRange: KeepRange | null = null

  for (let i = 0; i < words.length; i++) {
    const w = words[i] ?? failMe(`word at index ${i} not found`)
    if (isWordKept(w, i)) {
      if (currentRange && w.start - currentRange.end < 0.1) {
        // Extend current range
        currentRange.end = w.end
        currentRange.words.push(w)
      } else {
        // Start new range
        currentRange = { start: w.start, end: w.end, words: [w] }
        ranges.push(currentRange)
      }
    } else {
      currentRange = null
    }
  }

  return ranges
}

export function spliceAudio(
  audioBuffer: AudioBuffer,
  keepRanges: KeepRange[],
): { buffer: AudioBuffer; words: WhisperWord[] } {
  if (keepRanges.length === 0) {
    const ctx = new OfflineAudioContext(audioBuffer.numberOfChannels, 1, audioBuffer.sampleRate)
    // Return a tiny silent buffer
    return { buffer: ctx.createBuffer(audioBuffer.numberOfChannels, 1, audioBuffer.sampleRate), words: [] }
  }

  const sampleRate = audioBuffer.sampleRate
  const numChannels = audioBuffer.numberOfChannels
  const crossfadeSamples = Math.floor(CROSSFADE_DURATION * sampleRate)

  // Calculate total output length
  let totalSamples = 0
  for (const range of keepRanges) {
    const rangeSamples = Math.floor((range.end - range.start) * sampleRate)
    totalSamples += rangeSamples
  }

  const outputBuffer = new AudioBuffer({
    numberOfChannels: numChannels,
    length: Math.max(totalSamples, 1),
    sampleRate,
  })

  let writeOffset = 0
  let timeOffset = 0
  const newWords: WhisperWord[] = []

  for (let r = 0; r < keepRanges.length; r++) {
    const range = keepRanges[r] ?? failMe(`keepRange at index ${r} not found`)
    const rangeStartSample = Math.floor(range.start * sampleRate)
    const rangeSamples = Math.floor((range.end - range.start) * sampleRate)
    const rangeTimeOffset = timeOffset - range.start

    for (let ch = 0; ch < numChannels; ch++) {
      const input = audioBuffer.getChannelData(ch)
      const output = outputBuffer.getChannelData(ch)

      for (let i = 0; i < rangeSamples; i++) {
        const srcIdx = rangeStartSample + i
        if (srcIdx < input.length) {
          let sample = input[srcIdx] ?? failMe(`audio sample at ${srcIdx} not found`)

          // Fade in at the start of each range (except the first)
          if (r > 0 && i < crossfadeSamples) {
            sample *= i / crossfadeSamples
          }

          // Fade out at the end of each range (except the last)
          if (r < keepRanges.length - 1 && i >= rangeSamples - crossfadeSamples) {
            const fadePos = rangeSamples - i
            sample *= fadePos / crossfadeSamples
          }

          const outIdx = writeOffset + i
          if (outIdx < output.length) {
            output[outIdx] = sample
          }
        }
      }
    }

    // Remap word timestamps
    for (const w of range.words) {
      newWords.push({
        word: w.word,
        start: w.start + rangeTimeOffset,
        end: w.end + rangeTimeOffset,
      })
    }

    writeOffset += rangeSamples
    timeOffset += range.end - range.start
  }

  return { buffer: outputBuffer, words: newWords }
}
