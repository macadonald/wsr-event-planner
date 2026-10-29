'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { Event, ScheduleItem } from '@/lib/types'
import { createScheduleItem, updateScheduleItem, deleteScheduleItem } from '@/app/actions/schedule-items'
import { formatDateWithDay, formatTime } from '@/lib/time'
import { getDayCount, shiftDate } from '@/lib/events'
import TimePicker from '@/components/ui/time-picker'

function blankForm(defaultDate: string) {
  return { item_date: defaultDate, start_time: '', end_time: '', title: '', location: '', notes: '' }
}

type ItemForm = ReturnType<typeof blankForm>

function ItemRow({
  item,
  eventId,
  canEdit,
}: {
  item: ScheduleItem
  eventId: string
  canEdit: boolean
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<ItemForm>({
    item_date: item.item_date,
    start_time: item.start_time ?? '',
    end_time: item.end_time ?? '',
    title: item.title,
    location: item.location ?? '',
    notes: item.notes ?? '',
  })

  function set(k: keyof ItemForm, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSave() {
    if (!form.title.trim()) return
    setSaving(true)
    await updateScheduleItem(item.id, eventId, {
      item_date: form.item_date,
      start_time: form.start_time || null,
      end_time: form.end_time || null,
      title: form.title.trim(),
      location: form.location.trim() || null,
      notes: form.notes.trim() || null,
    })
    setSaving(false)
    setEditing(false)
    startTransition(() => router.refresh())
  }

  async function handleDelete() {
    if (!confirm('Remove this schedule item?')) return
    await deleteScheduleItem(item.id, eventId)
    startTransition(() => router.refresh())
  }

  if (editing) {
    return (
      <div className="border border-cream-200 rounded-lg p-3 space-y-2 bg-cream-50">
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-xs text-brown-300 mb-0.5">Date</label>
            <input type="date" value={form.item_date} onChange={e => set('item_date', e.target.value)}
              className="w-full border border-cream-300 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brown-300" />
          </div>
          <div>
            <label className="block text-xs text-brown-300 mb-0.5">Start</label>
            <TimePicker value={form.start_time} onChange={v => set('start_time', v)} />
          </div>
          <div>
            <label className="block text-xs text-brown-300 mb-0.5">End</label>
            <TimePicker value={form.end_time} onChange={v => set('end_time', v)} />
          </div>
        </div>
        <div>
          <label className="block text-xs text-brown-300 mb-0.5">Activity / Item</label>
          <input value={form.title} onChange={e => set('title', e.target.value)}
            className="w-full border border-cream-300 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brown-300" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-brown-300 mb-0.5">Location</label>
            <input value={form.location} onChange={e => set('location', e.target.value)}
              className="w-full border border-cream-300 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brown-300" />
          </div>
          <div>
            <label className="block text-xs text-brown-300 mb-0.5">Notes</label>
            <input value={form.notes} onChange={e => set('notes', e.target.value)}
              className="w-full border border-cream-300 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brown-300" />
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleSave} disabled={saving}
            className="bg-brown-500 hover:bg-brown-600 text-white text-xs px-3 py-1 rounded disabled:opacity-50 transition-colors">
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button onClick={() => setEditing(false)} className="text-xs text-brown-400 hover:text-brown-600 px-2 py-1">Cancel</button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-3 py-2 group">
      <div className="w-20 shrink-0 text-xs text-brown-400 pt-0.5">
        {item.start_time ? formatTime(item.start_time) : '—'}
        {item.end_time && <><br /><span className="text-brown-300">{formatTime(item.end_time)}</span></>}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-brown-700">{item.title}</p>
        {(item.location || item.notes) && (
          <p className="text-xs text-brown-400 mt-0.5">
            {item.location}{item.location && item.notes ? ' · ' : ''}{item.notes}
          </p>
        )}
      </div>
      {canEdit && (
        <div className="flex gap-1 shrink-0 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:transition-opacity">
          <button onClick={() => setEditing(true)} className="text-xs text-brown-400 hover:text-brown-600 px-1">Edit</button>
          <button onClick={handleDelete} className="text-xs text-red-400 hover:text-red-600 px-1">✕</button>
        </div>
      )}
    </div>
  )
}

export default function ScheduleSection({
  event,
  items,
  canEdit,
}: {
  event: Event
  items: ScheduleItem[]
  canEdit: boolean
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [addForm, setAddForm] = useState<ItemForm>(blankForm(event.start_date))

  function setAdd(k: keyof ItemForm, v: string) { setAddForm(f => ({ ...f, [k]: v })) }

  async function handleAdd() {
    if (!addForm.title.trim()) return
    setSaving(true)
    await createScheduleItem(event.id, {
      item_date: addForm.item_date,
      start_time: addForm.start_time || null,
      end_time: addForm.end_time || null,
      title: addForm.title.trim(),
      location: addForm.location.trim() || null,
      notes: addForm.notes.trim() || null,
    })
    setSaving(false)
    setAddForm(blankForm(event.start_date))
    setAdding(false)
    startTransition(() => router.refresh())
  }

  // Group items by date
  const dayCount = getDayCount(event.start_date, event.end_date)
  const days: string[] = Array.from({ length: dayCount }, (_, i) => shiftDate(event.start_date, i))

  // items not on a day within range appear at end under their own date
  const grouped = new Map<string, ScheduleItem[]>()
  for (const item of items) {
    const key = item.item_date
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(item)
  }

  // Collect all unique dates (event days + any out-of-range item dates)
  const allDates = Array.from(new Set([...days, ...Array.from(grouped.keys())])).sort()

  return (
    <div className="bg-white border border-cream-200 rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-semibold text-brown-400 uppercase tracking-wider">Schedule</p>
        {canEdit && !adding && (
          <button onClick={() => setAdding(true)} className="text-xs text-brown-400 hover:text-brown-600 transition-colors">
            + Add Item
          </button>
        )}
      </div>

      {/* Add form */}
      {adding && (
        <div className="border border-cream-200 rounded-lg p-3 space-y-2 bg-cream-50 mb-4">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs text-brown-300 mb-0.5">Date</label>
              <input type="date" value={addForm.item_date} min={event.start_date} max={event.end_date}
                onChange={e => setAdd('item_date', e.target.value)}
                className="w-full border border-cream-300 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brown-300" />
            </div>
            <div>
              <label className="block text-xs text-brown-300 mb-0.5">Start</label>
              <TimePicker value={addForm.start_time} onChange={v => setAdd('start_time', v)} />
            </div>
            <div>
              <label className="block text-xs text-brown-300 mb-0.5">End</label>
              <TimePicker value={addForm.end_time} onChange={v => setAdd('end_time', v)} />
            </div>
          </div>
          <div>
            <label className="block text-xs text-brown-300 mb-0.5">Activity / Item</label>
            <input value={addForm.title} onChange={e => setAdd('title', e.target.value)}
              placeholder="Group Ride, Welcome Dinner…"
              className="w-full border border-cream-300 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brown-300" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-brown-300 mb-0.5">Location</label>
              <input value={addForm.location} onChange={e => setAdd('location', e.target.value)}
                className="w-full border border-cream-300 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brown-300" />
            </div>
            <div>
              <label className="block text-xs text-brown-300 mb-0.5">Notes</label>
              <input value={addForm.notes} onChange={e => setAdd('notes', e.target.value)}
                className="w-full border border-cream-300 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brown-300" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} disabled={saving || !addForm.title.trim()}
              className="bg-brown-500 hover:bg-brown-600 text-white text-xs px-3 py-1 rounded disabled:opacity-50 transition-colors">
              {saving ? 'Adding…' : 'Add'}
            </button>
            <button onClick={() => { setAdding(false); setAddForm(blankForm(event.start_date)) }}
              className="text-xs text-brown-400 hover:text-brown-600 px-2 py-1">Cancel</button>
          </div>
        </div>
      )}

      {items.length === 0 && !adding ? (
        <p className="text-sm text-brown-300">No schedule items yet.</p>
      ) : (
        <div className="space-y-4">
          {allDates.map(date => {
            const dayItems = grouped.get(date) ?? []
            if (dayItems.length === 0) return null
            return (
              <div key={date}>
                <p className="text-xs font-semibold text-brown-500 mb-1">{formatDateWithDay(date)}</p>
                <div className="divide-y divide-cream-100">
                  {dayItems.map(item => (
                    <ItemRow key={item.id} item={item} eventId={event.id} canEdit={canEdit} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
