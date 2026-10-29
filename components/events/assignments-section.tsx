'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { Assignment, Department, Event, TimeType } from '@/lib/types'
import { createAssignments, updateAssignment, deleteAssignment, deleteAssignmentGroup } from '@/app/actions/assignments'
import type { AssignmentFormData } from '@/app/actions/assignments'
import { formatDateWithDay, formatDateShortWithDay, formatTime } from '@/lib/time'
import { getDayCount, shiftDate } from '@/lib/events'
import TimePicker from '@/components/ui/time-picker'

// ── helpers ──────────────────────────────────────────────────────────────────

function formatAssignmentTime(task_time: string | null, time_type: TimeType): string | null {
  if (!task_time) return null
  return `${time_type === 'by' ? 'By' : 'At'} ${formatTime(task_time)}`
}

function blankForm(defaultDate: string): AssignmentFormData {
  return { department_id: '', task: '', task_date: defaultDate, task_time: null, time_type: 'at', notes: null }
}

// ── TimeType toggle ───────────────────────────────────────────────────────────

function TimeTypeToggle({ value, onChange }: { value: TimeType; onChange: (v: TimeType) => void }) {
  return (
    <div className="flex rounded border border-cream-300 overflow-hidden text-xs shrink-0">
      {(['at', 'by'] as TimeType[]).map(t => (
        <button
          key={t}
          type="button"
          onClick={() => onChange(t)}
          className={`px-2 py-1 capitalize transition-colors ${
            value === t ? 'bg-brown-500 text-white' : 'bg-white text-brown-500 hover:bg-cream-50'
          }`}
        >
          {t}
        </button>
      ))}
    </div>
  )
}

// ── assignment row ────────────────────────────────────────────────────────────

type RowProps = {
  assignment: Assignment
  department: Department | undefined
  departments: Department[]
  canEdit: boolean
  eventId: string
  groupSize: number   // how many siblings share the same repeat_group_id
}

function AssignmentRow({ assignment, department, departments, canEdit, eventId, groupSize }: RowProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<AssignmentFormData>({
    department_id: assignment.department_id,
    task: assignment.task,
    task_date: assignment.task_date,
    task_time: assignment.task_time,
    time_type: assignment.time_type,
    notes: assignment.notes,
  })

  function setF<K extends keyof AssignmentFormData>(k: K, v: AssignmentFormData[K]) {
    setForm(f => ({ ...f, [k]: v }))
  }

  async function handleSave() {
    if (!form.task.trim() || !form.department_id) return
    setSaving(true)
    await updateAssignment(assignment.id, eventId, {
      ...form,
      task: form.task.trim(),
      notes: form.notes?.trim() || null,
      task_time: form.task_time || null,
    })
    setSaving(false)
    setEditing(false)
    startTransition(() => router.refresh())
  }

  async function handleDelete() {
    if (assignment.repeat_group_id && groupSize > 1) {
      const choice = confirm(
        `This task repeats across ${groupSize} days.\n\nClick OK to delete all ${groupSize} days, or Cancel to delete this day only.`
      )
      if (choice) {
        await deleteAssignmentGroup(assignment.repeat_group_id, eventId)
        startTransition(() => router.refresh())
        return
      }
    } else {
      if (!confirm('Remove this assignment?')) return
    }
    await deleteAssignment(assignment.id, eventId)
    startTransition(() => router.refresh())
  }

  const timeLabel = formatAssignmentTime(assignment.task_time, assignment.time_type)
  const deptColor = department?.color ?? '#888'

  if (editing) {
    return (
      <div className="border border-cream-200 rounded-lg p-3 space-y-2 bg-cream-50 my-1">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-brown-300 mb-0.5">Department</label>
            <select
              value={form.department_id}
              onChange={e => setF('department_id', e.target.value)}
              className="w-full border border-cream-300 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brown-300"
            >
              <option value="">— Select —</option>
              {departments.filter(d => d.active || d.id === form.department_id).map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-brown-300 mb-0.5">Date</label>
            <input
              type="date"
              value={form.task_date}
              onChange={e => setF('task_date', e.target.value)}
              className="w-full border border-cream-300 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brown-300"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs text-brown-300 mb-0.5">Task</label>
          <input
            value={form.task}
            onChange={e => setF('task', e.target.value)}
            className="w-full border border-cream-300 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brown-300"
          />
        </div>
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="block text-xs text-brown-300 mb-0.5">Time (optional)</label>
            <TimePicker
              value={form.task_time ?? ''}
              onChange={v => setF('task_time', v || null)}
            />
          </div>
          {form.task_time && (
            <TimeTypeToggle value={form.time_type} onChange={v => setF('time_type', v)} />
          )}
        </div>
        <div>
          <label className="block text-xs text-brown-300 mb-0.5">Notes (optional)</label>
          <input
            value={form.notes ?? ''}
            onChange={e => setF('notes', e.target.value || null)}
            className="w-full border border-cream-300 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brown-300"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving || !form.task.trim() || !form.department_id}
            className="bg-brown-500 hover:bg-brown-600 text-white text-xs px-3 py-1 rounded disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            onClick={() => setEditing(false)}
            className="text-xs text-brown-400 hover:text-brown-600 px-2 py-1"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-2 py-1.5 group">
      <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: deptColor }} />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-brown-700 leading-snug">{assignment.task}</p>
        {(timeLabel || assignment.notes) && (
          <p className="text-xs text-brown-400 mt-0.5">
            {timeLabel}
            {timeLabel && assignment.notes ? ' · ' : ''}
            {assignment.notes}
          </p>
        )}
        {assignment.repeat_group_id && groupSize > 1 && (
          <p className="text-xs text-brown-300 mt-0.5">↻ {groupSize}-day group</p>
        )}
      </div>
      {canEdit && (
        <div className="flex gap-1 shrink-0 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:transition-opacity">
          <button
            onClick={() => setEditing(true)}
            className="text-xs text-brown-400 hover:text-brown-600 px-1"
          >
            Edit
          </button>
          <button
            onClick={handleDelete}
            className="text-xs text-red-400 hover:text-red-600 px-1"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}

// ── main component ────────────────────────────────────────────────────────────

type Props = {
  event: Event
  assignments: Assignment[]
  departments: Department[]
  canEdit: boolean
}

export default function AssignmentsSection({ event, assignments, departments, canEdit }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [addForm, setAddForm] = useState<AssignmentFormData>(blankForm(event.start_date))
  const [groupBy, setGroupBy] = useState<'department' | 'date'>('department')
  const [filterDeptId, setFilterDeptId] = useState<string | null>(null)

  // Day chips for multi-day events
  const dayCount = getDayCount(event.start_date, event.end_date)
  const eventDays: string[] = Array.from({ length: dayCount }, (_, i) => shiftDate(event.start_date, i))
  const [selectedDates, setSelectedDates] = useState<string[]>([event.start_date])

  function toggleDate(date: string) {
    setSelectedDates(prev =>
      prev.includes(date) ? (prev.length > 1 ? prev.filter(d => d !== date) : prev) : [...prev, date]
    )
  }

  function setAdd<K extends keyof AssignmentFormData>(k: K, v: AssignmentFormData[K]) {
    setAddForm(f => ({ ...f, [k]: v }))
  }

  async function handleAdd() {
    if (!addForm.task.trim() || !addForm.department_id) return
    setSaving(true)
    await createAssignments(event.id, selectedDates, {
      ...addForm,
      task: addForm.task.trim(),
      notes: addForm.notes?.trim() || null,
      task_time: addForm.task_time || null,
    })
    setSaving(false)
    setAddForm(blankForm(event.start_date))
    setSelectedDates([event.start_date])
    setAdding(false)
    startTransition(() => router.refresh())
  }

  // dept lookup map
  const deptMap = new Map(departments.map(d => [d.id, d]))

  // repeat group size map: groupId → count
  const groupSizes = new Map<string, number>()
  for (const a of assignments) {
    if (a.repeat_group_id) groupSizes.set(a.repeat_group_id, (groupSizes.get(a.repeat_group_id) ?? 0) + 1)
  }

  // apply department filter
  const visible = filterDeptId ? assignments.filter(a => a.department_id === filterDeptId) : assignments

  // departments that actually have assignments (for filter chips)
  const usedDeptIds = Array.from(new Set(assignments.map(a => a.department_id)))
  const usedDepts = departments.filter(d => usedDeptIds.includes(d.id))

  // ── group by department ──
  function renderByDepartment() {
    const grouped = new Map<string, Assignment[]>()
    for (const a of visible) {
      if (!grouped.has(a.department_id)) grouped.set(a.department_id, [])
      grouped.get(a.department_id)!.push(a)
    }

    const deptOrder = departments.map(d => d.id)
    const entries = Array.from(grouped.entries()).sort(
      (a, b) => deptOrder.indexOf(a[0]) - deptOrder.indexOf(b[0])
    )

    return entries.map(([deptId, items]) => {
      const dept = deptMap.get(deptId)
      const untimed = items.filter(a => !a.task_time)
      const timed = items.filter(a => a.task_time).sort((a, b) => (a.task_time! > b.task_time! ? 1 : -1))

      return (
        <div key={deptId} className="space-y-1">
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: dept?.color ?? '#888' }} />
            <p className="text-xs font-semibold text-brown-600">{dept?.name ?? 'Unknown'}</p>
          </div>
          <div className="pl-4 space-y-0.5">
            {untimed.length > 0 && (
              <>
                <p className="text-xs text-brown-300 mt-1 mb-0.5">General</p>
                {untimed.map(a => (
                  <AssignmentRow key={a.id} assignment={a} department={dept} departments={departments} canEdit={canEdit} eventId={event.id} groupSize={a.repeat_group_id ? (groupSizes.get(a.repeat_group_id) ?? 1) : 1} />
                ))}
              </>
            )}
            {timed.map(a => {
              const timeLabel = formatAssignmentTime(a.task_time, a.time_type)!
              return (
                <div key={a.id}>
                  <p className="text-xs text-brown-300 mt-1 mb-0.5">{timeLabel}</p>
                  <AssignmentRow assignment={a} department={dept} departments={departments} canEdit={canEdit} eventId={event.id} groupSize={a.repeat_group_id ? (groupSizes.get(a.repeat_group_id) ?? 1) : 1} />
                </div>
              )
            })}
          </div>
        </div>
      )
    })
  }

  // ── group by date ──
  function renderByDate() {
    const grouped = new Map<string, Assignment[]>()
    for (const a of visible) {
      if (!grouped.has(a.task_date)) grouped.set(a.task_date, [])
      grouped.get(a.task_date)!.push(a)
    }

    const dates = Array.from(grouped.keys()).sort()

    return dates.map(date => {
      const items = grouped.get(date)!
      const untimed = items.filter(a => !a.task_time)
      const timed = items.filter(a => a.task_time).sort((a, b) => (a.task_time! > b.task_time! ? 1 : -1))

      return (
        <div key={date} className="space-y-1">
          <p className="text-xs font-semibold text-brown-500">{formatDateWithDay(date)}</p>
          <div className="pl-2 space-y-0.5">
            {untimed.length > 0 && (
              <>
                <p className="text-xs text-brown-300 mt-0.5 mb-0.5">General</p>
                {untimed.map(a => (
                  <AssignmentRow key={a.id} assignment={a} department={deptMap.get(a.department_id)} departments={departments} canEdit={canEdit} eventId={event.id} groupSize={a.repeat_group_id ? (groupSizes.get(a.repeat_group_id) ?? 1) : 1} />
                ))}
              </>
            )}
            {timed.map(a => {
              const timeLabel = formatAssignmentTime(a.task_time, a.time_type)!
              return (
                <div key={a.id}>
                  <p className="text-xs text-brown-300 mt-1 mb-0.5">{timeLabel}</p>
                  <AssignmentRow assignment={a} department={deptMap.get(a.department_id)} departments={departments} canEdit={canEdit} eventId={event.id} groupSize={a.repeat_group_id ? (groupSizes.get(a.repeat_group_id) ?? 1) : 1} />
                </div>
              )
            })}
          </div>
        </div>
      )
    })
  }

  return (
    <div className="bg-white border border-cream-200 rounded-xl p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <p className="text-xs font-semibold text-brown-400 uppercase tracking-wider">Assignments</p>
        <div className="flex items-center gap-2">
          <div className="flex rounded border border-cream-300 overflow-hidden text-xs">
            {(['department', 'date'] as const).map(g => (
              <button
                key={g}
                onClick={() => setGroupBy(g)}
                className={`px-2 py-1 capitalize transition-colors ${
                  groupBy === g ? 'bg-brown-500 text-white' : 'bg-white text-brown-500 hover:bg-cream-50'
                }`}
              >
                By {g === 'department' ? 'Dept' : 'Date'}
              </button>
            ))}
          </div>
          {canEdit && !adding && (
            <button
              onClick={() => setAdding(true)}
              className="text-xs text-brown-400 hover:text-brown-600 transition-colors"
            >
              + Add
            </button>
          )}
        </div>
      </div>

      {/* Dept filter chips */}
      {usedDepts.length > 1 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          <button
            onClick={() => setFilterDeptId(null)}
            className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
              filterDeptId === null
                ? 'bg-brown-500 text-white border-brown-500'
                : 'border-cream-300 text-brown-500 hover:bg-cream-50'
            }`}
          >
            All
          </button>
          {usedDepts.map(d => (
            <button
              key={d.id}
              onClick={() => setFilterDeptId(filterDeptId === d.id ? null : d.id)}
              className={`text-xs px-2 py-0.5 rounded-full border transition-colors flex items-center gap-1 ${
                filterDeptId === d.id
                  ? 'text-white border-transparent'
                  : 'border-cream-300 text-brown-500 hover:bg-cream-50'
              }`}
              style={filterDeptId === d.id ? { backgroundColor: d.color, borderColor: d.color } : {}}
            >
              <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: filterDeptId === d.id ? 'white' : d.color }} />
              {d.name}
            </button>
          ))}
        </div>
      )}

      {/* Add form */}
      {adding && (
        <div className="border border-cream-200 rounded-lg p-3 space-y-2 bg-cream-50 mb-4">

          {/* Day chips (multi-day events only) */}
          {dayCount > 1 && (
            <div>
              <label className="block text-xs text-brown-300 mb-1">Day(s)</label>
              <div className="flex flex-wrap gap-1.5">
                {eventDays.map(day => {
                  const active = selectedDates.includes(day)
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDate(day)}
                      className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                        active
                          ? 'bg-brown-500 text-white border-brown-500'
                          : 'border-cream-300 text-brown-600 hover:bg-cream-100'
                      }`}
                    >
                      {formatDateShortWithDay(day)}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs text-brown-300 mb-0.5">Department <span className="text-red-400">*</span></label>
            <select
              value={addForm.department_id}
              onChange={e => setAdd('department_id', e.target.value)}
              className="w-full border border-cream-300 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brown-300"
            >
              <option value="">— Select —</option>
              {departments.filter(d => d.active).map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          {/* Single-day: show date input */}
          {dayCount === 1 && (
            <div>
              <label className="block text-xs text-brown-300 mb-0.5">Date</label>
              <input
                type="date"
                value={addForm.task_date}
                onChange={e => setAdd('task_date', e.target.value)}
                className="w-full border border-cream-300 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brown-300"
              />
            </div>
          )}

          <div>
            <label className="block text-xs text-brown-300 mb-0.5">Task <span className="text-red-400">*</span></label>
            <input
              value={addForm.task}
              onChange={e => setAdd('task', e.target.value)}
              placeholder="Set up tables, Prepare appetizers…"
              className="w-full border border-cream-300 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brown-300"
            />
          </div>
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="block text-xs text-brown-300 mb-0.5">Time (optional)</label>
              <TimePicker
                value={addForm.task_time ?? ''}
                onChange={v => setAdd('task_time', v || null)}
              />
            </div>
            {addForm.task_time && (
              <TimeTypeToggle value={addForm.time_type} onChange={v => setAdd('time_type', v)} />
            )}
          </div>
          <div>
            <label className="block text-xs text-brown-300 mb-0.5">Notes (optional)</label>
            <input
              value={addForm.notes ?? ''}
              onChange={e => setAdd('notes', e.target.value || null)}
              className="w-full border border-cream-300 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brown-300"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={saving || !addForm.task.trim() || !addForm.department_id}
              className="bg-brown-500 hover:bg-brown-600 text-white text-xs px-3 py-1 rounded disabled:opacity-50 transition-colors"
            >
              {saving ? 'Adding…' : `Add${selectedDates.length > 1 ? ` (${selectedDates.length} days)` : ''}`}
            </button>
            <button
              onClick={() => { setAdding(false); setAddForm(blankForm(event.start_date)); setSelectedDates([event.start_date]) }}
              className="text-xs text-brown-400 hover:text-brown-600 px-2 py-1"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {visible.length === 0 && !adding ? (
        <p className="text-sm text-brown-300">No assignments yet.</p>
      ) : (
        <div className="space-y-4">
          {groupBy === 'department' ? renderByDepartment() : renderByDate()}
        </div>
      )}
    </div>
  )
}
