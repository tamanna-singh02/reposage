import type { Theme } from '../../types'

export function TypingIndicator({ t }: { t: Theme }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 16 }}>
      <div style={{ width: 30, height: 30, borderRadius: '50%', background: t.accentSubtle, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: t.accent, flexShrink: 0 }}>R</div>
      <div style={{ padding: '10px 16px', background: t.aiBubble, border: `1px solid ${t.border}`, borderRadius: t.radius + 2, display: 'flex', gap: 5, alignItems: 'center' }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: t.textMuted, animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
        ))}
      </div>
      <style>{`@keyframes pulse{0%,80%,100%{opacity:.25;transform:scale(.8)}40%{opacity:1;transform:scale(1)}}`}</style>
    </div>
  )
}
