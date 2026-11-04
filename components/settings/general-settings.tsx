'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { setRecentChangesHours } from '@/app/actions/settings'

const WINDOW_OPTIONS = [
  { label: '24 hours', value: 24 },
  { label: '48 hours', value: 48 },
  { label: '72 hours', value: 72 },
  { label: '7 days', value: 168 },
]

export default function GeneralSettings({ currentHours }: { currentHours: number }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [hours, setHours] = useState(currentHours)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    setSaving(true)
    await setRecentChangesHours(hours)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    startTransition(() => router.refresh())
  }

  return (
    <div className="bg-white border border-cream-200 rounded-xl p-5 shadow-sm max-w-md space-y-5">
      <div>
        <label className="block text-xs font-semibold text-brown-400 uppercase tracking-wider mb-1">
          &ldquo;Changed&rdquo; badge window
        </label>
        <p className="text-xs text-brown-300 mb-3">
          Assignments, schedule items, notes, and event cards show an amber &ldquo;Changed&rdquo; badge when updated within this window.
        </p>
        <div className="flex gap-2 flex-wrap">
          {WINDOW_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setHours(opt.value)}
              className={`text-xs px-3 py-1.5 rounded border transition-colors ${
                hours === opt.value
                  ? 'bg-brown-500 text-white border-brown-500'
                  : 'bg-white text-brown-500 border-cream-300 hover:bg-cream-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving || hours === currentHours}
        className="bg-brown-500 hover:bg-brown-600 text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-50 transition-colors"
      >
        {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save'}
      </button>
    </div>
  )
}
