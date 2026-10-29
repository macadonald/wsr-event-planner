'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { Event } from '@/lib/types'
import { updateEvent } from '@/app/actions/events'
import { formatPhone } from '@/lib/time'

export default function ContactsSection({ event, canEdit }: { event: Event; canEdit: boolean }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [contactName, setContactName] = useState(event.contact_name ?? '')
  const [contactPhone, setContactPhone] = useState(event.contact_phone ?? '')
  const [contactEmail, setContactEmail] = useState(event.contact_email ?? '')
  const [onsiteContact, setOnsiteContact] = useState(event.onsite_contact ?? '')

  const hasAny = event.contact_name || event.contact_phone || event.contact_email || event.onsite_contact

  function handleCancel() {
    setContactName(event.contact_name ?? '')
    setContactPhone(event.contact_phone ?? '')
    setContactEmail(event.contact_email ?? '')
    setOnsiteContact(event.onsite_contact ?? '')
    setError('')
    setEditing(false)
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    const result = await updateEvent(event.id, {
      contact_name: contactName.trim() || null,
      contact_phone: contactPhone.trim() || null,
      contact_email: contactEmail.trim() || null,
      onsite_contact: onsiteContact.trim() || null,
    })
    setSaving(false)
    if (result.error) { setError(result.error); return }
    setEditing(false)
    startTransition(() => router.refresh())
  }

  if (!editing && !hasAny && !canEdit) return null

  return (
    <div className="bg-white border border-cream-200 rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-semibold text-brown-400 uppercase tracking-wider">Contacts</p>
        {canEdit && !editing && (
          <button onClick={() => setEditing(true)} className="text-xs text-brown-400 hover:text-brown-600 transition-colors">
            Edit
          </button>
        )}
      </div>

      {editing ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-brown-400 mb-1">Contact Name</label>
              <input
                value={contactName}
                onChange={e => setContactName(e.target.value)}
                className="w-full border border-cream-300 rounded-lg px-3 py-2 text-sm bg-cream-50 focus:outline-none focus:ring-2 focus:ring-brown-300"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-brown-400 mb-1">Contact Phone</label>
              <input
                value={contactPhone}
                onChange={e => setContactPhone(formatPhone(e.target.value))}
                className="w-full border border-cream-300 rounded-lg px-3 py-2 text-sm bg-cream-50 focus:outline-none focus:ring-2 focus:ring-brown-300"
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
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-brown-400 mb-1">On-Site Contact</label>
              <input
                value={onsiteContact}
                onChange={e => setOnsiteContact(e.target.value)}
                className="w-full border border-cream-300 rounded-lg px-3 py-2 text-sm bg-cream-50 focus:outline-none focus:ring-2 focus:ring-brown-300"
              />
            </div>
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
            <button onClick={handleCancel} className="text-xs text-brown-400 hover:text-brown-600 px-3 py-1.5 rounded-lg transition-colors">
              Cancel
            </button>
          </div>
        </div>
      ) : hasAny ? (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          {event.contact_name && (
            <div>
              <dt className="text-xs text-brown-300">Contact</dt>
              <dd className="text-brown-700">{event.contact_name}</dd>
            </div>
          )}
          {event.contact_phone && (
            <div>
              <dt className="text-xs text-brown-300">Phone</dt>
              <dd className="text-brown-700">{event.contact_phone}</dd>
            </div>
          )}
          {event.contact_email && (
            <div className="col-span-2">
              <dt className="text-xs text-brown-300">Email</dt>
              <dd className="text-brown-700">{event.contact_email}</dd>
            </div>
          )}
          {event.onsite_contact && (
            <div className="col-span-2">
              <dt className="text-xs text-brown-300">On-Site Contact</dt>
              <dd className="text-brown-700">{event.onsite_contact}</dd>
            </div>
          )}
        </dl>
      ) : (
        <p className="text-sm text-brown-300">No contact info added.</p>
      )}
    </div>
  )
}
