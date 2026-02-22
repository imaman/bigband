import { useRef, useState } from 'react'

import { transcribeAudio } from '../audio/whisper-client'
import type { AppAction, AppState } from '../types'

interface Props {
  state: AppState
  dispatch: React.Dispatch<AppAction>
}

export function UploadScreen({ state, dispatch }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [apiKey, setApiKey] = useState(state.apiKey)

  async function handleUpload() {
    const file = fileRef.current?.files?.[0]
    if (!file) return
    if (!apiKey.trim()) {
      dispatch({ type: 'UPLOAD_ERROR', error: 'Please enter your OpenAI API key' })
      return
    }

    dispatch({ type: 'SET_API_KEY', apiKey: apiKey.trim() })
    dispatch({ type: 'UPLOAD_START' })

    try {
      // Decode audio
      const arrayBuffer = await file.arrayBuffer()
      const audioCtx = new AudioContext()
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer)
      await audioCtx.close()

      // Transcribe
      const rawWords = await transcribeAudio(file, apiKey.trim())

      if (rawWords.length === 0) {
        dispatch({ type: 'UPLOAD_ERROR', error: 'No words detected in the audio.' })
        return
      }

      dispatch({ type: 'UPLOAD_DONE', file, audioBuffer, rawWords })
    } catch (err) {
      dispatch({ type: 'UPLOAD_ERROR', error: String(err) })
    }
  }

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>Upload Audio</h2>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', marginBottom: 4, fontSize: 14, color: '#aaa' }}>OpenAI API Key</label>
        <input
          type="password"
          value={apiKey}
          onChange={e => setApiKey(e.target.value)}
          placeholder="sk-..."
          style={{
            width: '100%',
            padding: '8px 12px',
            background: '#222',
            border: '1px solid #444',
            borderRadius: 4,
            color: '#eee',
            fontSize: 14,
          }}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', marginBottom: 4, fontSize: 14, color: '#aaa' }}>
          Audio File (.mp3, .m4a, .wav)
        </label>
        <input ref={fileRef} type="file" accept=".mp3,.m4a,.wav,audio/*" style={{ fontSize: 14 }} />
      </div>

      <button
        onClick={handleUpload}
        disabled={state.loading}
        style={{
          padding: '10px 24px',
          background: state.loading ? '#555' : '#2563eb',
          color: '#fff',
          border: 'none',
          borderRadius: 4,
          fontSize: 16,
          cursor: state.loading ? 'wait' : 'pointer',
        }}
      >
        {state.loading ? 'Transcribing...' : 'Upload & Transcribe'}
      </button>
    </div>
  )
}
