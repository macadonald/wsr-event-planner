'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { Event, EventType } from '@/lib/types'
import { updateEvent } from '@/app/actions/events'
import { formatDate, formatTime } from '@/lib/time'
import { EVENT_TYPES } from '@/lib/events'
import TimePicker from '@/components/ui/time-picker'

export default function EventInfoSection({ event, canEdit }: { event: Event; canEdit: boolean }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [name, setName] = useState(event.name)
  const [eventType, setEventType] = useState<EventType | ''>(event.event_type ?? '')
  const [startDate, setStartDate] = useState(event.start_date)
  const [endDate, setEndDate] = useState(event.end_date)
  const [startTime, setStartTime] = useState(event.start_time ?? '')
  const [endTime, setEndTime] = useState(event.end_time ?? '')
  const [pax, setPax] = useState(event.pax?.toString() ?? '')
  const [location, setLocation] = useState(event.location ?? '')
  const [description, setDescription] = useState(event.description ?? '')

  function handleCancel() {
    setName(event.name)
    setEventType(event.event_type ?? '')
    setStartDate(event.start_date)
    setEndDate(event.end_date)
    setStartTime(event.start_time ?? '')
    setEndTime(event.end_time ?? '')
    setPax(event.pax?.toString() ?? '')
    setLocation(event.location ?? '')
    setDescription(event.description ?? '')
    setError('')
    setEditing(false)
  }

  async function handleSave() {
    if (!name.trim()) return
    if (endDate < startDate) { setError('End date must be on or after start date.'); return }
    setSaving(true)
    setError('')
    const result = await updateEvent(event.id, {
      name: name.trim(),
      event_type: (eventType as EventType) || null,
      start_date: startDate,
      end_date: endDate,
      start_time: startTime || null,
      end_time: endTime || null,
      pax: pax ? parseInt(pax) : null,
      location: location.trim() || null,
      description: description.trim() || null,
    })
    setSaving(false)
    if (result.error) { setError(result.error); return }
    setEditing(false)
    startTransition(() => router.refresh())
  }

  return (
    <div className="bg-white border border-cream-200 rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-semibold text-brown-400 uppercase tracking-wider">Event Info</p>
        {canEdit && !editing && (
          <button onClick={() => setEditing(true)} className="text-xs text-brown-400 hover:text-brown-600 transition-colors">
            Edit
          </button>
        )}
      </div>

      {editing ? (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-brown-400 mb-1">Name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full border border-cream-300 rounded-lg px-3 py-2 text-sm bg-cream-50 focus:outline-none focus:ring-2 focus:ring-brown-300"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-brown-400 mb-1">Event Type</label>
              <select
                value={eventType}
                onChange={e => setEventType(e.target.value as EventType | '')}
                className="w-full border border-cream-300 rounded-lg px-3 py-2 text-sm bg-cream-50 focus:outline-none focus:ring-2 focus:ring-brown-300"
              >
                <option value="">— None —</option>
                {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-brown-400 mb-1">Guests (Pax)</label>
              <input
                type="number"
                min="0"
                value={pax}
                onChange={e => setPax(e.target.value)}
                className="w-full border border-cream-300 rounded-lg px-3 py-2 text-sm bg-cream-50 focus:outline-none focus:ring-2 focus:ring-brown-300"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-brown-400 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={e => { setStartDate(e.target.value); if (e.target.value > endDate) setEndDate(e.target.value) }}
                className="w-full border border-cream-300 rounded-lg px-3 py-2 text-sm bg-cream-50 focus:outline-none focus:ring-2 focus:ring-brown-300"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-brown-400 mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                min={startDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full border border-cream-300 rounded-lg px-3 py-2 text-sm bg-cream-50 focus:outline-none focus:ring-2 focus:ring-brown-300"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-brown-400 mb-1">Start Time</label>
              <TimePicker size="md" value={startTime} onChange={setStartTime} placeholder="None" />
            </div>
            <div>
              <label className="block text-xs font-medium text-brown-400 mb-1">End Time</label>
              <TimePicker size="md" value={endTime} onChange={setEndTime} placeholder="None" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-brown-400 mb-1">Location</label>
            <input
              value={location}
              onChange={e => setLocation(e.target.value)}
              className="w-full border border-cream-300 rounded-lg px-3 py-2 text-sm bg-cream-50 focus:outline-none focus:ring-2 focus:ring-brown-300"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-brown-400 mb-1">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              className="w-full border border-cream-300 rounded-lg px-3 py-2 text-sm bg-cream-50 focus:outline-none focus:ring-2 focus:ring-brown-300 resize-none"
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-brown-500 hover:bg-brown-600 text-white text-xs font-medium px-4 py-1.5 rounded-lg disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={handleCancel}
              className="text-xs text-brown-400 hover:text-brown-600 px-3 py-1.5 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div className="col-span-2">
            <dt className="text-xs text-brown-300">Dates</dt>
            <dd className="text-brown-700 font-medium">
              {formatDate(event.start_date)}
              {event.start_date !== event.end_date && <> – {formatDate(event.end_date)}</>}
            </dd>
          </div>
          {(event.start_time || event.end_time) && (
            <div>
              <dt className="text-xs text-brown-300">Time</dt>
              <dd className="text-brown-700">
                {event.start_time ? formatTime(event.start_time) : ''}
                {event.start_time && event.end_time && ' – '}
                {event.end_time ? formatTime(event.end_time) : ''}
              </dd>
            </div>
          )}
          {event.pax != null && (
            <div>
              <dt className="text-xs text-brown-300">Guests</dt>
              <dd className="text-brown-700">{event.pax}</dd>
            </div>
          )}
          {event.event_type && (
            <div>
              <dt className="text-xs text-brown-300">Type</dt>
              <dd className="text-brown-700">{event.event_type}</dd>
            </div>
          )}
          {event.location && (
            <div className="col-span-2">
              <dt className="text-xs text-brown-300">Location</dt>
              <dd className="text-brown-700">{event.location}</dd>
            </div>
          )}
          {event.description && (
            <div className="col-span-2">
              <dt className="text-xs text-brown-300">Description</dt>
              <dd className="text-brown-700 whitespace-pre-wrap">{event.description}</dd>
            </div>
          )}
        </dl>
      )}
    </div>
  )
}
