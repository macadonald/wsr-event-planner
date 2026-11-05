'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Event } from '@/lib/types'
import { getDisplayStatus, formatDateRangeWithDay, EVENT_TYPE_COLORS, STATUS_COLORS, STATUS_LABELS } from '@/lib/events'
import { relativeTime, formatTimestamp, isWithinHours } from '@/lib/time'

function EventCard({
  event,
  updaterName,
  recentHours,
  counts,
}: {
  event: Event
  updaterName: string | null
  recentHours: number
  counts: { total: number; done: number } | undefined
}) {
  const status = getDisplayStatus(event)
  const isChanged = isWithinHours(event.updated_at, recentHours)

  return (
    <Link
      href={`/events/${event.id}`}
      className="block bg-white border border-cream-200 rounded-xl p-4 shadow-sm hover:shadow-md hover:border-brown-200 transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-baseline gap-1.5">
            <h3 className="font-semibold text-brown-800 truncate">{event.name}</h3>
            {isChanged && (
              <span className="inline-block text-[10px] font-medium bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full leading-none shrink-0">
                Changed
              </span>
            )}
          </div>
          <p className="text-sm text-brown-400 mt-0.5">{formatDateRangeWithDay(event.start_date, event.end_date)}</p>
          {event.location && (
            <p className="text-xs text-brown-300 mt-0.5 truncate">{event.location}</p>
          )}
          <p className="text-xs text-brown-300 mt-0.5" title={formatTimestamp(event.updated_at)}>
            Updated {relativeTime(event.updated_at)}{updaterName ? ` by ${updaterName}` : ''}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          {event.event_type && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${EVENT_TYPE_COLORS[event.event_type] ?? 'bg-cream-200 text-brown-500'}`}>
              {event.event_type}
            </span>
          )}
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[status]}`}>
            {STATUS_LABELS[status]}
          </span>
          {counts && counts.total > 0 && (
            <span className="text-xs text-brown-300">
              {counts.done} / {counts.total} done
            </span>
          )}
          {event.pax != null && (
            <span className="text-xs text-brown-300">{event.pax} guests</span>
          )}
        </div>
      </div>
    </Link>
  )
}

export default function EventsList({
  current,
  upcoming,
  completed,
  profilesMap,
  recentHours,
  completionCounts,
}: {
  current: Event[]
  upcoming: Event[]
  completed: Event[]
  profilesMap: Record<string, string | null>
  recentHours: number
  completionCounts: Record<string, { total: number; done: number }>
}) {
  const [search, setSearch] = useState('')
  const [showCompleted, setShowCompleted] = useState(false)

  function filter(events: Event[]) {
    if (!search.trim()) return events
    const q = search.toLowerCase()
    return events.filter(e =>
      e.name.toLowerCase().includes(q) ||
      (e.location ?? '').toLowerCase().includes(q) ||
      (e.event_type ?? '').toLowerCase().includes(q)
    )
  }

  const filteredCurrent = filter(current)
  const filteredUpcoming = filter(upcoming)
  const filteredCompleted = filter(completed)
  const hasResults = filteredCurrent.length > 0 || filteredUpcoming.length > 0 || filteredCompleted.length > 0

  function cardProps(e: Event) {
    return {
      event: e,
      updaterName: e.updated_by ? (profilesMap[e.updated_by] ?? null) : null,
      recentHours,
      counts: completionCounts[e.id],
    }
  }

  return (
    <div className="space-y-6">
      <input
        type="search"
        placeholder="Search events…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full max-w-sm border border-cream-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brown-300"
      />

      {!hasResults && (
        <p className="text-sm text-brown-300 py-8 text-center">
          {search ? 'No events match your search.' : 'No events yet.'}
        </p>
      )}

      {filteredCurrent.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-brown-400 uppercase tracking-wider mb-3">Current</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCurrent.map(e => <EventCard key={e.id} {...cardProps(e)} />)}
          </div>
        </section>
      )}

      {filteredUpcoming.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-brown-400 uppercase tracking-wider mb-3">Upcoming</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredUpcoming.map(e => <EventCard key={e.id} {...cardProps(e)} />)}
          </div>
        </section>
      )}

      {filteredCompleted.length > 0 && (
        <section>
          <button
            onClick={() => setShowCompleted(v => !v)}
            className="flex items-center gap-2 text-xs font-semibold text-brown-400 uppercase tracking-wider mb-3 hover:text-brown-600 transition-colors"
          >
            <span>{showCompleted ? '▾' : '▸'}</span>
            Completed ({filteredCompleted.length})
          </button>
          {showCompleted && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 opacity-70">
              {filteredCompleted.map(e => <EventCard key={e.id} {...cardProps(e)} />)}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
