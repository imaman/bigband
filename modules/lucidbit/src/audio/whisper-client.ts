import { z } from 'zod'

import type { WhisperWord } from '../types'

const WhisperResponseSchema = z.object({
  words: z.array(z.object({ word: z.string(), start: z.number(), end: z.number() })).optional(),
})

export async function transcribeAudio(file: File, apiKey: string): Promise<WhisperWord[]> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('model', 'whisper-1')
  formData.append('response_format', 'verbose_json')
  formData.append('timestamp_granularities[]', 'word')

  const resp = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  })

  if (!resp.ok) {
    const body = await resp.text()
    throw new Error(`Whisper API error ${resp.status}: ${body}`)
  }

  const data = WhisperResponseSchema.parse(await resp.json())
  const raw = data.words ?? []

  // Sanitize: enforce monotonic non-overlapping timestamps
  const words: WhisperWord[] = []
  let prevEnd = 0
  for (const w of raw) {
    const start = Math.max(w.start, prevEnd)
    const end = Math.max(w.end, start + 0.01)
    words.push({ word: w.word, start, end })
    prevEnd = end
  }

  return words
}
