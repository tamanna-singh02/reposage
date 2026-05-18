export interface Repo {
  id: string
  name: string
  owner: string
  url: string
  files: number
  chunks: number
  indexed_at: string
  lang: string
  notes?: string
  questions?: number
}

export interface SourceRef {
  file: string
  start: number
  end: number
  score: number
}

export interface Message {
  role: 'user' | 'assistant'
  text: string
  refs: SourceRef[]
  streaming?: boolean
}

export interface HistorySession {
  id: string
  label: string
  saved_at: string
  message_count: number
}

export interface FullSession {
  id: string
  label: string
  saved_at: string
  messages: Array<{
    role: 'user' | 'assistant'
    content: string
    refs: SourceRef[]
  }>
}

export interface User {
  id: number
  name: string
  email: string
}

export interface Theme {
  name: string
  accent: string
  accentHov: string
  accentFg: string
  accentSubtle: string
  accentSubtleFg: string
  bg: string
  bgAlt: string
  border: string
  text: string
  textSub: string
  textMuted: string
  userBubble: string
  userBubbleFg: string
  aiBubble: string
  aiBubbleFg: string
  aiBubbleBorder: string
  codeBg: string
  codeBorder: string
  codeText: string
  tagBg: string
  tagFg: string
  radius: number
  inputRadius: number
}
