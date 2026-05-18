import { useState } from 'react'
import type { Theme, FullSession } from '../../types'
import { MessageBubble } from '../chat/MessageBubble'

interface Props {
  t: Theme
  session: FullSession
  onClose: () => void
}

export function SessionModal({ t, session, onClose }: Props) {
  const [linkCopied, setLinkCopied] = useState(false)

  function copyShareLink() {
    const url = `${window.location.origin}/share/${session.id}`
    navigator.clipboard.writeText(url)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        style={{ width: 'min(700px, 90vw)', maxHeight: '80vh', display: 'flex', flexDirection: 'column', background: t.bg, borderRadius: t.radius + 4, border: `1px solid ${t.border}`, boxShadow: '0 24px 80px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: t.text }}>{session.label || 'Saved conversation'}</div>
            <div style={{ fontSize: 11.5, color: t.textMuted, marginTop: 2 }}>
              {new Date(session.saved_at).toLocaleString()} · {Math.floor(session.messages.length / 2)} Q&amp;A pairs
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={copyShareLink}
              style={{ fontSize: 12, color: linkCopied ? '#16a34a' : t.accent, padding: '4px 10px', border: `1px solid ${linkCopied ? '#bbf7d0' : t.accent}`, borderRadius: t.radius, background: linkCopied ? '#f0fdf4' : 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
              {linkCopied ? 'Copied!' : 'Share link'}
            </button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: t.textMuted, cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>✕</button>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {session.messages.map((msg, i) => (
            <MessageBubble key={i}
              msg={{ role: msg.role, text: msg.content, refs: msg.refs ?? [] }}
              t={t} style="sided" active={false} onActivate={() => {}} />
          ))}
        </div>
      </div>
    </div>
  )
}
