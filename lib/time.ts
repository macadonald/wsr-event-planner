const PHOENIX_TZ = 'America/Phoenix'

// Returns today's date string 'YYYY-MM-DD' in Arizona time (no DST).
export function todayInPhoenix(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: PHOENIX_TZ }).format(new Date())
}

// 'YYYY-MM-DD' → 'Oct 31, 2026'
// Uses UTC to avoid new Date('YYYY-MM-DD') shifting the day.
export function formatDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number)
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day)))
}

// 'HH:MM' or 'HH:MM:SS' → '5:00 PM'
export function formatTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number)
  const d = new Date(2000, 0, 1, hours, minutes)
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(d)
}

// timestamptz → 'Oct 31, 2026 at 5:00 PM' in Phoenix time
export function formatTimestamp(ts: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: PHOENIX_TZ,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(ts))
}

// True if date ('YYYY-MM-DD') is strictly before today in Phoenix.
export function isBeforeToday(date: string): boolean {
  return date < todayInPhoenix()
}
