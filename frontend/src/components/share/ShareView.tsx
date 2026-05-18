import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import type { FullSession } from '../../types'
import { MessageBubble } from '../chat/MessageBubble'
import themes from '../../theme/themes'

const t = themes['notion']

export function ShareView() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const [session, setSession] = useState<FullSession | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/share/${sessionId}`)
      .then(r => { if (!r.ok) throw new Error('Session not found'); return r.json() })
      .then(setSession)
      .catch((e: Error) => setError(e.message))
  }, [sessionId])

  if (error) return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: t.bgAlt, color: t.textMuted, fontSize: 14 }}>{error}</div>
  )
  if (!session) return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: t.bgAlt, color: t.textMuted, fontSize: 14 }}>Loading…</div>
  )

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: t.bgAlt }}>
      <div style={{ padding: '14px 24px', borderBottom: `1px solid ${t.border}`, background: t.bg, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 26, height: 26, borderRadius: 7, background: t.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" />
          </svg>
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: t.text }}>reposage — shared conversation</div>
          <div style={{ fontSize: 12, color: t.textMuted }}>{session.label}</div>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px', maxWidth: 760, width: '100%', margin: '0 auto' }}>
        {session.messages.map((msg, i) => (
          <MessageBubble key={i}
            msg={{ role: msg.role, text: msg.content, refs: msg.refs ?? [] }}
            t={t} style="sided" active={false} onActivate={() => {}} />
        ))}
      </div>
    </div>
  )
}
