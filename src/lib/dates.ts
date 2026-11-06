export function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayISO(): string {
  return toISODate(new Date())
}

function parseISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(iso: string, days: number): string {
  const d = parseISO(iso)
  d.setDate(d.getDate() + days)
  return toISODate(d)
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7)
}

export function shiftMonth(key: string, delta: number): string {
  const [y, m] = key.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return toISODate(d).slice(0, 7)
}

export function daysInMonth(key: string): number {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}

export function formatMonth(key: string): string {
  const [y, m] = key.split('-').map(Number)
  return new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(new Date(y, m - 1, 1))
}

export function formatDayHeading(iso: string, today: string): string {
  if (iso === today) return 'Today'
  if (iso === addDays(today, -1)) return 'Yesterday'
  return new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'short' }).format(parseISO(iso))
}

export function isValidISODate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && toISODate(parseISO(value)) === value
}
