'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { EventBilling } from '@/lib/types'
import { upsertBilling } from '@/app/actions/billing'
import { formatDate } from '@/lib/time'

export default function BillingSection({
  eventId,
  billing,
}: {
  eventId: string
  billing: EventBilling | null
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [roomRental, setRoomRental] = useState(billing?.room_rental?.toString() ?? '')
  const [dueDate, setDueDate] = useState(billing?.billing_due_date ?? '')
  const [method, setMethod] = useState(billing?.billing_method ?? '')
  const [pkg, setPkg] = useState(billing?.package ?? '')
  const [notes, setNotes] = useState(billing?.notes ?? '')

  function handleCancel() {
    setRoomRental(billing?.room_rental?.toString() ?? '')
    setDueDate(billing?.billing_due_date ?? '')
    setMethod(billing?.billing_method ?? '')
    setPkg(billing?.package ?? '')
    setNotes(billing?.notes ?? '')
    setError('')
    setEditing(false)
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    const result = await upsertBilling(eventId, {
      room_rental: roomRental ? parseFloat(roomRental) : null,
      billing_due_date: dueDate || null,
      billing_method: method.trim() || null,
      package: pkg.trim() || null,
      notes: notes.trim() || null,
    })
    setSaving(false)
    if (result.error) { setError(result.error); return }
    setEditing(false)
    startTransition(() => router.refresh())
  }

  const hasBilling = billing && (
    billing.room_rental != null || billing.billing_due_date || billing.billing_method || billing.package || billing.notes
  )

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Billing</p>
        {!editing && (
          <button onClick={() => setEditing(true)} className="text-xs text-amber-600 hover:text-amber-800 transition-colors">
            Edit
          </button>
        )}
      </div>

      {editing ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-brown-400 mb-1">Room Rental ($)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={roomRental}
                onChange={e => setRoomRental(e.target.value)}
                className="w-full border border-cream-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brown-300"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-brown-400 mb-1">Payment Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full border border-cream-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brown-300"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-brown-400 mb-1">Billing Method</label>
              <input
                value={method}
                onChange={e => setMethod(e.target.value)}
                className="w-full border border-cream-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brown-300"
                placeholder="Credit card, invoice…"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-brown-400 mb-1">Package</label>
              <input
                value={pkg}
                onChange={e => setPkg(e.target.value)}
                className="w-full border border-cream-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brown-300"
                placeholder="All-inclusive, custom…"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-brown-400 mb-1">Billing Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              className="w-full border border-cream-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brown-300 resize-none"
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
            <button onClick={handleCancel} className="text-xs text-brown-400 hover:text-brown-600 px-3 py-1.5 rounded-lg transition-colors">
              Cancel
            </button>
          </div>
        </div>
      ) : hasBilling ? (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          {billing.room_rental != null && (
            <div>
              <dt className="text-xs text-brown-300">Room Rental</dt>
              <dd className="text-brown-700">${billing.room_rental.toLocaleString('en-US', { minimumFractionDigits: 2 })}</dd>
            </div>
          )}
          {billing.billing_due_date && (
            <div>
              <dt className="text-xs text-brown-300">Payment Due</dt>
              <dd className="text-brown-700">{formatDate(billing.billing_due_date)}</dd>
            </div>
          )}
          {billing.billing_method && (
            <div>
              <dt className="text-xs text-brown-300">Method</dt>
              <dd className="text-brown-700">{billing.billing_method}</dd>
            </div>
          )}
          {billing.package && (
            <div>
              <dt className="text-xs text-brown-300">Package</dt>
              <dd className="text-brown-700">{billing.package}</dd>
            </div>
          )}
          {billing.notes && (
            <div className="col-span-2">
              <dt className="text-xs text-brown-300">Notes</dt>
              <dd className="text-brown-700 whitespace-pre-wrap">{billing.notes}</dd>
            </div>
          )}
        </dl>
      ) : (
        <p className="text-sm text-amber-600">No billing info added.</p>
      )}
    </div>
  )
}
