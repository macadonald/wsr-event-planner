'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Event } from '@/lib/types'
import { getDisplayStatus, formatDateRangeWithDay, EVENT_TYPE_COLORS, STATUS_COLORS, STATUS_LABELS } from '@/lib/events'

function EventCard({ event }: { event: Event }) {
  const status = getDisplayStatus(event)
  return (
    <Link
      href={`/events/${event.id}`}
      className="block bg-white border border-cream-200 rounded-xl p-4 shadow-sm hover:shadow-md hover:border-brown-200 transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-brown-800 truncate">{event.name}</h3>
          <p className="text-sm text-brown-400 mt-0.5">{formatDateRangeWithDay(event.start_date, event.end_date)}</p>
          {event.location && (
            <p className="text-xs text-brown-300 mt-0.5 truncate">{event.location}</p>
          )}
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
          {event.pax != null && (
            <span className="text-xs text-brown-300">{event.pax} guests</span>
          )}
        </div>
      </div>
    </Link>
  )
}

export default function EventsList({
  upcoming,
  past,
}: {
  upcoming: Event[]
  past: Event[]
}) {
  const [search, setSearch] = useState('')

  function filter(events: Event[]) {
    if (!search.trim()) return events
    const q = search.toLowerCase()
    return events.filter(e =>
      e.name.toLowerCase().includes(q) ||
      (e.location ?? '').toLowerCase().includes(q) ||
      (e.event_type ?? '').toLowerCase().includes(q)
    )
  }

  const filteredUpcoming = filter(upcoming)
  const filteredPast = filter(past)
  const hasResults = filteredUpcoming.length > 0 || filteredPast.length > 0

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

      {filteredUpcoming.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-brown-400 uppercase tracking-wider mb-3">Upcoming</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredUpcoming.map(e => <EventCard key={e.id} event={e} />)}
          </div>
        </section>
      )}

      {filteredPast.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-brown-400 uppercase tracking-wider mb-3">Past</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 opacity-70">
            {filteredPast.map(e => <EventCard key={e.id} event={e} />)}
          </div>
        </section>
      )}
    </div>
  )
}
