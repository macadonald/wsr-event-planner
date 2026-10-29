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

// 'YYYY-MM-DD' → 'Wed, Nov 4, 2026'
export function formatDateWithDay(date: string): string {
  const [year, month, day] = date.split('-').map(Number)
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day)))
}

// 'YYYY-MM-DD' → 'Wed 11/4'
export function formatDateShortWithDay(date: string): string {
  const [year, month, day] = date.split('-').map(Number)
  const d = new Date(Date.UTC(year, month - 1, day))
  const wd = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'UTC' }).format(d)
  return `${wd} ${month}/${day}`
}

// Auto-format a phone number as the user types: '3035470848' → '303-547-0848'
export function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 10)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
}

// True if date ('YYYY-MM-DD') is strictly before today in Phoenix.
export function isBeforeToday(date: string): boolean {
  return date < todayInPhoenix()
}
