'use client'

import Link from 'next/link'
import { getEventBarsForWeek, calEventColor, type CalendarEvent, type CalendarTask } from '@/lib/calendar'
import { formatTime } from '@/lib/time'

const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const BAR_H   = 22
const BAR_GAP = 3
const LANE_H  = BAR_H + BAR_GAP

type Props = {
  events: CalendarEvent[]
  tasks: CalendarTask[]       // empty array when showTasks is off
  weekDays: string[]          // 7 date strings, Sun first
  today: string
  canCreate: boolean
  onDayClick: (date: string) => void
}

export default function WeekView({ events, tasks, weekDays, today, canCreate, onDayClick }: Props) {
  const bars = getEventBarsForWeek(events, weekDays)
  const maxLane = bars.length > 0 ? Math.max(...bars.map(b => b.lane)) : -1
  const eventsAreaH = 8 + (maxLane >= 0 ? (maxLane + 1) * LANE_H : 0) + 8

  // Group tasks by date
  const tasksByDate: Record<string, CalendarTask[]> = {}
  for (const t of tasks) {
    if (!tasksByDate[t.task_date]) tasksByDate[t.task_date] = []
    tasksByDate[t.task_date].push(t)
  }
  const hasTasks = tasks.length > 0

  return (
    <div className="bg-white border border-cream-200 rounded-xl overflow-hidden shadow-sm">

      {/* Header: day names + numbers */}
      <div className="grid grid-cols-7 border-b border-cream-200 bg-cream-50">
        {weekDays.map((day, i) => {
          const isToday  = day === today
          const dayNum   = parseInt(day.split('-')[2])
          return (
            <div
              key={day}
              className={`p-2 text-center border-r border-cream-200 last:border-r-0 transition-colors
                ${canCreate ? 'cursor-pointer hover:bg-amber-50/60' : ''}`}
              onClick={() => canCreate && onDayClick(day)}
            >
              <div className="text-xs text-brown-400 uppercase tracking-wide">{DAY_SHORT[i]}</div>
              <div className={`
                w-8 h-8 mx-auto mt-0.5 flex items-center justify-center rounded-full
                text-sm font-semibold
                ${isToday ? 'bg-brown-600 text-white' : 'text-brown-700'}
              `}>
                {dayNum}
              </div>
            </div>
          )
        })}
      </div>

      {/* Events area */}
      <div className="relative border-b border-cream-200" style={{ height: eventsAreaH }}>
        {/* Day column clickable backgrounds */}
        <div className="absolute inset-0 grid grid-cols-7">
          {weekDays.map(day => (
            <div
              key={day}
              className={`border-r border-cream-100 last:border-r-0 h-full transition-colors
                ${canCreate ? 'cursor-pointer hover:bg-amber-50/60' : ''}`}
              onClick={() => canCreate && onDayClick(day)}
            />
          ))}
        </div>

        {/* Event bars */}
        {bars.map(bar => {
          const color    = calEventColor(bar.event.event_type)
          const planning = bar.event.status === 'planning'
          const pct      = 100 / 7
          const ml = bar.continuesLeft  ? 0 : 2
          const mr = bar.continuesRight ? 0 : 2
          const br = `${bar.continuesLeft ? 0 : 4}px ${bar.continuesRight ? 0 : 4}px ${bar.continuesRight ? 0 : 4}px ${bar.continuesLeft ? 0 : 4}px`

          const meta = [
            bar.event.pax != null ? `${bar.event.pax} guests` : null,
            bar.event.location,
          ].filter(Boolean).join('  ·  ')

          return (
            <Link
              key={`${bar.event.id}-wb`}
              href={`/events/${bar.event.id}`}
              title={`${bar.event.name}${meta ? `  ·  ${meta}` : ''}`}
              className="absolute z-10 flex items-center gap-1.5 px-2 text-white text-xs leading-none overflow-hidden whitespace-nowrap hover:brightness-90 transition-all"
              style={{
                height: BAR_H,
                top:   8 + bar.lane * LANE_H,
                left:  `calc(${bar.colStart * pct}% + ${ml}px)`,
                width: `calc(${bar.colSpan  * pct}% - ${ml + mr}px)`,
                backgroundColor: color,
                opacity: planning ? 0.6 : 1,
                borderRadius: br,
              }}
            >
              <span className="font-medium truncate">{bar.event.name}</span>
              {meta && <span className="opacity-80 truncate">{meta}</span>}
            </Link>
          )
        })}
      </div>

      {/* Tasks panel */}
      {hasTasks && (
        <div className="grid grid-cols-7">
          {weekDays.map(day => {
            const dayTasks = tasksByDate[day] ?? []
            return (
              <div
                key={`tasks-${day}`}
                className="border-r border-cream-200 last:border-r-0 p-1.5 min-h-[56px]"
              >
                {dayTasks.map(task => (
                  <div key={task.id} className="flex items-start gap-1 mb-1 text-xs text-brown-600 leading-snug">
                    <span
                      className="w-2 h-2 rounded-full shrink-0 mt-0.5"
                      style={{ backgroundColor: task.dept_color }}
                    />
                    <span>
                      {task.task_time && (
                        <span className="text-brown-400 mr-0.5">{formatTime(task.task_time)} </span>
                      )}
                      {task.task}
                    </span>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
