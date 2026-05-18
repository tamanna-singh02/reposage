import { useState } from 'react'
import type { Theme, HistorySession } from '../../types'

interface Props {
  t: Theme
  sessions: HistorySession[]
  loading: boolean
  onOpen: (id: string) => void
  onClose: () => void
}

function fmtDate(iso: string) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
    ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

export function HistoryPanel({ t, sessions, loading, onOpen, onClose }: Props) {
  const [query, setQuery] = useState('')

  const filtered = query.trim()
    ? sessions.filter(s => s.label.toLowerCase().includes(query.toLowerCase()))
    : sessions

  return (
    <div style={{ width: 260, flexShrink: 0, borderLeft: `1px solid ${t.border}`, background: t.bgAlt, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '14px 16px 10px', borderBottom: `1px solid ${t.border}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Saved Conversations</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: t.textMuted, cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>✕</button>
        </div>
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search sessions…"
          style={{ width: '100%', padding: '6px 10px', fontSize: 12.5, border: `1px solid ${t.border}`, borderRadius: t.radius, background: t.bg, color: t.text, outline: 'none', fontFamily: 'inherit' }}
        />
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 10px' }}>
        {loading && <div style={{ fontSize: 12.5, color: t.textMuted, padding: '12px 4px' }}>Loading…</div>}
        {!loading && sessions.length === 0 && (
          <div style={{ fontSize: 12.5, color: t.textMuted, padding: '16px 4px', textAlign: 'center', lineHeight: 1.6 }}>
            No saved conversations yet.<br />Click "Save conversation" to save one.
          </div>
        )}
        {!loading && sessions.length > 0 && filtered.length === 0 && (
          <div style={{ fontSize: 12.5, color: t.textMuted, padding: '16px 4px', textAlign: 'center' }}>No matches</div>
        )}
        {filtered.map(s => (
          <div key={s.id} onClick={() => onOpen(s.id)}
            style={{ background: t.bg, border: `1px solid ${t.border}`, borderRadius: t.radius, padding: '10px 12px', marginBottom: 8, cursor: 'pointer', transition: 'border-color 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = t.accent)}
            onMouseLeave={e => (e.currentTarget.style.borderColor = t.border)}>
            <div style={{ fontSize: 12.5, color: t.text, fontWeight: 500, marginBottom: 4, lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
              {s.label || '(no label)'}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: t.textMuted }}>
              <span>{fmtDate(s.saved_at)}</span>
              <span>{Math.floor(s.message_count / 2)} Q&amp;A</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
