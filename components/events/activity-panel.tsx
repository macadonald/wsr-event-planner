'use client'

import { useState } from 'react'
import type { EventActivity } from '@/lib/types'
import { relativeTime, formatTimestamp } from '@/lib/time'

const ACTION_STYLES: Record<string, string> = {
  added:   'text-green-700',
  edited:  'text-brown-500',
  deleted: 'text-red-600',
}

const ENTITY_LABELS: Record<string, string> = {
  assignment:   'Task',
  schedule_item: 'Schedule',
  note:         'Note',
  event:        'Event',
}

export default function ActivityPanel({ activity }: { activity: EventActivity[] }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="bg-white border border-cream-200 rounded-xl shadow-sm">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-3 text-left"
      >
        <span className="text-xs font-semibold text-brown-400 uppercase tracking-wider">
          Recent Changes
        </span>
        <span className="text-xs text-brown-300">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="px-5 pb-4 space-y-1 border-t border-cream-100">
          {activity.length === 0 ? (
            <p className="text-xs text-brown-300 py-2">No recorded changes yet.</p>
          ) : (
            activity.map(entry => (
              <div key={entry.id} className="py-1.5 border-b border-cream-100 last:border-0">
                <div className="flex items-baseline gap-1.5 flex-wrap">
                  <span className={`text-xs font-medium ${ACTION_STYLES[entry.action] ?? 'text-brown-500'}`}>
                    {entry.action}
                  </span>
                  <span className="text-xs text-brown-300">{ENTITY_LABELS[entry.entity_type] ?? entry.entity_type}</span>
                  <span className="text-xs text-brown-600 font-medium truncate max-w-xs">{entry.summary}</span>
                </div>
                <p
                  className="text-xs text-brown-300 mt-0.5"
                  title={formatTimestamp(entry.created_at)}
                >
                  {entry.actor_name ?? 'Unknown'}  ·  {relativeTime(entry.created_at)}
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
