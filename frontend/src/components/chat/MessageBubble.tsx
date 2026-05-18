import type { Theme, Message, SourceRef } from '../../types'
import { renderMarkdown } from '../../lib/markdown'
import { CopyButton } from './CopyButton'

interface Props {
  msg: Message
  t: Theme
  style: string
  active: boolean
  onActivate: () => void
}

export function MessageBubble({ msg, t, style, active, onActivate }: Props) {
  const isUser = msg.role === 'user'
  const isMinimal = style === 'minimal'

  if (isMinimal) {
    return (
      <div onClick={onActivate} style={{ marginBottom: 18, cursor: (msg.refs as SourceRef[])?.length ? 'pointer' : 'default' }}>
        <div style={{ fontSize: 11.5, fontWeight: 600, color: isUser ? t.accent : t.textMuted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {isUser ? 'You' : 'Reposage'}
        </div>
        <div style={{ fontSize: 14, lineHeight: 1.7, color: t.text, borderLeft: active && !isUser ? `3px solid ${t.accent}` : '3px solid transparent', paddingLeft: active && !isUser ? 12 : 0, transition: 'border-color 0.15s' }}>
          {renderMarkdown(msg.text, t)}
          {(msg.refs as SourceRef[])?.length > 0 && <span style={{ fontSize: 11.5, color: t.accent, marginLeft: 6 }}>· {(msg.refs as SourceRef[]).length} sources</span>}
        </div>
      </div>
    )
  }

  return (
    <div onClick={onActivate}
      style={{ display: 'flex', flexDirection: isUser ? 'row-reverse' : 'row', alignItems: 'flex-start', gap: 10, marginBottom: 16, cursor: (msg.refs as SourceRef[])?.length ? 'pointer' : 'default' }}>
      <div style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0, background: isUser ? t.accent : t.accentSubtle, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: isUser ? '#fff' : t.accent }}>
        {isUser ? 'U' : 'R'}
      </div>
      <div style={{ maxWidth: '75%' }}>
        <div style={{ padding: '10px 14px', borderRadius: t.radius + 2, lineHeight: 1.7, fontSize: 14, background: isUser ? t.userBubble : t.aiBubble, color: isUser ? t.userBubbleFg : t.aiBubbleFg, border: isUser ? 'none' : `1px solid ${t.aiBubbleBorder}`, boxShadow: active && !isUser ? `0 0 0 2px ${t.accent}` : 'none', transition: 'box-shadow 0.15s' }}>
          {renderMarkdown(msg.text, t)}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, paddingLeft: 2 }}>
          {(msg.refs as SourceRef[])?.length > 0 && (
            <span style={{ fontSize: 11.5, color: t.accent }}>
              {(msg.refs as SourceRef[]).length} source{(msg.refs as SourceRef[]).length > 1 ? 's' : ''} cited ↗
            </span>
          )}
          {!isUser && <CopyButton text={msg.text} t={t} />}
        </div>
      </div>
    </div>
  )
}
