'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Event, EventBilling, ScheduleItem, Assignment, Department, EventNote, EventActivity, EventCharge, PriceItem, BillingSettings } from '@/lib/types'
import { formatTimestamp, relativeTime } from '@/lib/time'
import { getDisplayStatus, getDayCount, STATUS_COLORS, STATUS_LABELS, EVENT_TYPE_COLORS } from '@/lib/events'
import { setEventStatus, deleteEvent } from '@/app/actions/events'
import EventInfoSection from './event-info-section'
import ContactsSection from './contacts-section'
import BillingSection from './billing-section'
import ScheduleSection from './schedule-section'
import AssignmentsSection from './assignments-section'
import NotesSection from './notes-section'
import DuplicateModal from './duplicate-modal'
import ActivityPanel from './activity-panel'
import ChargesTab from './charges-tab'

type Tab = 'details' | 'assignments' | 'charges'

type InventoryAvailability = Record<string, { usable: number | null; available: number | null }>

type Props = {
  event: Event
  billing: EventBilling | null
  scheduleItems: ScheduleItem[]
  assignments: Assignment[]
  departments: Department[]
  notes: EventNote[]
  updatedByName: string | null
  canEdit: boolean
  profilesMap: Record<string, string | null>
  recentHours: number
  activity: EventActivity[]
  charges: EventCharge[]
  priceItems: PriceItem[]
  billingSettings: BillingSettings
  inventoryAvailability: InventoryAvailability
}

export default function EventDetailClient({
  event, billing, scheduleItems, assignments, departments, notes,
  updatedByName, canEdit, profilesMap, recentHours, activity,
  charges, priceItems, billingSettings, inventoryAvailability,
}: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [showDuplicate, setShowDuplicate] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [selectedDeptIds, setSelectedDeptIds] = useState<Set<string>>(new Set())
  const [deptLayout, setDeptLayout] = useState<'paged' | 'combined'>('paged')
  const [pdfStyle, setPdfStyle] = useState<'classic' | 'ledger'>('ledger')
  const [tab, setTab] = useState<Tab>('details')

  useEffect(() => {
    const stored = localStorage.getItem('wsr-pdf-style')
    if (stored === 'classic' || stored === 'ledger') setPdfStyle(stored)
  }, [])

  function handleStyleChange(s: 'classic' | 'ledger') {
    setPdfStyle(s)
    localStorage.setItem('wsr-pdf-style', s)
  }

  const deptsWithWork = departments.filter(d => assignments.some(a => a.department_id === d.id))
  const displayStatus = getDisplayStatus(event)
  const dayCount = getDayCount(event.start_date, event.end_date)

  async function handleStatusToggle() {
    const next = event.status === 'planning' ? 'finalized' : 'planning'
    await setEventStatus(event.id, next)
    startTransition(() => router.refresh())
  }

  async function handleDelete() {
    setDeleting(true)
    await deleteEvent(event.id)
    setDeleting(false)
  }

  const tabs: { id: Tab; label: string; show: boolean }[] = [
    { id: 'details',     label: 'Details',     show: true },
    { id: 'assignments', label: 'Assignments',  show: true },
    { id: 'charges',     label: 'Charges',      show: canEdit },
  ]

  return (
    <div className="max-w-4xl space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start gap-3 justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link href="/dashboard" className="text-brown-300 hover:text-brown-500 text-sm">← Events</Link>
          </div>
          <h1 className="text-2xl font-bold text-brown-800 mt-1 leading-tight">{event.name}</h1>
          <p className="text-xs text-brown-300 mt-1">
            {dayCount === 1 ? '1 day' : `${dayCount} days`}
            {updatedByName && (
              <> · Updated <span title={formatTimestamp(event.updated_at)}>{relativeTime(event.updated_at)}</span> by {updatedByName}</>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {event.event_type && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${EVENT_TYPE_COLORS[event.event_type] ?? 'bg-cream-200 text-brown-500'}`}>
              {event.event_type}
            </span>
          )}
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[displayStatus]}`}>
            {STATUS_LABELS[displayStatus]}
          </span>
          {canEdit && displayStatus !== 'completed' && (
            <button
              onClick={handleStatusToggle}
              className="text-xs border border-cream-300 text-brown-500 hover:bg-cream-100 px-3 py-1 rounded-lg transition-colors"
            >
              Mark {event.status === 'planning' ? 'Finalized' : 'Planning'}
            </button>
          )}
          {canEdit && (
            <button
              onClick={() => setShowDuplicate(true)}
              className="text-xs border border-cream-300 text-brown-500 hover:bg-cream-100 px-3 py-1 rounded-lg transition-colors"
            >
              Duplicate
            </button>
          )}
          {canEdit && (
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-xs text-red-400 hover:text-red-600 px-2 py-1 transition-colors"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Delete confirm */}
      {confirmDelete && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-4">
          <p className="text-sm text-red-700 flex-1">Delete <strong>{event.name}</strong>? This cannot be undone.</p>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="bg-red-600 hover:bg-red-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg disabled:opacity-50"
          >
            {deleting ? 'Deleting…' : 'Yes, delete'}
          </button>
          <button
            onClick={() => setConfirmDelete(false)}
            className="text-xs text-brown-400 hover:text-brown-600 px-2 py-1.5"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-cream-200">
        <nav className="flex gap-0 -mb-px overflow-x-auto no-scrollbar">
          {tabs.filter(t => t.show).map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                tab === t.id
                  ? 'text-brown-700 border-brown-500'
                  : 'text-brown-400 border-transparent hover:text-brown-600 hover:border-brown-300'
              }`}
            >
              {t.label}
              {t.id === 'charges' && charges.length > 0 && (
                <span className="ml-1.5 text-xs text-brown-300">({charges.length})</span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab: Details */}
      {tab === 'details' && (
        <div className="space-y-5">
          {/* PDF print bar */}
          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:gap-4 items-start">
            <div className="flex items-center gap-2 self-start sm:self-center">
              <div className="flex rounded border border-cream-300 overflow-hidden text-xs">
                {(['ledger', 'classic'] as const).map(opt => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => handleStyleChange(opt)}
                    className={`px-2 py-1 transition-colors ${
                      pdfStyle === opt ? 'bg-brown-500 text-white' : 'bg-white text-brown-500 hover:bg-cream-50'
                    }`}
                  >
                    {opt === 'ledger' ? 'Ranch Ledger' : 'Classic'}
                  </button>
                ))}
              </div>
              <a
                href={`/api/pdf/event/${event.id}?style=${pdfStyle}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs border border-cream-300 text-brown-500 hover:bg-cream-100 px-3 py-1.5 rounded-lg transition-colors"
              >
                Print Full Plan
              </a>
            </div>

            {deptsWithWork.length > 0 && (
              <div className="border border-cream-200 rounded-lg px-3 py-2 space-y-2 bg-cream-50">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-xs font-semibold text-brown-400 uppercase tracking-wider">Department Sheets</p>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      className="accent-brown-500"
                      checked={selectedDeptIds.size === deptsWithWork.length}
                      onChange={e => setSelectedDeptIds(e.target.checked ? new Set(deptsWithWork.map(d => d.id)) : new Set())}
                    />
                    <span className="text-xs text-brown-500">All</span>
                  </label>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {deptsWithWork.map(d => (
                    <label key={d.id} className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        className="accent-brown-500"
                        checked={selectedDeptIds.has(d.id)}
                        onChange={e => {
                          const next = new Set(selectedDeptIds)
                          if (e.target.checked) next.add(d.id); else next.delete(d.id)
                          setSelectedDeptIds(next)
                        }}
                      />
                      <span className="text-xs text-brown-600 flex items-center gap-1">
                        <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: d.color }} />
                        {d.name}
                      </span>
                    </label>
                  ))}
                </div>
                {selectedDeptIds.size > 0 && (
                  <div className="flex items-center gap-3 pt-1 border-t border-cream-200">
                    {selectedDeptIds.size > 1 && (
                      <div className="flex rounded border border-cream-300 overflow-hidden text-xs">
                        {(['paged', 'combined'] as const).map(opt => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => setDeptLayout(opt)}
                            className={`px-2 py-1 capitalize transition-colors ${
                              deptLayout === opt ? 'bg-brown-500 text-white' : 'bg-white text-brown-500 hover:bg-cream-50'
                            }`}
                          >
                            {opt === 'paged' ? 'One per page' : 'Combined'}
                          </button>
                        ))}
                      </div>
                    )}
                    {selectedDeptIds.size === 1 ? (
                      <a
                        href={`/api/pdf/event/${event.id}/dept/${Array.from(selectedDeptIds)[0]}?style=${pdfStyle}`}
                        target="_blank" rel="noopener noreferrer"
                        className="text-xs border border-cream-300 text-brown-500 hover:bg-cream-100 px-3 py-1 rounded-lg transition-colors"
                      >
                        Print
                      </a>
                    ) : (
                      <a
                        href={`/api/pdf/event/${event.id}/depts?depts=${Array.from(selectedDeptIds).join(',')}&layout=${deptLayout}&style=${pdfStyle}`}
                        target="_blank" rel="noopener noreferrer"
                        className="text-xs border border-cream-300 text-brown-500 hover:bg-cream-100 px-3 py-1 rounded-lg transition-colors"
                      >
                        Print
                      </a>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <EventInfoSection event={event} canEdit={canEdit} />
          <ContactsSection event={event} canEdit={canEdit} />
          {canEdit && <BillingSection eventId={event.id} billing={billing} />}
          <ScheduleSection event={event} items={scheduleItems} canEdit={canEdit} profilesMap={profilesMap} recentHours={recentHours} />
          <NotesSection eventId={event.id} notes={notes} canEdit={canEdit} profilesMap={profilesMap} recentHours={recentHours} />
          <ActivityPanel activity={activity} />
        </div>
      )}

      {/* Tab: Assignments */}
      {tab === 'assignments' && (
        <AssignmentsSection
          event={event}
          assignments={assignments}
          departments={departments}
          canEdit={canEdit}
          profilesMap={profilesMap}
          recentHours={recentHours}
        />
      )}

      {/* Tab: Charges (admin + planner only) */}
      {tab === 'charges' && canEdit && (
        <ChargesTab
          event={event}
          charges={charges}
          priceItems={priceItems}
          billingSettings={billingSettings}
          inventoryAvailability={inventoryAvailability}
        />
      )}

      {showDuplicate && (
        <DuplicateModal
          event={event}
          onClose={() => setShowDuplicate(false)}
        />
      )}
    </div>
  )
}
