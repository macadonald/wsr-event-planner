'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { EventNote } from '@/lib/types'
import { createNote, updateNote, deleteNote } from '@/app/actions/event-notes'
import type { NoteFormData } from '@/app/actions/event-notes'
import { formatDateWithDay } from '@/lib/time'

function blankForm(): NoteFormData {
  return { content: '', note_date: null, print_on_dept_sheets: false }
}

function NoteRow({
  note,
  eventId,
  canEdit,
}: {
  note: EventNote
  eventId: string
  canEdit: boolean
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<NoteFormData>({
    content: note.content,
    note_date: note.note_date,
    print_on_dept_sheets: note.print_on_dept_sheets,
  })

  async function handleSave() {
    if (!form.content.trim()) return
    setSaving(true)
    await updateNote(note.id, eventId, form)
    setSaving(false)
    setEditing(false)
    startTransition(() => router.refresh())
  }

  async function handleDelete() {
    if (!confirm('Delete this note?')) return
    await deleteNote(note.id, eventId)
    startTransition(() => router.refresh())
  }

  if (editing) {
    return (
      <div className="border border-cream-200 rounded-lg p-3 space-y-2 bg-cream-50">
        <textarea
          value={form.content}
          onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
          rows={3}
          className="w-full border border-cream-300 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brown-300 resize-none"
        />
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <label className="block text-xs text-brown-300 mb-0.5">Date (optional)</label>
            <input
              type="date"
              value={form.note_date ?? ''}
              onChange={e => setForm(f => ({ ...f, note_date: e.target.value || null }))}
              className="border border-cream-300 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brown-300"
            />
          </div>
          <label className="flex items-center gap-1.5 text-xs text-brown-600 cursor-pointer mt-3">
            <input
              type="checkbox"
              checked={form.print_on_dept_sheets}
              onChange={e => setForm(f => ({ ...f, print_on_dept_sheets: e.target.checked }))}
              className="rounded border-cream-400 text-brown-600 focus:ring-brown-400"
            />
            Print on dept sheets
          </label>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving || !form.content.trim()}
            className="bg-brown-500 hover:bg-brown-600 text-white text-xs px-3 py-1 rounded disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button onClick={() => setEditing(false)} className="text-xs text-brown-400 hover:text-brown-600 px-2 py-1">
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-2 py-2 group border-b border-cream-100 last:border-b-0">
      <div className="flex-1 min-w-0">
        {note.note_date && (
          <p className="text-xs text-brown-400 mb-0.5">{formatDateWithDay(note.note_date)}</p>
        )}
        <p className="text-sm text-brown-700 whitespace-pre-wrap leading-snug">{note.content}</p>
        {note.print_on_dept_sheets && (
          <p className="text-xs text-brown-400 mt-0.5">Prints on dept sheets</p>
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

type Props = {
  eventId: string
  notes: EventNote[]
  canEdit: boolean
}

export default function NotesSection({ eventId, notes, canEdit }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [addForm, setAddForm] = useState<NoteFormData>(blankForm())

  async function handleAdd() {
    if (!addForm.content.trim()) return
    setSaving(true)
    await createNote(eventId, addForm)
    setSaving(false)
    setAddForm(blankForm())
    setAdding(false)
    startTransition(() => router.refresh())
  }

  return (
    <div className="bg-white border border-cream-200 rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-semibold text-brown-400 uppercase tracking-wider">Notes</p>
        {canEdit && !adding && (
          <button onClick={() => setAdding(true)} className="text-xs text-brown-400 hover:text-brown-600 transition-colors">
            + Add Note
          </button>
        )}
      </div>

      {adding && (
        <div className="border border-cream-200 rounded-lg p-3 space-y-2 bg-cream-50 mb-4">
          <textarea
            value={addForm.content}
            onChange={e => setAddForm(f => ({ ...f, content: e.target.value }))}
            rows={3}
            placeholder="Dietary restrictions, VIPs, setup notes…"
            autoFocus
            className="w-full border border-cream-300 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brown-300 resize-none"
          />
          <div className="flex items-center gap-4 flex-wrap">
            <div>
              <label className="block text-xs text-brown-300 mb-0.5">Date (optional)</label>
              <input
                type="date"
                value={addForm.note_date ?? ''}
                onChange={e => setAddForm(f => ({ ...f, note_date: e.target.value || null }))}
                className="border border-cream-300 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brown-300"
              />
            </div>
            <label className="flex items-center gap-1.5 text-xs text-brown-600 cursor-pointer mt-3">
              <input
                type="checkbox"
                checked={addForm.print_on_dept_sheets}
                onChange={e => setAddForm(f => ({ ...f, print_on_dept_sheets: e.target.checked }))}
                className="rounded border-cream-400 text-brown-600 focus:ring-brown-400"
              />
              Print on dept sheets
            </label>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={saving || !addForm.content.trim()}
              className="bg-brown-500 hover:bg-brown-600 text-white text-xs px-3 py-1 rounded disabled:opacity-50 transition-colors"
            >
              {saving ? 'Adding…' : 'Add Note'}
            </button>
            <button onClick={() => { setAdding(false); setAddForm(blankForm()) }} className="text-xs text-brown-400 hover:text-brown-600 px-2 py-1">
              Cancel
            </button>
          </div>
        </div>
      )}

      {notes.length === 0 && !adding ? (
        <p className="text-sm text-brown-300">No notes yet.</p>
      ) : (
        <div>
          {notes.map(note => (
            <NoteRow key={note.id} note={note} eventId={eventId} canEdit={canEdit} />
          ))}
        </div>
      )}
    </div>
  )
}
