import { useState } from 'react'
import type { Theme } from '../../types'

export function CopyButton({ text, t }: { text: string; t: Theme }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={e => {
        e.stopPropagation()
        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }}
      title="Copy"
      style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied ? '#16a34a' : t.textMuted, padding: '2px 4px', borderRadius: 4, fontSize: 11, display: 'flex', alignItems: 'center', gap: 3 }}>
      {copied
        ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
        : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
      }
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}
