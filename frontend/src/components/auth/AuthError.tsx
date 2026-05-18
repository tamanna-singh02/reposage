import themes from '../../theme/themes'

const ta = themes['notion']

export function AuthError({ msg }: { msg: string }) {
  if (!msg) return null
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 14px', background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: ta.radius, marginBottom: 16, fontSize: 13, color: '#be123c' }}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#e11d48" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      {msg}
    </div>
  )
}
