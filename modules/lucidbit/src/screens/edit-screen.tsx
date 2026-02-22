import { useCallback, useRef } from 'react'

import { computeKeepRanges, spliceAudio } from '../audio/audio-splicer'
import { wordEditKeyFn } from '../App'
import type { AppAction, AppState, WhisperWord } from '../types'

interface Props {
  state: AppState
  dispatch: React.Dispatch<AppAction>
}

export function EditScreen({ state, dispatch }: Props) {
  const audioCtxRef = useRef<AudioContext | null>(null)
  const sourceRef = useRef<AudioBufferSourceNode | null>(null)

  const isWordDisabled = useCallback(
    (sentenceId: string, wordIndex: number) => {
      const edit = state.wordEdits.get(wordEditKeyFn(sentenceId, wordIndex))
      return edit?.disabled ?? false
    },
    [state.wordEdits],
  )

  function playSentence(sentenceId: string) {
    const sentence = state.sentences.find(s => s.id === sentenceId)
    if (!sentence || !state.audioBuffer) return

    // Stop previous playback
    if (sourceRef.current) {
      sourceRef.current.stop()
    }

    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      audioCtxRef.current = new AudioContext()
    }
    const ctx = audioCtxRef.current
    if (ctx.state === 'suspended') {
      ctx.resume()
    }

    const firstWord = sentence.words[0]
    const lastWord = sentence.words[sentence.words.length - 1]
    if (!firstWord || !lastWord) return

    const start = firstWord.start
    const duration = lastWord.end - start

    const source = ctx.createBufferSource()
    source.buffer = state.audioBuffer
    source.connect(ctx.destination)
    source.start(0, start, duration)
    sourceRef.current = source
  }

  function proceedToPreview() {
    if (!state.audioBuffer) return

    // Build flat list of all kept words with their original indices
    const allKeptWords: WhisperWord[] = []
    for (const sentence of state.sentences) {
      if (sentence.deleted) continue
      sentence.words.forEach((w, i) => {
        if (!isWordDisabled(sentence.id, i)) {
          allKeptWords.push(w)
        }
      })
    }

    const keepRanges = computeKeepRanges(allKeptWords, () => true)
    const { buffer, words } = spliceAudio(state.audioBuffer, keepRanges)

    dispatch({ type: 'SET_SPLICED', audioBuffer: buffer, words })
    dispatch({ type: 'GO_TO_SCREEN', screen: 'preview' })
  }

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>Edit Transcript</h2>
      <p style={{ color: '#aaa', marginBottom: 16, fontSize: 14 }}>
        Click sentences to delete/restore. Click individual words to toggle them.
      </p>

      <div style={{ marginBottom: 24 }}>
        {state.sentences.map(sentence => (
          <div
            key={sentence.id}
            style={{
              padding: '8px 12px',
              marginBottom: 8,
              background: '#1a1a1a',
              borderRadius: 4,
              border: sentence.deleted ? '1px solid #a00' : '1px solid #333',
              opacity: sentence.deleted ? 0.4 : 1,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <button
                onClick={() => dispatch({ type: 'TOGGLE_SENTENCE', sentenceId: sentence.id })}
                style={{
                  padding: '2px 8px',
                  background: sentence.deleted ? '#700' : '#333',
                  color: '#eee',
                  border: 'none',
                  borderRadius: 3,
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                {sentence.deleted ? 'Restore' : 'Delete'}
              </button>
              {!sentence.deleted && (
                <button
                  onClick={() => playSentence(sentence.id)}
                  style={{
                    padding: '2px 8px',
                    background: '#333',
                    color: '#eee',
                    border: 'none',
                    borderRadius: 3,
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  Play
                </button>
              )}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {sentence.words.map((word, wi) => {
                const disabled = isWordDisabled(sentence.id, wi)
                return (
                  <span
                    key={wi}
                    onClick={() => {
                      if (!sentence.deleted) {
                        dispatch({ type: 'TOGGLE_WORD', sentenceId: sentence.id, wordIndex: wi })
                      }
                    }}
                    style={{
                      padding: '2px 4px',
                      borderRadius: 3,
                      cursor: sentence.deleted ? 'default' : 'pointer',
                      background: disabled ? '#400' : 'transparent',
                      textDecoration: disabled ? 'line-through' : 'none',
                      color: disabled ? '#888' : '#eee',
                      fontSize: 14,
                    }}
                  >
                    {word.word}
                  </span>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        <button
          onClick={() => dispatch({ type: 'GO_TO_SCREEN', screen: 'upload' })}
          style={{
            padding: '10px 24px',
            background: '#333',
            color: '#eee',
            border: 'none',
            borderRadius: 4,
            fontSize: 16,
            cursor: 'pointer',
          }}
        >
          Back
        </button>
        <button
          onClick={proceedToPreview}
          style={{
            padding: '10px 24px',
            background: '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            fontSize: 16,
            cursor: 'pointer',
          }}
        >
          Preview
        </button>
      </div>
    </div>
  )
}
