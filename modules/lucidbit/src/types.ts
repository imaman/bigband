export interface WhisperWord {
  word: string
  start: number
  end: number
}

export interface Sentence {
  id: string
  words: WhisperWord[]
  deleted: boolean
}

export interface WordEdit {
  /** key: `${sentenceId}:${wordIndex}` */
  disabled: boolean
}

export type Screen = 'upload' | 'edit' | 'preview' | 'export'

export interface AppState {
  screen: Screen
  apiKey: string
  originalFile: File | null
  audioBuffer: AudioBuffer | null
  rawWords: WhisperWord[]
  sentences: Sentence[]
  wordEdits: Map<string, WordEdit>
  splicedAudioBuffer: AudioBuffer | null
  splicedWords: WhisperWord[]
  displayThresholdMs: number
  exportProgress: number
  exportedBlob: Blob | null
  error: string | null
  loading: boolean
}

export type AppAction =
  | { type: 'SET_API_KEY'; apiKey: string }
  | { type: 'UPLOAD_START' }
  | { type: 'UPLOAD_DONE'; file: File; audioBuffer: AudioBuffer; rawWords: WhisperWord[] }
  | { type: 'UPLOAD_ERROR'; error: string }
  | { type: 'GO_TO_SCREEN'; screen: Screen }
  | { type: 'TOGGLE_SENTENCE'; sentenceId: string }
  | { type: 'TOGGLE_WORD'; sentenceId: string; wordIndex: number }
  | { type: 'SET_SPLICED'; audioBuffer: AudioBuffer; words: WhisperWord[] }
  | { type: 'SET_THRESHOLD'; thresholdMs: number }
  | { type: 'EXPORT_PROGRESS'; progress: number }
  | { type: 'EXPORT_DONE'; blob: Blob }
  | { type: 'EXPORT_ERROR'; error: string }
  | { type: 'RESET' }
