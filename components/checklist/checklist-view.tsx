'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { Department } from '@/lib/types'
import type { ChecklistRow } from '@/app/(protected)/checklist/page'
import { markAssignmentDone } from '@/app/actions/assignments'
import { formatTime, formatTimestamp, relativeTime } from '@/lib/time'
import { shiftDate, assignmentDateLabel } from '@/lib/events'

function thisWeek(today: string): { from: string; to: string } {
  const [y, m, d] = today.split('-').map(Number)
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay()
  const mondayOffset = dow === 0 ? -6 : 1 - dow
  const sundayOffset = dow === 0 ? 0 : 7 - dow
  return { from: shiftDate(today, mondayOffset), to: shiftDate(today, sundayOffset) }
}

type DateFilter = 'today' | 'tomorrow' | 'thisweek' | 'custom'
type StatusFilter = 'pending' | 'done' | 'all'

export default function ChecklistView({
  assignments,
  departments,
  profilesMap,
  today,
}: {
  assignments: ChecklistRow[]
  departments: Department[]
  profilesMap: Record<string, string | null>
  today: string
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  const [dateFilter, setDateFilter] = useState<DateFilter>('today')
  const [customFrom, setCustomFrom] = useState(today)
  const [customTo, setCustomTo] = useState(today)
  const [selectedDeptIds, setSelectedDeptIds] = useState<Set<string>>(
    new Set(departments.map(d => d.id))
  )
  const [eventFilter, setEventFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [pending, setPending] = useState<Set<string>>(new Set())

  const week = thisWeek(today)
  const tomorrow = shiftDate(today, 1)

  function getDateRange(): { from: string; to: string } {
    if (dateFilter === 'today') return { from: today, to: today }
    if (dateFilter === 'tomorrow') return { from: tomorrow, to: tomorrow }
    if (dateFilter === 'thisweek') return week
    return { from: customFrom, to: customTo }
  }

  const { from: dateFrom, to: dateTo } = getDateRange()

  const allDeptChecked = departments.every(d => selectedDeptIds.has(d.id))
  const someDeptChecked = selectedDeptIds.size > 0

  function toggleDept(id: string) {
    const next = new Set(selectedDeptIds)
    if (next.has(id)) { next.delete(id) } else { next.add(id) }
    setSelectedDeptIds(next)
  }

  function toggleAllDepts() {
    if (allDeptChecked) {
      setSelectedDeptIds(new Set())
    } else {
      setSelectedDeptIds(new Set(departments.map(d => d.id)))
    }
  }

  // Gather unique events for the event filter dropdown
  const eventOptions = Array.from(
    new Map(
      assignments
        .filter(a => a.events)
        .map(a => [a.event_id, a.events!.name])
    ).entries()
  ).sort((a, b) => a[1].localeCompare(b[1]))

  // Apply filters
  const filtered = assignments.filter(a => {
    if (a.task_date < dateFrom || a.task_date > dateTo) return false
    if (!selectedDeptIds.has(a.department_id)) return false
    if (eventFilter !== 'all' && a.event_id !== eventFilter) return false
    if (statusFilter === 'pending' && a.completed_at !== null) return false
    if (statusFilter === 'done' && a.completed_at === null) return false
    return true
  })

  // Group: date → dept → sorted assignments
  const byDate = new Map<string, Map<string, ChecklistRow[]>>()
  for (const a of filtered) {
    if (!byDate.has(a.task_date)) byDate.set(a.task_date, new Map())
    const byDept = byDate.get(a.task_date)!
    if (!byDept.has(a.department_id)) byDept.set(a.department_id, [])
    byDept.get(a.department_id)!.push(a)
  }
  const dates = Array.from(byDate.keys()).sort()

  async function handleToggle(a: ChecklistRow) {
    if (pending.has(a.id)) return
    setPending(p => new Set(p).add(a.id))
    const done = a.completed_at === null
    await markAssignmentDone(a.id, a.event_id, done)
    setPending(p => { const next = new Set(p); next.delete(a.id); return next })
    startTransition(() => router.refresh())
  }

  function formatDateHeading(date: string): string {
    if (date === today) return 'Today'
    if (date === tomorrow) return 'Tomorrow'
    const [y, m, d] = date.split('-').map(Number)
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC',
    }).format(new Date(Date.UTC(y, m - 1, d)))
  }

  const deptMap = new Map(departments.map(d => [d.id, d]))

  const filterBar = (
    <div className="space-y-4">
      {/* Date filter */}
      <div>
        <label className="block text-xs font-semibold text-brown-400 uppercase tracking-wider mb-1.5">Date</label>
        <div className="flex flex-wrap gap-1.5">
          {(['today', 'tomorrow', 'thisweek', 'custom'] as DateFilter[]).map(f => (
            <button
              key={f}
              type="button"
              onClick={() => setDateFilter(f)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                dateFilter === f
                  ? 'bg-brown-500 text-white border-brown-500'
                  : 'border-cream-300 text-brown-500 bg-white hover:bg-cream-50'
              }`}
            >
              {f === 'today' ? 'Today' : f === 'tomorrow' ? 'Tomorrow' : f === 'thisweek' ? 'This week' : 'Custom'}
            </button>
          ))}
        </div>
        {dateFilter === 'custom' && (
          <div className="flex gap-2 mt-2">
            <input
              type="date"
              value={customFrom}
              onChange={e => { setCustomFrom(e.target.value); if (e.target.value > customTo) setCustomTo(e.target.value) }}
              className="border border-cream-300 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brown-300"
            />
            <span className="text-xs text-brown-300 self-center">to</span>
            <input
              type="date"
              value={customTo}
              min={customFrom}
              onChange={e => setCustomTo(e.target.value)}
              className="border border-cream-300 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brown-300"
            />
          </div>
        )}
      </div>

      {/* Department filter */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-semibold text-brown-400 uppercase tracking-wider">Departments</label>
          <button
            type="button"
            onClick={toggleAllDepts}
            className="text-xs text-brown-400 hover:text-brown-600 transition-colors"
          >
            {allDeptChecked ? 'Deselect all' : 'Select all'}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-y-1 gap-x-4">
          {departments.map(d => (
            <label key={d.id} className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={selectedDeptIds.has(d.id)}
                onChange={() => toggleDept(d.id)}
                className="rounded border-cream-300 text-brown-500 focus:ring-brown-300 flex-shrink-0"
              />
              <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
              <span className="text-xs text-brown-700 truncate">{d.name}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Event filter */}
      {eventOptions.length > 1 && (
        <div>
          <label className="block text-xs font-semibold text-brown-400 uppercase tracking-wider mb-1.5">Event</label>
          <select
            value={eventFilter}
            onChange={e => setEventFilter(e.target.value)}
            className="border border-cream-300 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brown-300 w-full max-w-xs"
          >
            <option value="all">All events</option>
            {eventOptions.map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Status filter */}
      <div>
        <label className="block text-xs font-semibold text-brown-400 uppercase tracking-wider mb-1.5">Status</label>
        <div className="flex rounded border border-cream-300 overflow-hidden text-xs w-fit">
          {(['pending', 'done', 'all'] as StatusFilter[]).map(f => (
            <button
              key={f}
              type="button"
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-1.5 capitalize transition-colors ${
                statusFilter === f ? 'bg-brown-500 text-white' : 'bg-white text-brown-500 hover:bg-cream-50'
              }`}
            >
              {f === 'pending' ? 'Not done' : f === 'done' ? 'Done' : 'All'}
            </button>
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-brown-700">Checklist</h1>
        {/* Mobile filter toggle */}
        <button
          type="button"
          onClick={() => setFiltersOpen(v => !v)}
          className="sm:hidden text-sm text-brown-500 border border-cream-300 px-3 py-1.5 rounded-lg"
        >
          Filters {filtersOpen ? '▴' : '▾'}
        </button>
      </div>

      <div className="flex gap-6 items-start">
        {/* Sidebar filters — desktop always visible, mobile collapsible */}
        <aside className={`w-56 shrink-0 ${filtersOpen ? 'block' : 'hidden'} sm:block`}>
          <div className="bg-white border border-cream-200 rounded-xl p-4 shadow-sm space-y-5">
            {filterBar}
          </div>
        </aside>

        {/* Assignment list */}
        <div className="flex-1 min-w-0 space-y-6">
          {filtered.length === 0 && (
            <p className="text-sm text-brown-300 py-8 text-center">
              {someDeptChecked ? 'No assignments match your filters.' : 'Select at least one department.'}
            </p>
          )}

          {dates.map(date => {
            const deptMap2 = byDate.get(date)!
            const deptIds = Array.from(deptMap2.keys()).sort((a, b) => {
              const ai = departments.findIndex(d => d.id === a)
              const bi = departments.findIndex(d => d.id === b)
              return ai - bi
            })

            return (
              <section key={date}>
                <h2 className="text-sm font-bold text-brown-600 mb-3 pb-1 border-b border-cream-200">
                  {formatDateHeading(date)}
                </h2>

                <div className="space-y-4">
                  {deptIds.map(deptId => {
                    const dept = deptMap.get(deptId)
                    const rows = deptMap2.get(deptId)!
                    const untimed = rows.filter(a => !a.task_time)
                    const timed = rows.filter(a => a.task_time).sort((a, b) =>
                      (a.task_time! > b.task_time! ? 1 : -1)
                    )
                    const sorted = [...untimed, ...timed]

                    return (
                      <div key={deptId}>
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <span
                            className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: dept?.color ?? '#888' }}
                          />
                          <span className="text-xs font-semibold text-brown-500 uppercase tracking-wide">
                            {dept?.name ?? 'Unknown'}
                          </span>
                        </div>

                        <div className="pl-4 space-y-1">
                          {sorted.map(a => {
                            const isDone = a.completed_at !== null
                            const isPending = pending.has(a.id)
                            const completerName = a.completed_by ? (profilesMap[a.completed_by] ?? null) : null
                            const timeLabel = a.task_time
                              ? `${a.time_type === 'by' ? 'By' : 'At'} ${formatTime(a.task_time)}`
                              : null
                            const dateLabel = a.events
                              ? assignmentDateLabel(a.task_date, a.events)
                              : null

                            return (
                              <label
                                key={a.id}
                                className={`flex items-start gap-3 py-2 px-2 rounded-lg cursor-pointer transition-colors ${
                                  isDone ? 'opacity-60' : 'hover:bg-cream-50'
                                } ${isPending ? 'opacity-50 pointer-events-none' : ''}`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isDone}
                                  onChange={() => handleToggle(a)}
                                  className="mt-0.5 rounded border-cream-300 text-brown-500 focus:ring-brown-300 flex-shrink-0 w-4 h-4"
                                />
                                <div className="flex-1 min-w-0">
                                  <p className={`text-sm leading-snug ${isDone ? 'line-through text-brown-300' : 'text-brown-700'}`}>
                                    {a.task}
                                  </p>
                                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                                    {timeLabel && (
                                      <span className="text-xs text-brown-400">{timeLabel}</span>
                                    )}
                                    {a.events && (
                                      <span className="text-xs text-brown-400">
                                        {a.events.name}
                                        {a.events.location ? ` · ${a.events.location}` : ''}
                                      </span>
                                    )}
                                    {dateLabel && (
                                      <span className="text-xs text-amber-600 font-medium">{dateLabel}</span>
                                    )}
                                    {a.notes && (
                                      <span className="text-xs text-brown-300">{a.notes}</span>
                                    )}
                                  </div>
                                  {isDone && (
                                    <p className="text-xs text-green-600 mt-0.5" title={a.completed_at ? formatTimestamp(a.completed_at) : ''}>
                                      Done{completerName ? ` by ${completerName}` : ''}{a.completed_at ? ` · ${relativeTime(a.completed_at)}` : ''}
                                    </p>
                                  )}
                                </div>
                              </label>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </div>
      </div>
    </div>
  )
}
