import { useReducer } from 'react'

import { EditScreen } from './screens/edit-screen'
import { ExportScreen } from './screens/export-screen'
import { PreviewScreen } from './screens/preview-screen'
import { UploadScreen } from './screens/upload-screen'
import { failMe } from './fail-me'
import type { AppAction, AppState, Sentence } from './types'

function splitIntoSentences(words: readonly import('./types').WhisperWord[]): Sentence[] {
  const sentences: Sentence[] = []
  let current: import('./types').WhisperWord[] = []
  let id = 0

  for (let i = 0; i < words.length; i++) {
    const w = words[i] ?? failMe(`word at index ${i} not found`)
    current.push(w)

    const endsWithPunctuation = /[.!?]$/.test(w.word.trim())
    const nextWord = words[i + 1]
    const longPause = nextWord !== undefined && nextWord.start - w.end > 0.7

    if (endsWithPunctuation || longPause || i === words.length - 1) {
      sentences.push({ id: String(id++), words: current, deleted: false })
      current = []
    }
  }

  return sentences
}

function wordEditKey(sentenceId: string, wordIndex: number): string {
  return `${sentenceId}:${wordIndex}`
}

const initialState: AppState = {
  screen: 'upload',
  apiKey: '',
  originalFile: null,
  audioBuffer: null,
  rawWords: [],
  sentences: [],
  wordEdits: new Map(),
  splicedAudioBuffer: null,
  splicedWords: [],
  displayThresholdMs: 180,
  exportProgress: 0,
  exportedBlob: null,
  error: null,
  loading: false,
}

function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_API_KEY':
      return { ...state, apiKey: action.apiKey }

    case 'UPLOAD_START':
      return { ...state, loading: true, error: null }

    case 'UPLOAD_DONE': {
      const sentences = splitIntoSentences(action.rawWords)
      return {
        ...state,
        loading: false,
        originalFile: action.file,
        audioBuffer: action.audioBuffer,
        rawWords: action.rawWords,
        sentences,
        wordEdits: new Map(),
        screen: 'edit',
      }
    }

    case 'UPLOAD_ERROR':
      return { ...state, loading: false, error: action.error }

    case 'GO_TO_SCREEN':
      return { ...state, screen: action.screen, error: null }

    case 'TOGGLE_SENTENCE': {
      const sentences = state.sentences.map(s => (s.id === action.sentenceId ? { ...s, deleted: !s.deleted } : s))
      return { ...state, sentences }
    }

    case 'TOGGLE_WORD': {
      const key = wordEditKey(action.sentenceId, action.wordIndex)
      const edits = new Map(state.wordEdits)
      const existing = edits.get(key)
      if (existing) {
        edits.set(key, { disabled: !existing.disabled })
      } else {
        edits.set(key, { disabled: true })
      }
      return { ...state, wordEdits: edits }
    }

    case 'SET_SPLICED':
      return { ...state, splicedAudioBuffer: action.audioBuffer, splicedWords: action.words }

    case 'SET_THRESHOLD':
      return { ...state, displayThresholdMs: action.thresholdMs }

    case 'EXPORT_PROGRESS':
      return { ...state, exportProgress: action.progress }

    case 'EXPORT_DONE':
      return { ...state, exportProgress: 1, exportedBlob: action.blob }

    case 'EXPORT_ERROR':
      return { ...state, error: action.error, exportProgress: 0 }

    case 'RESET':
      return initialState

    default:
      return state
  }
}

export function wordEditKeyFn(sentenceId: string, wordIndex: number): string {
  return wordEditKey(sentenceId, wordIndex)
}

export function App() {
  const [state, dispatch] = useReducer(reducer, initialState)

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 20 }}>
      <h1 style={{ marginBottom: 20, fontSize: 24 }}>LucidBit</h1>

      {state.error && (
        <div style={{ background: '#a00', padding: '8px 12px', borderRadius: 4, marginBottom: 12 }}>{state.error}</div>
      )}

      {state.screen === 'upload' && <UploadScreen state={state} dispatch={dispatch} />}
      {state.screen === 'edit' && <EditScreen state={state} dispatch={dispatch} />}
      {state.screen === 'preview' && <PreviewScreen state={state} dispatch={dispatch} />}
      {state.screen === 'export' && <ExportScreen state={state} dispatch={dispatch} />}
    </div>
  )
}
