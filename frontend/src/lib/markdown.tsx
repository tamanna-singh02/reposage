import type { Theme } from '../types'

export function renderMarkdown(text: string, t: Theme) {
  const parts = text.split(/(```[\s\S]*?```)/g)
  return parts.map((p, i) => {
    if (p.startsWith('```')) {
      const code = p.replace(/^```\w*\n?/, '').replace(/\n?```$/, '')
      return (
        <pre
          key={i}
          style={{
            margin: '10px 0',
            padding: '12px 14px',
            background: t.codeBg,
            border: `1px solid ${t.codeBorder}`,
            borderRadius: t.radius,
            fontSize: 12.5,
            lineHeight: 1.6,
            fontFamily: "'JetBrains Mono','Fira Code','Courier New',monospace",
            color: t.codeText,
            overflowX: 'auto',
          }}
        >
          {code}
        </pre>
      )
    }
    return (
      <span key={i} style={{ display: 'inline' }}>
        {p.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((chunk, j) => {
          if (chunk.startsWith('**') && chunk.endsWith('**'))
            return <strong key={j}>{chunk.slice(2, -2)}</strong>
          if (chunk.startsWith('`') && chunk.endsWith('`'))
            return (
              <code
                key={j}
                style={{
                  background: t.codeBg,
                  border: `1px solid ${t.codeBorder}`,
                  padding: '1px 5px',
                  borderRadius: Math.max(t.radius - 2, 2),
                  fontSize: '0.87em',
                  fontFamily: "'JetBrains Mono',monospace",
                }}
              >
                {chunk.slice(1, -1)}
              </code>
            )
          return chunk.split('\n').map((line, k, arr) => (
            <span key={k}>
              {line}
              {k < arr.length - 1 && <br />}
            </span>
          ))
        })}
      </span>
    )
  })
}
