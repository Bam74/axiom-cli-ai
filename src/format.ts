export function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US').format(value)
}

export function formatPct(value: number) {
  const rounded = Math.round(value * 10) / 10
  return Number.isInteger(rounded) ? `${rounded}%` : `${rounded}%`
}

export function formatPesoMillions(value: number) {
  const rounded = Math.round(value * 10) / 10
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
  return `₱${text}M`
}

export function formatLongDate(iso: string) {
  if (!iso) return ''
  const [year, month, day] = iso.split('-').map(Number)
  if (!year || !month || !day) return iso
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export function formatShortDate(iso: string) {
  if (!iso) return ''
  const [year, month, day] = iso.split('-').map(Number)
  if (!year || !month || !day) return iso
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export function leadName(lead: { First_Name: string; Last_Name: string }) {
  return `${lead.First_Name} ${lead.Last_Name}`
}

export type StatusTone = 'good' | 'amber' | 'bad' | 'neutral'

export function statusTone(status: string): StatusTone {
  const value = status.toLowerCase()
  if (['green', 'on track', 'within tolerance', 'upcoming', 'closed', 'available'].includes(value)) return 'good'
  if (['amber', 'behind', 'watch', 'at risk', 'delayed', 'high', 'in progress'].includes(value)) return 'amber'
  if (['red', 'critical'].includes(value)) return 'bad'
  return 'neutral'
}
