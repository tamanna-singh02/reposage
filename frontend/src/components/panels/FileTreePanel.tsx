import { useState, useEffect } from 'react'
import type { Theme } from '../../types'

interface Props {
  t: Theme
  files: string[]
  loading: boolean
  onClose: () => void
  onFileClick: (path: string) => void
}

export function FileTreePanel({ t, files, loading, onClose, onFileClick }: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const tree: Record<string, Array<{ name: string; full: string }>> = {}
  for (const f of files) {
    const parts = f.split('/')
    const dir = parts.length > 1 ? parts.slice(0, -1).join('/') : '(root)'
    const name = parts[parts.length - 1]
    if (!tree[dir]) tree[dir] = []
    tree[dir].push({ name, full: f })
  }
  const dirs = Object.keys(tree).sort()

  useEffect(() => {
    if (dirs.length > 0 && Object.keys(expanded).length === 0) {
      const init: Record<string, boolean> = {}
      dirs.forEach(d => { init[d] = true })
      setExpanded(init)
    }
  }, [files]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (dir: string) => setExpanded(e => ({ ...e, [dir]: !e[dir] }))

  return (
    <div style={{ width: 260, flexShrink: 0, borderLeft: `1px solid ${t.border}`, background: t.bgAlt, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '14px 16px 10px', borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          Files {files.length > 0 && <span style={{ fontWeight: 400, textTransform: 'none' }}>({files.length})</span>}
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: t.textMuted, cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>✕</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 6px' }}>
        {loading && <div style={{ fontSize: 12.5, color: t.textMuted, padding: '12px 8px' }}>Loading…</div>}
        {!loading && files.length === 0 && (
          <div style={{ fontSize: 12.5, color: t.textMuted, padding: '16px 8px', textAlign: 'center', lineHeight: 1.6 }}>
            No files found.<br />Repo may not be cloned locally.
          </div>
        )}
        {!loading && dirs.map(dir => (
          <div key={dir} style={{ marginBottom: 2 }}>
            <button onClick={() => toggle(dir)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 5, padding: '4px 8px', background: 'none', border: 'none', cursor: 'pointer', color: t.textSub, fontSize: 11.5, fontWeight: 600, textAlign: 'left', borderRadius: t.radius }}
              onMouseEnter={e => (e.currentTarget.style.background = t.border)}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                style={{ flexShrink: 0, transform: expanded[dir] ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.12s' }}>
                <polyline points="9 18 15 12 9 6" />
              </svg>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dir}</span>
            </button>
            {expanded[dir] && tree[dir].map(({ name, full }) => (
              <button key={full} onClick={() => onFileClick(full)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 6, padding: '3px 8px 3px 26px', background: 'none', border: 'none', cursor: 'pointer', color: t.text, fontSize: 12, textAlign: 'left', borderRadius: t.radius, fontFamily: "'JetBrains Mono','Fira Code',monospace" }}
                onMouseEnter={e => { e.currentTarget.style.background = t.accentSubtle; e.currentTarget.style.color = t.accent }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = t.text }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                </svg>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
