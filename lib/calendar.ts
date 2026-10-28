// All date arithmetic uses UTC to avoid TZ shifts (Arizona has no DST).

export type CalendarEvent = {
  id: string
  name: string
  event_type: string | null
  start_date: string
  end_date: string
  pax: number | null
  location: string | null
  status: string
}

export type CalendarTask = {
  id: string
  task: string
  task_date: string
  task_time: string | null
  dept_name: string
  dept_color: string
}

export type EventBar = {
  event: CalendarEvent
  colStart: number    // 0–6 (Sunday = 0)
  colSpan: number     // 1–7
  lane: number        // 0, 1, 2 …
  continuesLeft: boolean   // event started before this week
  continuesRight: boolean  // event ends after this week
}

// ── Date utilities ────────────────────────────────────────────────────────────

export function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10)
}

export function dayOfWeek(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()  // 0 = Sun
}

export function startOfWeek(dateStr: string): string {
  return addDays(dateStr, -dayOfWeek(dateStr))
}

function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate()
}

// Returns weeks (Sun→Sat) covering the full calendar grid for a month.
export function getMonthWeeks(y: number, m: number): string[][] {
  const p = (n: number) => String(n).padStart(2, '0')
  const firstDay = `${y}-${p(m)}-01`
  const lastDay  = `${y}-${p(m)}-${p(daysInMonth(y, m))}`
  const gridStart = startOfWeek(firstDay)
  const gridEnd   = addDays(startOfWeek(lastDay), 6)

  const weeks: string[][] = []
  let cur = gridStart
  while (cur <= gridEnd) {
    const week: string[] = []
    for (let i = 0; i < 7; i++) { week.push(cur); cur = addDays(cur, 1) }
    weeks.push(week)
  }
  return weeks
}

// Returns the 7 days (Sun→Sat) of the week containing dateStr.
export function getWeekDays(dateStr: string): string[] {
  const sun = startOfWeek(dateStr)
  return Array.from({ length: 7 }, (_, i) => addDays(sun, i))
}

export function prevMonth(y: number, m: number): { y: number; m: number } {
  return m === 1 ? { y: y - 1, m: 12 } : { y, m: m - 1 }
}

export function nextMonth(y: number, m: number): { y: number; m: number } {
  return m === 12 ? { y: y + 1, m: 1 } : { y, m: m + 1 }
}

// ── Event-type colors (solid hex for calendar bars) ───────────────────────────

export const CAL_EVENT_COLORS: Record<string, string> = {
  'In-House Group': '#4A7A9B',
  'Outside Group':  '#B07340',
  'Wedding':        '#9B6A9B',
  'Ranch Event':    '#5A8A45',
  'Other':          '#7A7A7A',
}

export function calEventColor(eventType: string | null): string {
  return (eventType && CAL_EVENT_COLORS[eventType]) ?? '#7A7A7A'
}

// ── Event bar placement ───────────────────────────────────────────────────────

export function getEventBarsForWeek(
  events: CalendarEvent[],
  weekDays: string[],   // 7 strings, Sun first
): EventBar[] {
  const weekStart = weekDays[0]
  const weekEnd   = weekDays[6]

  const relevant = events
    .filter(e => e.start_date <= weekEnd && e.end_date >= weekStart)
    .sort((a, b) => {
      if (a.start_date !== b.start_date) return a.start_date < b.start_date ? -1 : 1
      // Longer events first so they get lower lanes
      const lenA = daysBetween(a.start_date, a.end_date)
      const lenB = daysBetween(b.start_date, b.end_date)
      return lenB - lenA
    })

  const bars: EventBar[] = []
  const laneEndCol: number[] = []

  for (const event of relevant) {
    const barStart = event.start_date < weekStart ? weekStart : event.start_date
    const barEnd   = event.end_date   > weekEnd   ? weekEnd   : event.end_date
    const colStart = weekDays.indexOf(barStart)
    const colEnd   = weekDays.indexOf(barEnd)
    const colSpan  = colEnd - colStart + 1

    let lane = 0
    while (laneEndCol[lane] !== undefined && laneEndCol[lane] >= colStart) lane++
    laneEndCol[lane] = colEnd

    bars.push({
      event, colStart, colSpan, lane,
      continuesLeft:  event.start_date < weekStart,
      continuesRight: event.end_date   > weekEnd,
    })
  }
  return bars
}

function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number)
  const [by, bm, bd] = b.split('-').map(Number)
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000)
}
