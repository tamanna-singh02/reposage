import themes from '../../theme/themes'

const ta = themes['notion']

interface Props {
  label: string
  type?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}

export function AuthInput({ label, type = 'text', value, onChange, placeholder }: Props) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: ta.textSub, marginBottom: 6 }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: '100%', padding: '9px 12px', fontSize: 14, border: `1.5px solid ${ta.border}`, borderRadius: ta.radius, outline: 'none', background: ta.bg, color: ta.text, fontFamily: 'inherit' }}
        onFocus={e => (e.target.style.borderColor = ta.accent)}
        onBlur={e => (e.target.style.borderColor = ta.border)}
      />
    </div>
  )
}
