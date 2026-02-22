import { useEffect, useRef, useState } from 'react'

import { applyThreshold } from '../rsvp/display-rules'
import { exportToMp4 } from '../export/export-pipeline'
import type { AppAction, AppState } from '../types'

interface Props {
  state: AppState
  dispatch: React.Dispatch<AppAction>
}

export function ExportScreen({ state, dispatch }: Props) {
  const [exporting, setExporting] = useState(false)
  const exportedForRef = useRef<AudioBuffer | null>(null)

  const displayWords = applyThreshold(state.splicedWords, state.displayThresholdMs)

  useEffect(() => {
    if (!state.splicedAudioBuffer || state.exportedBlob) return
    if (exportedForRef.current === state.splicedAudioBuffer) return

    exportedForRef.current = state.splicedAudioBuffer
    setExporting(true)

    exportToMp4(state.splicedAudioBuffer, displayWords, progress => {
      dispatch({ type: 'EXPORT_PROGRESS', progress })
    })
      .then(blob => {
        dispatch({ type: 'EXPORT_DONE', blob })
        setExporting(false)
      })
      .catch(err => {
        dispatch({ type: 'EXPORT_ERROR', error: String(err) })
        setExporting(false)
      })
  }, [state.splicedAudioBuffer, state.exportedBlob, displayWords, dispatch])

  function download() {
    if (!state.exportedBlob) return
    const url = URL.createObjectURL(state.exportedBlob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'lucidbit-output.mp4'
    a.click()
    URL.revokeObjectURL(url)
  }

  const pct = Math.round(state.exportProgress * 100)

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>Export</h2>

      {(exporting || state.exportProgress > 0) && !state.exportedBlob && (
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              width: '100%',
              height: 24,
              background: '#222',
              borderRadius: 4,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${pct}%`,
                height: '100%',
                background: '#2563eb',
                transition: 'width 0.2s',
              }}
            />
          </div>
          <p style={{ marginTop: 8, color: '#aaa', fontSize: 14 }}>Encoding... {pct}%</p>
        </div>
      )}

      {state.exportedBlob && (
        <div style={{ marginBottom: 24 }}>
          <p style={{ color: '#4ade80', marginBottom: 12, fontSize: 16 }}>Export complete!</p>
          <button
            onClick={download}
            style={{
              padding: '10px 24px',
              background: '#16a34a',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              fontSize: 16,
              cursor: 'pointer',
            }}
          >
            Download MP4
          </button>
        </div>
      )}

      <div style={{ display: 'flex', gap: 12 }}>
        <button
          onClick={() => dispatch({ type: 'GO_TO_SCREEN', screen: 'preview' })}
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
          Back to Preview
        </button>
        <button
          onClick={() => dispatch({ type: 'RESET' })}
          style={{
            padding: '10px 24px',
            background: '#555',
            color: '#eee',
            border: 'none',
            borderRadius: 4,
            fontSize: 16,
            cursor: 'pointer',
          }}
        >
          Start Over
        </button>
      </div>
    </div>
  )
}
