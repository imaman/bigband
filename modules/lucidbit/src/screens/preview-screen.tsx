import { useCallback, useEffect, useRef, useState } from 'react'

import { applyThreshold, findCurrentWord } from '../rsvp/display-rules'
import { renderRsvpFrame } from '../rsvp/rsvp-renderer'
import type { AppAction, AppState } from '../types'

interface Props {
  state: AppState
  dispatch: React.Dispatch<AppAction>
}

const CANVAS_WIDTH = 1080
const CANVAS_HEIGHT = 1920
const DISPLAY_SCALE = 0.25 // Show at 25% size in UI

export function PreviewScreen({ state, dispatch }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const sourceRef = useRef<AudioBufferSourceNode | null>(null)
  const startTimeRef = useRef<number>(0)
  const rafRef = useRef<number>(0)
  const [playing, setPlaying] = useState(false)

  const displayWords = applyThreshold(state.splicedWords, state.displayThresholdMs)

  const draw = useCallback(
    (time: number) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const word = findCurrentWord(displayWords, time)
      renderRsvpFrame(ctx, word, { width: CANVAS_WIDTH, height: CANVAS_HEIGHT })
    },
    [displayWords],
  )

  const animate = useCallback(() => {
    const ctx = audioCtxRef.current
    if (!ctx || !playing) return

    const elapsed = ctx.currentTime - startTimeRef.current
    draw(elapsed)

    // Check if playback is done
    if (state.splicedAudioBuffer && elapsed >= state.splicedAudioBuffer.duration) {
      setPlaying(false)
      draw(0) // Reset to blank
      return
    }

    rafRef.current = requestAnimationFrame(animate)
  }, [playing, draw, state.splicedAudioBuffer])

  useEffect(() => {
    if (playing) {
      rafRef.current = requestAnimationFrame(animate)
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [playing, animate])

  // Draw initial blank frame
  useEffect(() => {
    draw(0)
  }, [draw])

  function play() {
    if (!state.splicedAudioBuffer) return

    // Stop previous
    stop()

    const ctx = new AudioContext()
    audioCtxRef.current = ctx

    const source = ctx.createBufferSource()
    source.buffer = state.splicedAudioBuffer
    source.connect(ctx.destination)
    source.onended = () => setPlaying(false)
    source.start()
    sourceRef.current = source
    startTimeRef.current = ctx.currentTime
    setPlaying(true)
  }

  function stop() {
    if (sourceRef.current) {
      try {
        sourceRef.current.stop()
      } catch (_) {
        /* already stopped */
      }
      sourceRef.current = null
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close()
      audioCtxRef.current = null
    }
    setPlaying(false)
  }

  function restart() {
    stop()
    // Small delay to let the audio context close
    setTimeout(play, 50)
  }

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>Preview</h2>

      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
        <label style={{ fontSize: 14, color: '#aaa' }}>Display threshold: {state.displayThresholdMs}ms</label>
        <input
          type="range"
          min={50}
          max={500}
          step={10}
          value={state.displayThresholdMs}
          onChange={e => dispatch({ type: 'SET_THRESHOLD', thresholdMs: Number(e.target.value) })}
          style={{ flex: 1 }}
        />
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: 16,
          background: '#000',
          borderRadius: 8,
          overflow: 'hidden',
        }}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          style={{
            width: CANVAS_WIDTH * DISPLAY_SCALE,
            height: CANVAS_HEIGHT * DISPLAY_SCALE,
          }}
        />
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <button
          onClick={() => {
            stop()
            dispatch({ type: 'GO_TO_SCREEN', screen: 'edit' })
          }}
          style={btnStyle('#333')}
        >
          Back
        </button>
        {!playing ? (
          <button onClick={play} style={btnStyle('#2563eb')}>
            Play
          </button>
        ) : (
          <button onClick={stop} style={btnStyle('#a00')}>
            Stop
          </button>
        )}
        <button onClick={restart} style={btnStyle('#555')}>
          Restart
        </button>
        <button
          onClick={() => {
            stop()
            dispatch({ type: 'GO_TO_SCREEN', screen: 'export' })
          }}
          style={btnStyle('#16a34a')}
        >
          Export MP4
        </button>
      </div>
    </div>
  )
}

function btnStyle(bg: string): React.CSSProperties {
  return {
    padding: '10px 24px',
    background: bg,
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    fontSize: 16,
    cursor: 'pointer',
  }
}
