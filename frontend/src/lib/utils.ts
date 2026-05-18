export function timeAgo(iso: string): string {
  if (!iso) return ''
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.round(diff / 60)} min ago`
  if (diff < 86400) return `${Math.round(diff / 3600)} hr ago`
  const days = Math.round(diff / 86400)
  return `${days} day${days > 1 ? 's' : ''} ago`
}

export function scoreColor(s: number): string {
  if (s >= 0.93) return '#16a34a'
  if (s >= 0.85) return '#d97706'
  return '#9ca3af'
}
