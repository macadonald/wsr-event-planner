'use client'

import Link from 'next/link'
import { getMonthWeeks, getEventBarsForWeek, calEventColor, type CalendarEvent } from '@/lib/calendar'

const DAY_NAMES  = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

const TOP_PAD   = 30   // px above first bar (date-number area)
const BAR_H     = 19   // bar height in px
const BAR_GAP   = 3    // vertical gap between bars
const LANE_H    = BAR_H + BAR_GAP
const MAX_LANES = 3
const BOTTOM_PAD = 4

type Props = {
  events: CalendarEvent[]
  year: number
  month: number
  today: string
  canCreate: boolean
  onDayClick: (date: string) => void
}

export default function MonthView({ events, year, month, today, canCreate, onDayClick }: Props) {
  const weeks = getMonthWeeks(year, month)
  const monthPrefix = `${year}-${String(month).padStart(2, '0')}-`

  // Events visible in this month for mobile list
  const gridStart = weeks[0][0]
  const gridEnd   = weeks[weeks.length - 1][6]
  const listEvents = events
    .filter(e => e.start_date <= gridEnd && e.end_date >= gridStart)
    .sort((a, b) => (a.start_date < b.start_date ? -1 : 1))

  return (
    <div className="bg-white border border-cream-200 rounded-xl overflow-hidden shadow-sm">

      {/* ── Desktop grid ──────────────────────────────────────────────────── */}
      <div className="hidden sm:block">
        {/* Day-of-week header */}
        <div className="grid grid-cols-7 border-b border-cream-200 bg-cream-50">
          {DAY_NAMES.map(d => (
            <div key={d} className="py-1.5 text-center text-xs font-semibold text-brown-400 uppercase tracking-wide">
              {d}
            </div>
          ))}
        </div>

        {/* Week rows */}
        {weeks.map((week, wi) => {
          const allBars     = getEventBarsForWeek(events, week)
          const visibleBars = allBars.filter(b => b.lane < MAX_LANES)
          const overflowBars = allBars.filter(b => b.lane >= MAX_LANES)

          // Per-day overflow count
          const ovfCount = Array(7).fill(0)
          for (const bar of overflowBars) {
            for (let i = bar.colStart; i < bar.colStart + bar.colSpan; i++) ovfCount[i]++
          }

          const maxLane = visibleBars.length > 0
            ? Math.max(...visibleBars.map(b => b.lane))
            : -1
          const rowH = TOP_PAD + (maxLane >= 0 ? (maxLane + 1) * LANE_H : 0) + BOTTOM_PAD

          return (
            <div
              key={wi}
              className="relative border-b border-cream-200 last:border-b-0"
              style={{ height: rowH }}
            >
              {/* Day cell backgrounds */}
              <div className="absolute inset-0 grid grid-cols-7">
                {week.map((day, di) => {
                  const isToday   = day === today
                  const inMonth   = day.startsWith(monthPrefix)
                  return (
                    <div
                      key={day}
                      className={`border-r border-cream-100 last:border-r-0 transition-colors
                        ${canCreate ? 'cursor-pointer hover:bg-amber-50/60' : ''}`}
                      onClick={() => canCreate && onDayClick(day)}
                    >
                      <span className={`
                        inline-flex items-center justify-center w-6 h-6 m-1 rounded-full text-xs font-medium
                        ${isToday ? 'bg-brown-600 text-white' : inMonth ? 'text-brown-700' : 'text-brown-300'}
                      `}>
                        {parseInt(day.split('-')[2])}
                      </span>
                      {/* "+N more" overflow */}
                      {ovfCount[di] > 0 && (
                        <span className="block ml-1 text-xs text-brown-400 leading-none">
                          +{ovfCount[di]}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Event bars */}
              {visibleBars.map(bar => {
                const color    = calEventColor(bar.event.event_type)
                const planning = bar.event.status === 'planning'
                const pct      = 100 / 7
                const ml = bar.continuesLeft  ? 0 : 2
                const mr = bar.continuesRight ? 0 : 2
                const br = `${bar.continuesLeft ? 0 : 3}px ${bar.continuesRight ? 0 : 3}px ${bar.continuesRight ? 0 : 3}px ${bar.continuesLeft ? 0 : 3}px`

                const meta = [
                  bar.event.pax != null ? `${bar.event.pax} pax` : null,
                  bar.event.location,
                ].filter(Boolean).join(' · ')

                return (
                  <Link
                    key={`${bar.event.id}-w${wi}`}
                    href={`/events/${bar.event.id}`}
                    title={`${bar.event.name}${meta ? `  ·  ${meta}` : ''}`}
                    className="absolute z-10 flex items-center px-1.5 text-white text-xs leading-none overflow-hidden whitespace-nowrap hover:brightness-90 transition-all"
                    style={{
                      height: BAR_H,
                      top: TOP_PAD + bar.lane * LANE_H,
                      left:  `calc(${bar.colStart * pct}% + ${ml}px)`,
                      width: `calc(${bar.colSpan  * pct}% - ${ml + mr}px)`,
                      backgroundColor: color,
                      opacity: planning ? 0.6 : 1,
                      borderRadius: br,
                    }}
                  >
                    <span className="truncate">
                      {bar.continuesLeft  && '‹ '}
                      {bar.event.name}
                      {meta ? `  ·  ${meta}` : ''}
                      {bar.continuesRight && ' ›'}
                    </span>
                  </Link>
                )
              })}
            </div>
          )
        })}
      </div>

      {/* ── Mobile list ───────────────────────────────────────────────────── */}
      <div className="sm:hidden">
        <div className="px-4 py-2 bg-cream-50 border-b border-cream-200 text-sm font-semibold text-brown-600">
          {MONTH_NAMES[month - 1]} {year}
        </div>

        {listEvents.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-brown-400">No events this month.</p>
        ) : (
          <div className="divide-y divide-cream-100">
            {listEvents.map(event => {
              const color    = calEventColor(event.event_type)
              const planning = event.status === 'planning'
              const meta = [
                event.pax != null ? `${event.pax} guests` : null,
                event.location,
              ].filter(Boolean).join('  ·  ')
              return (
                <Link
                  key={event.id}
                  href={`/events/${event.id}`}
                  className="flex items-start gap-3 px-4 py-3 hover:bg-cream-50 transition-colors"
                >
                  <span
                    className="w-3 h-3 rounded-sm mt-0.5 shrink-0"
                    style={{ backgroundColor: color, opacity: planning ? 0.6 : 1 }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-brown-700 truncate">{event.name}</div>
                    <div className="text-xs text-brown-400 mt-0.5">
                      {mobileRange(event.start_date, event.end_date)}
                      {meta ? `  ·  ${meta}` : ''}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}

        {canCreate && (
          <div className="px-4 py-3 border-t border-cream-100">
            <Link href="/events/new" className="text-sm text-brown-500 hover:text-brown-700 transition-colors">
              + New event
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

function mobileRange(start: string, end: string): string {
  const fmt = (d: string, includeYear = false) => {
    const [y, m, dd] = d.split('-').map(Number)
    return new Intl.DateTimeFormat('en-US', {
      month: 'short', day: 'numeric',
      ...(includeYear && { year: 'numeric' }),
      timeZone: 'UTC',
    }).format(new Date(Date.UTC(y, m - 1, dd)))
  }
  if (start === end) return fmt(start, true)
  const [sy] = start.split('-')
  const [ey] = end.split('-')
  if (sy === ey) return `${fmt(start)} – ${fmt(end, true)}`
  return `${fmt(start, true)} – ${fmt(end, true)}`
}
