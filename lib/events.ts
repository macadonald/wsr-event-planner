import { isBeforeToday, formatDate, formatDateWithDay } from './time'
import type { Event, EventStatus, EventType } from './types'

export type DisplayStatus = 'completed' | EventStatus

export function getDisplayStatus(event: Pick<Event, 'end_date' | 'status'>): DisplayStatus {
  return isBeforeToday(event.end_date) ? 'completed' : event.status
}

// Count inclusive days. Safe: UTC arithmetic on date strings, no TZ shift.
export function getDayCount(startDate: string, endDate: string): number {
  const [sy, sm, sd] = startDate.split('-').map(Number)
  const [ey, em, ed] = endDate.split('-').map(Number)
  const diff = Date.UTC(ey, em - 1, ed) - Date.UTC(sy, sm - 1, sd)
  return Math.round(diff / 86400000) + 1
}

// "Oct 28, 2026" or "Oct 28–30, 2026"
export function formatDateRange(startDate: string, endDate: string): string {
  if (startDate === endDate) return formatDate(startDate)
  const [sy, sm, sd] = startDate.split('-').map(Number)
  const [ey, em, ed] = endDate.split('-').map(Number)
  if (sy === ey) {
    const start = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
      .format(new Date(Date.UTC(sy, sm - 1, sd)))
    const end = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
      .format(new Date(Date.UTC(ey, em - 1, ed)))
    return `${start}–${end}`
  }
  return `${formatDate(startDate)}–${formatDate(endDate)}`
}

// "Wed, Nov 4, 2026" or "Wed, Nov 4 – Fri, Nov 6, 2026" (for UI, not PDFs)
export function formatDateRangeWithDay(startDate: string, endDate: string): string {
  if (startDate === endDate) return formatDateWithDay(startDate)
  const [sy, sm, sd] = startDate.split('-').map(Number)
  const [ey, em, ed] = endDate.split('-').map(Number)
  if (sy === ey) {
    const start = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })
      .format(new Date(Date.UTC(sy, sm - 1, sd)))
    const end = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
      .format(new Date(Date.UTC(ey, em - 1, ed)))
    return `${start} – ${end}`
  }
  return `${formatDateWithDay(startDate)} – ${formatDateWithDay(endDate)}`
}

// Day offset between two date strings (can be negative).
export function getDateOffset(fromDate: string, toDate: string): number {
  const [fy, fm, fd] = fromDate.split('-').map(Number)
  const [ty, tm, td] = toDate.split('-').map(Number)
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86400000)
}

// Add offsetDays to a 'YYYY-MM-DD' string.
export function shiftDate(date: string, offsetDays: number): string {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + offsetDays)).toISOString().slice(0, 10)
}

export const EVENT_TYPES: EventType[] = [
  'In-House Group', 'Outside Group', 'Wedding', 'Ranch Event', 'Other',
]

export const EVENT_TYPE_COLORS: Record<string, string> = {
  'In-House Group': 'bg-blue-100 text-blue-700',
  'Outside Group':  'bg-purple-100 text-purple-700',
  'Wedding':        'bg-pink-100 text-pink-700',
  'Ranch Event':    'bg-brown-100 text-brown-600',
  'Other':          'bg-cream-200 text-brown-500',
}

export const STATUS_COLORS: Record<DisplayStatus, string> = {
  planning:  'bg-cream-200 text-brown-500',
  finalized: 'bg-green-100 text-green-700',
  completed: 'bg-gray-100 text-gray-500',
}

export const STATUS_LABELS: Record<DisplayStatus, string> = {
  planning:  'Planning',
  finalized: 'Finalized',
  completed: 'Completed',
}
