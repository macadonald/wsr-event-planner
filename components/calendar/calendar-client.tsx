'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  prevMonth, nextMonth, addDays, getWeekDays,
  CAL_EVENT_COLORS,
  type CalendarEvent, type CalendarTask,
} from '@/lib/calendar'
import MonthView from './month-view'
import WeekView from './week-view'

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

type Props = {
  view: 'month' | 'week'
  year: number
  month: number
  weekAnchor: string
  events: CalendarEvent[]
  tasks: CalendarTask[]
  role: string
  today: string
}

export default function CalendarClient({
  view, year, month, weekAnchor, events, tasks, role, today,
}: Props) {
  const router = useRouter()
  const [showTasks, setShowTasks] = useState(false)

  const canCreate = role === 'admin' || role === 'planner'

  function nav(params: Record<string, string>) {
    const sp = new URLSearchParams(params)
    router.push(`/calendar?${sp}`)
  }

  function handlePrev() {
    if (view === 'month') {
      const { y, m } = prevMonth(year, month)
      nav({ view: 'month', y: String(y), m: String(m) })
    } else {
      nav({ view: 'week', date: addDays(weekAnchor, -7) })
    }
  }

  function handleNext() {
    if (view === 'month') {
      const { y, m } = nextMonth(year, month)
      nav({ view: 'month', y: String(y), m: String(m) })
    } else {
      nav({ view: 'week', date: addDays(weekAnchor, 7) })
    }
  }

  function handleToday() {
    if (view === 'month') {
      const [y, m] = today.split('-').map(Number)
      nav({ view: 'month', y: String(y), m: String(m) })
    } else {
      nav({ view: 'week', date: today })
    }
  }

  function handleDayClick(date: string) {
    if (canCreate) router.push(`/events/new?date=${date}`)
  }

  // Title
  const weekDays = getWeekDays(weekAnchor)
  const title = view === 'month'
    ? `${MONTH_NAMES[month - 1]} ${year}`
    : shortRangeLabel(weekDays[0], weekDays[6])

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        {/* Left: nav buttons + title */}
        <div className="flex items-center gap-1">
          <button
            onClick={handlePrev}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-brown-500 hover:bg-cream-200 transition-colors text-lg leading-none"
            aria-label="Previous"
          >
            ‹
          </button>
          <button
            onClick={handleToday}
            className="px-3 h-8 text-sm rounded-lg text-brown-600 hover:bg-cream-200 transition-colors border border-cream-300"
          >
            Today
          </button>
          <button
            onClick={handleNext}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-brown-500 hover:bg-cream-200 transition-colors text-lg leading-none"
            aria-label="Next"
          >
            ›
          </button>
          <h2 className="ml-2 text-lg font-semibold text-brown-700">{title}</h2>
        </div>

        {/* Right: show-tasks toggle + Month/Week switcher */}
        <div className="flex items-center gap-3">
          {view === 'week' && (
            <label className="flex items-center gap-1.5 text-sm text-brown-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showTasks}
                onChange={e => setShowTasks(e.target.checked)}
                className="rounded border-cream-400 text-brown-600 focus:ring-brown-400"
              />
              Show tasks
            </label>
          )}
          <div className="flex rounded-lg border border-cream-300 overflow-hidden">
            <button
              onClick={() => view !== 'month' && nav({ view: 'month', y: String(year), m: String(month) })}
              className={`px-3 py-1 text-sm transition-colors ${
                view === 'month'
                  ? 'bg-brown-600 text-white'
                  : 'text-brown-600 hover:bg-cream-100'
              }`}
            >
              Month
            </button>
            <button
              onClick={() => view !== 'week' && nav({ view: 'week', date: weekAnchor })}
              className={`px-3 py-1 text-sm border-l border-cream-300 transition-colors ${
                view === 'week'
                  ? 'bg-brown-600 text-white'
                  : 'text-brown-600 hover:bg-cream-100'
              }`}
            >
              Week
            </button>
          </div>
        </div>
      </div>

      {view === 'month' ? (
        <MonthView
          events={events}
          year={year}
          month={month}
          today={today}
          canCreate={canCreate}
          onDayClick={handleDayClick}
        />
      ) : (
        <WeekView
          events={events}
          tasks={showTasks ? tasks : []}
          weekDays={weekDays}
          today={today}
          canCreate={canCreate}
          onDayClick={handleDayClick}
        />
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-4 pt-3 border-t border-cream-200">
        {Object.entries(CAL_EVENT_COLORS).map(([label, color]) => (
          <div key={label} className="flex items-center gap-1.5 text-xs text-brown-500">
            <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: color }} />
            {label}
          </div>
        ))}
        <div className="flex items-center gap-1.5 text-xs text-brown-400">
          <span className="w-3 h-3 rounded-sm border border-brown-300 opacity-50 shrink-0" />
          Planning (faded)
        </div>
      </div>
    </div>
  )
}

function shortRangeLabel(start: string, end: string): string {
  const fmt = (d: string) => {
    const [y, m, dd] = d.split('-').map(Number)
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
      .format(new Date(Date.UTC(y, m - 1, dd)))
  }
  const endYear = end.split('-')[0]
  return `${fmt(start)} – ${fmt(end)}, ${endYear}`
}
