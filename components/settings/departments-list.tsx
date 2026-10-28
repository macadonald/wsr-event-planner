'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { Department, DepartmentWithRecipients } from '@/lib/types'
import {
  createDepartment,
  updateDepartment,
  moveDepartment,
  addRecipient,
  deleteRecipient,
} from '@/app/actions/departments'

export default function DepartmentsList({ departments }: { departments: DepartmentWithRecipients[] }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('')
  const [addName, setAddName] = useState('')
  const [addColor, setAddColor] = useState('#8B6355')
  const [addError, setAddError] = useState('')
  const [editError, setEditError] = useState('')
  const [recipientName, setRecipientName] = useState<Record<string, string>>({})
  const [recipientEmail, setRecipientEmail] = useState<Record<string, string>>({})
  const [recipientError, setRecipientError] = useState<Record<string, string>>({})

  function refresh() {
    startTransition(() => router.refresh())
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setAddError('')
    if (!addName.trim()) return
    const result = await createDepartment(addName, addColor)
    if (result.error) { setAddError(result.error); return }
    setAddName('')
    refresh()
  }

  function startEdit(dept: Department) {
    setEditingId(dept.id)
    setEditName(dept.name)
    setEditColor(dept.color)
    setEditError('')
  }

  async function handleSaveEdit(id: string) {
    setEditError('')
    const result = await updateDepartment(id, { name: editName, color: editColor })
    if (result.error) { setEditError(result.error); return }
    setEditingId(null)
    refresh()
  }

  async function handleToggleActive(dept: Department) {
    await updateDepartment(dept.id, { active: !dept.active })
    refresh()
  }

  async function handleMove(id: string, dir: 'up' | 'down') {
    await moveDepartment(id, dir)
    refresh()
  }

  async function handleAddRecipient(deptId: string, e: React.FormEvent) {
    e.preventDefault()
    setRecipientError(prev => ({ ...prev, [deptId]: '' }))
    const name = recipientName[deptId] ?? ''
    const email = recipientEmail[deptId] ?? ''
    if (!name.trim() || !email.trim()) return
    const result = await addRecipient(deptId, name, email)
    if (result.error) { setRecipientError(prev => ({ ...prev, [deptId]: result.error! })); return }
    setRecipientName(prev => ({ ...prev, [deptId]: '' }))
    setRecipientEmail(prev => ({ ...prev, [deptId]: '' }))
    refresh()
  }

  async function handleDeleteRecipient(id: string) {
    await deleteRecipient(id)
    refresh()
  }

  return (
    <div className="max-w-2xl space-y-3">
      {/* Add department form */}
      <form onSubmit={handleAdd} className="bg-white border border-cream-200 rounded-xl p-4 flex items-end gap-3 shadow-sm">
        <div className="flex-1">
          <label className="block text-xs font-medium text-brown-400 mb-1">New department name</label>
          <input
            value={addName}
            onChange={e => setAddName(e.target.value)}
            placeholder="e.g. Yoga"
            className="w-full border border-cream-300 rounded-lg px-3 py-2 text-sm text-brown-900 bg-cream-50 focus:outline-none focus:ring-2 focus:ring-brown-300"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-brown-400 mb-1">Color</label>
          <input
            type="color"
            value={addColor}
            onChange={e => setAddColor(e.target.value)}
            className="w-10 h-10 rounded cursor-pointer border border-cream-300"
          />
        </div>
        <button
          type="submit"
          className="bg-brown-500 hover:bg-brown-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          Add
        </button>
      </form>
      {addError && <p className="text-red-600 text-sm">{addError}</p>}

      {/* Department list */}
      {departments.map((dept, idx) => (
        <div
          key={dept.id}
          className={`bg-white border border-cream-200 rounded-xl shadow-sm overflow-hidden ${!dept.active ? 'opacity-60' : ''}`}
        >
          <div className="flex items-center gap-3 p-4">
            {/* Color swatch */}
            <div className="w-3 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: dept.color }} />

            {/* Name / edit */}
            {editingId === dept.id ? (
              <div className="flex items-center gap-2 flex-1">
                <input
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="border border-cream-300 rounded-lg px-2 py-1 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-brown-300"
                  autoFocus
                />
                <input
                  type="color"
                  value={editColor}
                  onChange={e => setEditColor(e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer border border-cream-300"
                />
                <button onClick={() => handleSaveEdit(dept.id)} className="text-xs text-brown-600 font-medium hover:underline">Save</button>
                <button onClick={() => setEditingId(null)} className="text-xs text-brown-300 hover:underline">Cancel</button>
                {editError && <span className="text-red-500 text-xs">{editError}</span>}
              </div>
            ) : (
              <span className="flex-1 text-sm font-medium text-brown-700">
                {dept.name}
                {!dept.active && <span className="ml-2 text-xs text-brown-300">(inactive)</span>}
              </span>
            )}

            {/* Actions */}
            {editingId !== dept.id && (
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => handleMove(dept.id, 'up')}
                  disabled={idx === 0}
                  className="p-1 text-brown-300 hover:text-brown-600 disabled:opacity-30 transition-colors"
                  title="Move up"
                >↑</button>
                <button
                  onClick={() => handleMove(dept.id, 'down')}
                  disabled={idx === departments.length - 1}
                  className="p-1 text-brown-300 hover:text-brown-600 disabled:opacity-30 transition-colors"
                  title="Move down"
                >↓</button>
                <button
                  onClick={() => startEdit(dept)}
                  className="text-xs text-brown-400 hover:text-brown-600 px-2 py-1 transition-colors"
                >Edit</button>
                <button
                  onClick={() => handleToggleActive(dept)}
                  className={`text-xs px-2 py-1 transition-colors ${
                    dept.active ? 'text-red-400 hover:text-red-600' : 'text-green-600 hover:text-green-700'
                  }`}
                >
                  {dept.active ? 'Deactivate' : 'Activate'}
                </button>
                <button
                  onClick={() => setExpandedId(expandedId === dept.id ? null : dept.id)}
                  className="text-xs text-brown-400 hover:text-brown-600 px-2 py-1 transition-colors"
                >
                  Recipients {expandedId === dept.id ? '▲' : '▼'}
                </button>
              </div>
            )}
          </div>

          {/* Recipients panel */}
          {expandedId === dept.id && (
            <div className="border-t border-cream-200 bg-cream-50 px-4 py-3 space-y-2">
              <p className="text-xs font-medium text-brown-400 uppercase tracking-wide">Email recipients</p>
              {dept.department_recipients.length === 0 && (
                <p className="text-xs text-brown-300">No recipients yet.</p>
              )}
              {dept.department_recipients.map(r => (
                <div key={r.id} className="flex items-center justify-between text-sm text-brown-700">
                  <span>{r.name} <span className="text-brown-300">—</span> {r.email}</span>
                  <button
                    onClick={() => handleDeleteRecipient(r.id)}
                    className="text-xs text-red-400 hover:text-red-600 ml-4"
                  >Remove</button>
                </div>
              ))}
              <form onSubmit={e => handleAddRecipient(dept.id, e)} className="flex gap-2 pt-1">
                <input
                  value={recipientName[dept.id] ?? ''}
                  onChange={e => setRecipientName(prev => ({ ...prev, [dept.id]: e.target.value }))}
                  placeholder="Name"
                  className="border border-cream-300 rounded px-2 py-1 text-xs w-32 focus:outline-none focus:ring-1 focus:ring-brown-300"
                />
                <input
                  type="email"
                  value={recipientEmail[dept.id] ?? ''}
                  onChange={e => setRecipientEmail(prev => ({ ...prev, [dept.id]: e.target.value }))}
                  placeholder="email@example.com"
                  className="border border-cream-300 rounded px-2 py-1 text-xs flex-1 focus:outline-none focus:ring-1 focus:ring-brown-300"
                />
                <button type="submit" className="text-xs bg-brown-500 text-white px-3 py-1 rounded hover:bg-brown-600 transition-colors">
                  Add
                </button>
              </form>
              {recipientError[dept.id] && (
                <p className="text-red-500 text-xs">{recipientError[dept.id]}</p>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
