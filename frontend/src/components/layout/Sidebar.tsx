import type { Theme, Repo, User } from '../../types'

interface Props {
  t: Theme
  view: string
  setView: (v: string) => void
  activeRepo: Repo | null
  repos: Repo[]
  reposLoading: boolean
  onSelectRepo: (r: Repo) => void
  user: User | null
  onLogout: () => void
  multiMode: boolean
  multiSelected: string[]
  onToggleMulti: () => void
  onToggleRepo: (id: string) => void
}

export function Sidebar({
  t, view, setView, activeRepo, repos, reposLoading,
  onSelectRepo, user, onLogout,
  multiMode, multiSelected, onToggleMulti, onToggleRepo,
}: Props) {
  const navItems = [
    {
      id: 'repos', label: 'Repositories',
      icon: <path d="M3 3h18v18H3zM3 9h18M9 21V9" />,
    },
    {
      id: 'chat', label: 'Chat',
      icon: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
    },
    {
      id: 'ingest', label: 'Add Repo',
      icon: <><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>,
    },
    {
      id: 'settings', label: 'Settings',
      icon: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></>,
    },
  ]

  return (
    <div style={{ width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column', background: t.bgAlt, borderRight: `1px solid ${t.border}` }}>
      {/* logo */}
      <div style={{ padding: '14px 16px 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: t.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" />
          </svg>
        </div>
        <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-0.01em', color: t.text }}>reposage</span>
      </div>

      {/* nav */}
      <nav style={{ padding: '8px 8px' }}>
        {navItems.map(item => (
          <button key={item.id} onClick={() => setView(item.id)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 9,
              padding: '7px 10px', borderRadius: t.radius, border: 'none', cursor: 'pointer',
              background: view === item.id ? t.accentSubtle : 'transparent',
              color: view === item.id ? (t.accentSubtleFg || t.accent) : t.textSub,
              fontSize: 13.5, fontWeight: view === item.id ? 600 : 400,
              marginBottom: 2, transition: 'background 0.12s',
            }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{item.icon}</svg>
            {item.label}
          </button>
        ))}
      </nav>

      <div style={{ height: 1, background: t.border, margin: '4px 12px' }} />

      {/* recent repos */}
      <div style={{ padding: '8px 8px 4px', flex: 1, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 10px 6px' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Recent</div>
          <button onClick={onToggleMulti} title="Multi-repo mode"
            style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, border: `1px solid ${multiMode ? t.accent : t.border}`, background: multiMode ? t.accentSubtle : 'none', color: multiMode ? t.accent : t.textMuted, cursor: 'pointer', fontWeight: 600 }}>
            MULTI
          </button>
        </div>
        {reposLoading && <div style={{ padding: '6px 10px', fontSize: 12.5, color: t.textMuted }}>Loading…</div>}
        {!reposLoading && repos.length === 0 && (
          <div style={{ padding: '6px 10px', fontSize: 12.5, color: t.textMuted }}>No repos indexed yet</div>
        )}
        {repos.map(r => (
          <button key={r.id}
            onClick={() => multiMode ? onToggleRepo(r.id) : onSelectRepo(r)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
              borderRadius: t.radius, border: 'none', cursor: 'pointer',
              background: multiMode
                ? (multiSelected.includes(r.id) ? t.accentSubtle : 'transparent')
                : (activeRepo?.id === r.id && view === 'chat' ? t.accentSubtle : 'transparent'),
              color: multiMode
                ? (multiSelected.includes(r.id) ? t.accent : t.text)
                : (activeRepo?.id === r.id && view === 'chat' ? t.accent : t.text),
              fontSize: 13, marginBottom: 1, textAlign: 'left', transition: 'background 0.1s',
            }}>
            {multiMode
              ? <div style={{ width: 13, height: 13, borderRadius: 3, border: `1.5px solid ${multiSelected.includes(r.id) ? t.accent : t.border}`, background: multiSelected.includes(r.id) ? t.accent : 'none', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {multiSelected.includes(r.id) && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
                </div>
              : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77A5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
                </svg>
            }
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
          </button>
        ))}
      </div>

      {/* user + logout */}
      <div style={{ padding: '10px 12px', borderTop: `1px solid ${t.border}`, flexShrink: 0 }}>
        {user && (
          <div style={{ fontSize: 12, color: t.textMuted, marginBottom: 6, paddingLeft: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user.name}
          </div>
        )}
        <button onClick={onLogout}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: t.radius, border: 'none', cursor: 'pointer', background: 'transparent', color: t.textSub, fontSize: 13, transition: 'background 0.1s' }}
          onMouseEnter={e => (e.currentTarget.style.background = t.border)}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Log out
        </button>
      </div>
    </div>
  )
}
