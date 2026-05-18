import { useState, useRef, useEffect } from 'react'
import type { Repo, Message, SourceRef, HistorySession, FullSession, User } from './types'
import { apiFetch } from './lib/api'
import themes from './theme/themes'
import { useTweaks } from './hooks/useTweaks'
import { Sidebar } from './components/layout/Sidebar'
import { ReposView } from './components/repos/ReposView'
import { IngestView } from './components/repos/IngestView'
import { SettingsView } from './components/settings/SettingsView'
import { MessageBubble } from './components/chat/MessageBubble'
import { TypingIndicator } from './components/chat/TypingIndicator'
import { SourcesSidebar } from './components/panels/SourcesSidebar'
import { FileTreePanel } from './components/panels/FileTreePanel'
import { HistoryPanel } from './components/panels/HistoryPanel'
import { SessionModal } from './components/panels/SessionModal'
import { TweaksPanel, TweakSection, TweakRadio } from './components/tweaks/TweaksPanel'

interface Props {
  token: string
  user: User | null
  onLogout: () => void
}

function welcomeMessages(repo: Repo): Message[] {
  return [{
    role: 'assistant',
    text: `Hi! I've indexed **${repo.owner}/${repo.name}** — ${repo.chunks?.toLocaleString()} chunks across ${repo.files} files. Ask me anything about the codebase.`,
    refs: [],
  }]
}

export function App({ token: _token, user, onLogout }: Props) {
  const [tweaks, setTweak] = useTweaks()
  const t = themes[tweaks.theme] ?? themes['notion']

  const [repos, setRepos] = useState<Repo[]>([])
  const [multiMode, setMultiMode] = useState(false)
  const [multiSelected, setMultiSelected] = useState<string[]>([])
  const [reposLoading, setReposLoading] = useState(true)
  const [view, setView] = useState('repos')
  const [activeRepo, setActiveRepo] = useState<Repo | null>(null)

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeRefs, setActiveRefs] = useState<SourceRef[]>([])

  const [historyOpen, setHistoryOpen] = useState(false)
  const [historySessions, setHistorySessions] = useState<HistorySession[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [openSession, setOpenSession] = useState<FullSession | null>(null)
  const [saveToast, setSaveToast] = useState(false)

  const [fileTreeOpen, setFileTreeOpen] = useState(false)
  const [fileTreeFiles, setFileTreeFiles] = useState<string[]>([])
  const [fileTreeLoading, setFileTreeLoading] = useState(false)

  const [ingestUrl, setIngestUrl] = useState('')
  const [ingesting, setIngesting] = useState(false)
  const [ingestProgress, setIngestProgress] = useState(0)
  const [ingestMessage, setIngestMessage] = useState('')
  const [ingestDone, setIngestDone] = useState(false)
  const [ingestResult, setIngestResult] = useState<Record<string, unknown> | null>(null)
  const [ingestError, setIngestError] = useState('')

  const chatEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { fetchRepos() }, [])

  async function fetchRepos() {
    setReposLoading(true)
    try {
      const res = await apiFetch('/api/repos')
      if (!res.ok) return
      const data: Repo[] = await res.json()
      setRepos(data)
      if (data.length > 0 && !activeRepo) {
        setActiveRepo(data[0])
        setView('chat')
        setMessages(welcomeMessages(data[0]))
      } else if (data.length === 0) {
        setView('repos')
      }
    } catch (e) { console.error('Failed to load repos:', e) }
    finally { setReposLoading(false) }
  }

  function selectRepo(repo: Repo) {
    setActiveRepo(repo)
    setMessages(welcomeMessages(repo))
    setActiveRefs([])
    setView('chat')
  }

  useEffect(() => { chatEndRef.current?.scrollIntoView({ block: 'end' }) }, [messages, loading])

  async function sendMessage() {
    if (!input.trim() || loading) return
    if (multiMode && multiSelected.length === 0) return
    if (!multiMode && !activeRepo) return
    const text = input.trim()
    setMessages(m => [...m, { role: 'user', text, refs: [] }])
    setInput('')
    setLoading(true)
    setActiveRefs([])

    if (multiMode) {
      setMessages(m => [...m, { role: 'assistant', text: '', refs: [], streaming: true }])
      try {
        const res = await apiFetch('/api/chat/multi', { method: 'POST', body: JSON.stringify({ message: text, collections: multiSelected }) })
        const data = await res.json()
        if (!res.ok) throw new Error(data.detail || 'Request failed')
        setMessages(m => { const c = [...m]; c[c.length - 1] = { role: 'assistant', text: data.answer, refs: data.refs, streaming: false }; return c })
        setActiveRefs(data.refs)
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Unknown error'
        setMessages(m => { const c = [...m]; c[c.length - 1] = { role: 'assistant', text: `**Error:** ${msg}`, refs: [], streaming: false }; return c })
      } finally { setLoading(false) }
      return
    }

    setMessages(m => [...m, { role: 'assistant', text: '', refs: [], streaming: true }])
    try {
      const res = await apiFetch(`/api/chat/${activeRepo!.id}/stream`, { method: 'POST', body: JSON.stringify({ message: text }) })
      if (!res.ok) { const data = await res.json(); throw new Error(data.detail || 'Request failed') }

      const reader = res.body!.getReader()
      const dec = new TextDecoder()
      let buf = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const evt = JSON.parse(line.slice(6))
            if (evt.type === 'token') {
              setMessages(m => { const c = [...m]; c[c.length - 1] = { ...c[c.length - 1], text: c[c.length - 1].text + evt.text }; return c })
            } else if (evt.type === 'refs') {
              setMessages(m => { const c = [...m]; c[c.length - 1] = { ...c[c.length - 1], refs: evt.refs, streaming: false }; return c })
              setActiveRefs(evt.refs)
            } else if (evt.type === 'error') {
              throw new Error(evt.message)
            }
          } catch { /* swallow parse errors */ }
        }
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error'
      setMessages(m => { const c = [...m]; c[c.length - 1] = { role: 'assistant', text: `**Error:** ${msg}`, refs: [], streaming: false }; return c })
    } finally {
      setMessages(m => { const c = [...m]; if (c[c.length - 1]?.streaming) c[c.length - 1] = { ...c[c.length - 1], streaming: false }; return c })
      setLoading(false)
    }
  }

  async function clearHistory() {
    if (!activeRepo) return
    await apiFetch(`/api/chat/${activeRepo.id}/history`, { method: 'DELETE' })
    setMessages(welcomeMessages(activeRepo))
    setActiveRefs([])
  }

  async function saveConversation() {
    if (!activeRepo) return
    const welcome = welcomeMessages(activeRepo)[0]?.text
    const toSave = messages.filter(m => !(m.role === 'assistant' && m.text === welcome))
    if (toSave.length === 0) return
    const payload = toSave.map(m => ({ role: m.role, content: m.text, refs: m.refs ?? [] }))
    await apiFetch(`/api/chat/${activeRepo.id}/history`, { method: 'POST', body: JSON.stringify({ messages: payload }) })
    setSaveToast(true)
    setTimeout(() => setSaveToast(false), 2500)
  }

  async function loadHistory() {
    if (!activeRepo) return
    setHistoryLoading(true)
    try {
      const data = await apiFetch(`/api/chat/${activeRepo.id}/history`).then(r => r.json())
      setHistorySessions(data)
    } catch (e) { console.error(e) }
    finally { setHistoryLoading(false) }
  }

  async function openSessionModal(sessionId: string) {
    const data: FullSession = await apiFetch(`/api/chat/${activeRepo!.id}/history/${sessionId}`).then(r => r.json())
    setOpenSession(data)
  }

  function toggleHistory() {
    if (!historyOpen) { loadHistory(); setFileTreeOpen(false) }
    setHistoryOpen(h => !h)
  }

  async function toggleFileTree() {
    if (!fileTreeOpen) {
      setHistoryOpen(false)
      setFileTreeOpen(true)
      if (!activeRepo) return
      setFileTreeLoading(true)
      try {
        const data = await apiFetch(`/api/repos/${activeRepo.id}/files`).then(r => r.json())
        setFileTreeFiles(data)
      } catch { setFileTreeFiles([]) }
      finally { setFileTreeLoading(false) }
    } else {
      setFileTreeOpen(false)
    }
  }

  async function startIngest() {
    if (!ingestUrl.trim()) return
    setIngesting(true); setIngestProgress(0); setIngestMessage('Starting…')
    setIngestDone(false); setIngestError(''); setIngestResult(null)
    try {
      const res = await apiFetch('/api/repos/ingest', { method: 'POST', body: JSON.stringify({ url: ingestUrl.trim() }) })
      const reader = res.body!.getReader()
      const dec = new TextDecoder()
      let buf = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const evt = JSON.parse(line.slice(6))
            setIngestProgress(evt.progress)
            setIngestMessage(evt.message)
            if (evt.stage === 'done') { setIngestDone(true); setIngesting(false); setIngestResult(evt) }
            else if (evt.stage === 'error') { setIngestError(evt.message); setIngesting(false) }
          } catch { /* swallow */ }
        }
      }
    } catch (e: unknown) {
      setIngestError(e instanceof Error ? e.message : 'Unknown error')
      setIngesting(false)
    }
  }

  async function finishIngest() {
    const fresh: Repo[] = await apiFetch('/api/repos').then(r => r.json())
    setRepos(fresh)
    const repo = (ingestResult && fresh.find(r => r.id === ingestResult['collection'])) || fresh[0]
    if (repo) { setActiveRepo(repo); setMessages(welcomeMessages(repo)); setActiveRefs([]) }
    setIngestUrl(''); setIngestProgress(0); setIngestDone(false)
    setIngestResult(null); setIngestMessage(''); setView('chat')
  }

  useEffect(() => { document.body.style.background = t.bg }, [t.bg])

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: t.bg, color: t.text, fontSize: 14 }}>
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <Sidebar t={t} view={view} setView={setView} activeRepo={activeRepo}
          repos={repos} reposLoading={reposLoading}
          onSelectRepo={selectRepo} user={user} onLogout={onLogout}
          multiMode={multiMode} multiSelected={multiSelected}
          onToggleMulti={() => { setMultiMode(m => !m); setMultiSelected([]) }}
          onToggleRepo={id => setMultiSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])} />

        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {view === 'repos' && (
            <ReposView t={t} repos={repos} loading={reposLoading}
              onSelect={selectRepo}
              onDelete={async (repo) => {
                if (!confirm(`Delete "${repo.name}"? This cannot be undone.`)) return
                await apiFetch(`/api/repos/${repo.id}`, { method: 'DELETE' })
                const fresh: Repo[] = await apiFetch('/api/repos').then(r => r.json())
                setRepos(fresh)
                if (activeRepo?.id === repo.id) { setActiveRepo(null); setView('repos') }
              }}
              onReingest={async (repo) => {
                if (!confirm(`Re-index "${repo.name}"? This will pull the latest commits.`)) return
                await apiFetch(`/api/repos/${repo.id}/reingest`, { method: 'POST' })
                const fresh: Repo[] = await apiFetch('/api/repos').then(r => r.json())
                setRepos(fresh)
              }}
              onSaveNotes={async (repoId, notes) => {
                await apiFetch(`/api/repos/${repoId}/notes`, { method: 'PATCH', body: JSON.stringify({ notes }) })
              }}
              onIngest={() => { setIngestUrl(''); setIngestDone(false); setIngestError(''); setIngesting(false); setView('ingest') }} />
          )}

          {view === 'ingest' && (
            <IngestView t={t} url={ingestUrl} setUrl={setIngestUrl}
              onStart={startIngest} ingesting={ingesting}
              progress={ingestProgress} message={ingestMessage}
              done={ingestDone} error={ingestError}
              onFinish={finishIngest}
              onRetry={() => { setIngestError(''); setIngestDone(false) }}
              onCancel={() => setView('repos')} />
          )}

          {view === 'settings' && (
            <SettingsView t={t} user={user} onLogout={onLogout} />
          )}

          {view === 'chat' && (multiMode ? multiSelected.length > 0 : !!activeRepo) && (
            <>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {/* topbar */}
                <div style={{ padding: '0 20px', height: 52, display: 'flex', alignItems: 'center', borderBottom: `1px solid ${t.border}`, background: t.bg, gap: 10, flexShrink: 0 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={t.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77A5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
                  </svg>
                  {multiMode
                    ? <><span style={{ fontWeight: 600, fontSize: 13.5 }}>Multi-repo</span>
                        <span style={{ fontSize: 12, color: t.accent, background: t.accentSubtle, border: `1px solid ${t.accent}`, padding: '2px 8px', borderRadius: 99 }}>{multiSelected.length} repos</span></>
                    : <><span style={{ fontWeight: 600, fontSize: 13.5 }}>{activeRepo?.owner}/{activeRepo?.name}</span>
                        <span style={{ fontSize: 12, color: t.textMuted, background: t.bgAlt, border: `1px solid ${t.border}`, padding: '2px 8px', borderRadius: 99 }}>{activeRepo?.chunks?.toLocaleString()} chunks</span></>
                  }
                  <div style={{ flex: 1 }} />
                  {saveToast && (
                    <span style={{ fontSize: 12, color: '#16a34a', padding: '4px 10px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: t.radius }}>Saved ✓</span>
                  )}
                  <button onClick={saveConversation} style={{ fontSize: 12, color: t.accent, padding: '4px 10px', border: `1px solid ${t.accent}`, borderRadius: t.radius, background: 'none', cursor: 'pointer' }}>Save conversation</button>
                  {!multiMode && (
                    <button onClick={toggleFileTree} style={{ fontSize: 12, color: fileTreeOpen ? t.accent : t.textMuted, padding: '4px 10px', border: `1px solid ${fileTreeOpen ? t.accent : t.border}`, borderRadius: t.radius, background: fileTreeOpen ? t.accentSubtle : 'none', cursor: 'pointer' }}>Files</button>
                  )}
                  <button onClick={toggleHistory} style={{ fontSize: 12, color: historyOpen ? t.accent : t.textMuted, padding: '4px 10px', border: `1px solid ${historyOpen ? t.accent : t.border}`, borderRadius: t.radius, background: historyOpen ? t.accentSubtle : 'none', cursor: 'pointer' }}>History</button>
                  <button onClick={clearHistory} style={{ fontSize: 12, color: t.textMuted, padding: '4px 10px', border: `1px solid ${t.border}`, borderRadius: t.radius, background: 'none', cursor: 'pointer' }}>Clear</button>
                </div>

                {/* messages */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
                  {messages.map((msg, i) => (
                    <MessageBubble key={i} msg={msg} t={t} style={tweaks.bubbleStyle}
                      active={msg.refs === activeRefs}
                      onActivate={() => msg.refs?.length && setActiveRefs(msg.refs as SourceRef[])} />
                  ))}
                  {loading && !messages.some(m => m.streaming) && <TypingIndicator t={t} />}
                  <div ref={chatEndRef} />
                </div>

                {/* input */}
                <div style={{ padding: '12px 24px 16px', borderTop: `1px solid ${t.border}`, background: t.bg, flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, border: `1.5px solid ${t.border}`, borderRadius: t.inputRadius + 2, background: t.bg, padding: '8px 8px 8px 14px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                    <textarea ref={textareaRef} value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                      placeholder="Ask a question about the codebase…" rows={1}
                      style={{ flex: 1, border: 'none', outline: 'none', resize: 'none', fontSize: 14, lineHeight: 1.6, background: 'transparent', color: t.text, maxHeight: 120, overflowY: 'auto', fontFamily: 'inherit' }}
                    />
                    <button onClick={sendMessage} disabled={!input.trim() || loading}
                      style={{ width: 34, height: 34, borderRadius: t.radius, border: 'none', background: input.trim() && !loading ? t.accent : t.border, color: '#fff', cursor: input.trim() && !loading ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s', flexShrink: 0 }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                      </svg>
                    </button>
                  </div>
                  <div style={{ marginTop: 6, fontSize: 11, color: t.textMuted, textAlign: 'center' }}>
                    Answers grounded in indexed source — always cite file + line
                  </div>
                </div>
              </div>

              {fileTreeOpen
                ? <FileTreePanel t={t} files={fileTreeFiles} loading={fileTreeLoading}
                    onClose={() => setFileTreeOpen(false)}
                    onFileClick={path => setInput(`Explain the file \`${path}\``)} />
                : historyOpen
                ? <HistoryPanel t={t} sessions={historySessions} loading={historyLoading}
                    onOpen={openSessionModal} onClose={() => setHistoryOpen(false)} />
                : <SourcesSidebar t={t} refs={activeRefs} repo={activeRepo} />
              }
              {openSession && <SessionModal t={t} session={openSession} onClose={() => setOpenSession(null)} />}
            </>
          )}

          {view === 'chat' && !activeRepo && !multiMode && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.textMuted, fontSize: 14 }}>
              Select a repository to start chatting
            </div>
          )}
        </div>
      </div>

      <TweaksPanel>
        <TweakSection title="Theme">
          <TweakRadio label="Style" value={tweaks.theme.replace('-dark', '')} options={['github', 'linear', 'notion']}
            onChange={v => setTweak('theme', tweaks.darkMode ? `${v}-dark` : v)} />
          <TweakRadio label="Mode" value={tweaks.darkMode ? 'dark' : 'light'} options={['light', 'dark']}
            onChange={v => { const base = tweaks.theme.replace('-dark', ''); setTweak({ darkMode: v === 'dark', theme: v === 'dark' ? `${base}-dark` : base }) }} />
        </TweakSection>
        <TweakSection title="Chat">
          <TweakRadio label="Bubble style" value={tweaks.bubbleStyle} options={['sided', 'minimal']}
            onChange={v => setTweak('bubbleStyle', v)} />
        </TweakSection>
      </TweaksPanel>
    </div>
  )
}
