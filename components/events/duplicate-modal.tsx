'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { Event } from '@/lib/types'
import { duplicateEvent } from '@/app/actions/events'
import { formatDateRange } from '@/lib/events'

export default function DuplicateModal({ event, onClose }: { event: Event; onClose: () => void }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [newStartDate, setNewStartDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleDuplicate() {
    if (!newStartDate) return
    setSaving(true)
    setError('')
    const result = await duplicateEvent(event.id, newStartDate)
    setSaving(false)
    if (result.error) { setError(result.error); return }
    onClose()
    startTransition(() => router.push(`/events/${result.id}`))
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl border border-cream-200 p-6 w-full max-w-sm space-y-4">
        <h2 className="text-base font-semibold text-brown-700">Duplicate Event</h2>
        <p className="text-sm text-brown-400">
          Duplicating <strong className="text-brown-600">{event.name}</strong> ({formatDateRange(event.start_date, event.end_date)}).
          All schedule items and assignments will be copied with dates shifted to match the new start date.
        </p>
        <div>
          <label className="block text-xs font-medium text-brown-400 mb-1">New Start Date</label>
          <input
            type="date"
            value={newStartDate}
            onChange={e => setNewStartDate(e.target.value)}
            className="w-full border border-cream-300 rounded-lg px-3 py-2 text-sm bg-cream-50 focus:outline-none focus:ring-2 focus:ring-brown-300"
          />
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <div className="flex gap-3">
          <button
            onClick={handleDuplicate}
            disabled={saving || !newStartDate}
            className="flex-1 bg-brown-500 hover:bg-brown-600 text-white text-sm font-medium py-2 rounded-lg disabled:opacity-50 transition-colors"
          >
            {saving ? 'Duplicating…' : 'Duplicate'}
          </button>
          <button
            onClick={onClose}
            className="flex-1 border border-cream-300 text-brown-500 text-sm py-2 rounded-lg hover:bg-cream-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
