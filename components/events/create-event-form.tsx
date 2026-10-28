'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createEvent } from '@/app/actions/events'
import { EVENT_TYPES } from '@/lib/events'
import { todayInPhoenix } from '@/lib/time'
import type { EventType } from '@/lib/types'

export default function CreateEventForm() {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const today = todayInPhoenix()

  const [name, setName] = useState('')
  const [eventType, setEventType] = useState<EventType | ''>('')
  const [startDate, setStartDate] = useState(today)
  const [endDate, setEndDate] = useState(today)
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [pax, setPax] = useState('')
  const [location, setLocation] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [onsiteContact, setOnsiteContact] = useState('')
  const [description, setDescription] = useState('')
  const [specialNotes, setSpecialNotes] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !startDate || !endDate) return
    if (endDate < startDate) { setError('End date must be on or after start date.'); return }
    setSaving(true)
    setError('')
    const result = await createEvent({
      name: name.trim(),
      event_type: (eventType as EventType) || null,
      start_date: startDate,
      end_date: endDate,
      start_time: startTime || null,
      end_time: endTime || null,
      pax: pax ? parseInt(pax) : null,
      location: location.trim() || null,
      contact_name: contactName.trim() || null,
      contact_phone: contactPhone.trim() || null,
      contact_email: contactEmail.trim() || null,
      onsite_contact: onsiteContact.trim() || null,
      description: description.trim() || null,
      special_notes: specialNotes.trim() || null,
      status: 'planning',
    })
    setSaving(false)
    if (result.error) { setError(result.error); return }
    startTransition(() => router.push(`/events/${result.id}`))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Core info */}
      <div className="bg-white border border-cream-200 rounded-xl p-5 shadow-sm space-y-4">
        <p className="text-xs font-semibold text-brown-400 uppercase tracking-wider">Event Info</p>

        <div>
          <label className="block text-xs font-medium text-brown-400 mb-1">Group / Event Name <span className="text-red-400">*</span></label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            required
            className="w-full border border-cream-300 rounded-lg px-3 py-2 text-sm bg-cream-50 focus:outline-none focus:ring-2 focus:ring-brown-300"
            placeholder="Smith Family Reunion"
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
              <option value="">— Select —</option>
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
              placeholder="24"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-brown-400 mb-1">Start Date <span className="text-red-400">*</span></label>
            <input
              type="date"
              value={startDate}
              onChange={e => {
                setStartDate(e.target.value)
                if (e.target.value > endDate) setEndDate(e.target.value)
              }}
              required
              className="w-full border border-cream-300 rounded-lg px-3 py-2 text-sm bg-cream-50 focus:outline-none focus:ring-2 focus:ring-brown-300"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-brown-400 mb-1">End Date <span className="text-red-400">*</span></label>
            <input
              type="date"
              value={endDate}
              min={startDate}
              onChange={e => setEndDate(e.target.value)}
              required
              className="w-full border border-cream-300 rounded-lg px-3 py-2 text-sm bg-cream-50 focus:outline-none focus:ring-2 focus:ring-brown-300"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-brown-400 mb-1">Arrival / Start Time</label>
            <input
              type="time"
              value={startTime}
              onChange={e => setStartTime(e.target.value)}
              className="w-full border border-cream-300 rounded-lg px-3 py-2 text-sm bg-cream-50 focus:outline-none focus:ring-2 focus:ring-brown-300"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-brown-400 mb-1">End Time</label>
            <input
              type="time"
              value={endTime}
              onChange={e => setEndTime(e.target.value)}
              className="w-full border border-cream-300 rounded-lg px-3 py-2 text-sm bg-cream-50 focus:outline-none focus:ring-2 focus:ring-brown-300"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-brown-400 mb-1">Location</label>
          <input
            value={location}
            onChange={e => setLocation(e.target.value)}
            className="w-full border border-cream-300 rounded-lg px-3 py-2 text-sm bg-cream-50 focus:outline-none focus:ring-2 focus:ring-brown-300"
            placeholder="Longhorn Room / Sunrise Patio"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-brown-400 mb-1">Description</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={2}
            className="w-full border border-cream-300 rounded-lg px-3 py-2 text-sm bg-cream-50 focus:outline-none focus:ring-2 focus:ring-brown-300 resize-none"
            placeholder="Brief overview of the event…"
          />
        </div>
      </div>

      {/* Contacts */}
      <div className="bg-white border border-cream-200 rounded-xl p-5 shadow-sm space-y-4">
        <p className="text-xs font-semibold text-brown-400 uppercase tracking-wider">Contacts</p>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-brown-400 mb-1">Contact Name</label>
            <input
              value={contactName}
              onChange={e => setContactName(e.target.value)}
              className="w-full border border-cream-300 rounded-lg px-3 py-2 text-sm bg-cream-50 focus:outline-none focus:ring-2 focus:ring-brown-300"
              placeholder="Jane Smith"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-brown-400 mb-1">Contact Phone</label>
            <input
              value={contactPhone}
              onChange={e => setContactPhone(e.target.value)}
              className="w-full border border-cream-300 rounded-lg px-3 py-2 text-sm bg-cream-50 focus:outline-none focus:ring-2 focus:ring-brown-300"
              placeholder="(520) 555-1234"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-brown-400 mb-1">Contact Email</label>
            <input
              type="email"
              value={contactEmail}
              onChange={e => setContactEmail(e.target.value)}
              className="w-full border border-cream-300 rounded-lg px-3 py-2 text-sm bg-cream-50 focus:outline-none focus:ring-2 focus:ring-brown-300"
              placeholder="jane@example.com"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-brown-400 mb-1">On-Site Contact</label>
            <input
              value={onsiteContact}
              onChange={e => setOnsiteContact(e.target.value)}
              className="w-full border border-cream-300 rounded-lg px-3 py-2 text-sm bg-cream-50 focus:outline-none focus:ring-2 focus:ring-brown-300"
              placeholder="Bob (cell: …)"
            />
          </div>
        </div>
      </div>

      {/* Special notes */}
      <div className="bg-white border border-cream-200 rounded-xl p-5 shadow-sm space-y-4">
        <p className="text-xs font-semibold text-brown-400 uppercase tracking-wider">Special Notes</p>
        <textarea
          value={specialNotes}
          onChange={e => setSpecialNotes(e.target.value)}
          rows={3}
          className="w-full border border-cream-300 rounded-lg px-3 py-2 text-sm bg-cream-50 focus:outline-none focus:ring-2 focus:ring-brown-300 resize-none"
          placeholder="Dietary restrictions, VIPs, setup notes…"
        />
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="bg-brown-500 hover:bg-brown-600 text-white text-sm font-medium px-6 py-2 rounded-lg transition-colors disabled:opacity-50"
        >
          {saving ? 'Creating…' : 'Create Event'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm text-brown-400 hover:text-brown-600 px-4 py-2 rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
