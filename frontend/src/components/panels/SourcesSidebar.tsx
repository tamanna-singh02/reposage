import type { Theme, SourceRef, Repo } from '../../types'
import { scoreColor } from '../../lib/utils'

interface Props {
  t: Theme
  refs: SourceRef[]
  repo: Repo | null
}

export function SourcesSidebar({ t, refs, repo }: Props) {
  if (!refs || refs.length === 0) {
    return (
      <div style={{ width: 260, flexShrink: 0, borderLeft: `1px solid ${t.border}`, background: t.bgAlt, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={t.border} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 12 }}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
        </svg>
        <p style={{ fontSize: 13, color: t.textMuted, textAlign: 'center', lineHeight: 1.6 }}>Sources appear here when an assistant message is selected</p>
      </div>
    )
  }

  return (
    <div style={{ width: 260, flexShrink: 0, borderLeft: `1px solid ${t.border}`, background: t.bgAlt, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '14px 16px 10px', borderBottom: `1px solid ${t.border}`, flexShrink: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Sources</div>
        <div style={{ fontSize: 11.5, color: t.textMuted, marginTop: 2 }}>{refs.length} file{refs.length > 1 ? 's' : ''} cited</div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 10px' }}>
        {refs.map((r, i) => (
          <div key={i}
            style={{ background: t.bg, border: `1px solid ${t.border}`, borderRadius: t.radius, padding: '10px 12px', marginBottom: 8, cursor: 'pointer', transition: 'border-color 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = t.accent)}
            onMouseLeave={e => (e.currentTarget.style.borderColor = t.border)}>
            <div style={{ fontSize: 12, fontFamily: "'JetBrains Mono','Fira Code','Courier New',monospace", color: t.accent, wordBreak: 'break-all', marginBottom: 5, lineHeight: 1.4 }}>
              {r.file}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11.5, color: t.textMuted }}>:{r.start}–{r.end}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: scoreColor(r.score), background: `${scoreColor(r.score)}15`, padding: '1px 6px', borderRadius: 99 }}>
                {Math.round(r.score * 100)}%
              </span>
            </div>
          </div>
        ))}
      </div>
      {repo?.url && (
        <div style={{ padding: '10px 14px', borderTop: `1px solid ${t.border}`, fontSize: 11.5, color: t.textMuted, flexShrink: 0 }}>
          <a href={repo.url} target="_blank" rel="noreferrer" style={{ color: t.accent, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            Open on GitHub
          </a>
        </div>
      )}
    </div>
  )
}
