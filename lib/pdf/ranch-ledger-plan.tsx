import React from 'react'
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import type { Assignment, Department, Event, EventBilling, EventNote, ScheduleItem } from '@/lib/types'
import { formatDate, formatTime, formatTimestamp } from '@/lib/time'
import { getDayCount, formatDateRange, shiftDate } from '@/lib/events'
import { sortDeptsByPdfOrder, bandColor } from './shared'
import { registerLedgerFonts } from './fonts'

registerLedgerFonts()

// ── palette & scale ──────────────────────────────────────────────────────────
const RL = {
  text: '#2b2118',
  brownDark: '#3d2716',
  brownMid: '#5a3a22',
  label: '#7a5a40',
  fillLight: '#f8f4ef',
  fillMed: '#f1e9df',
  border: '#e3d6c6',
  amber: '#fbf3e4',
  white: '#ffffff',
}
const PAD = 44
const BODY = 10
const SMALL = 9
const NOTE = 8
const SECT = 8.5
const TITLE = 22

// ── date helpers ─────────────────────────────────────────────────────────────

export function rlDateShort(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  const wd = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'UTC' })
    .format(new Date(Date.UTC(y, m - 1, d)))
  return `${wd} ${m}/${d}`
}

export function rlColHead(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  const wd = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'UTC' })
    .format(new Date(Date.UTC(y, m - 1, d)))
  return `${wd.toUpperCase()} ${m}/${d}`
}

export function rlDateRange(dates: string[]): string {
  if (dates.length === 0) return ''
  if (dates.length === 1) return rlDateShort(dates[0])
  const sorted = [...dates].sort()
  let consecutive = true
  for (let i = 1; i < sorted.length; i++) {
    const [py, pm, pd] = sorted[i - 1].split('-').map(Number)
    const [cy, cm, cd] = sorted[i].split('-').map(Number)
    if (Date.UTC(cy, cm - 1, cd) - Date.UTC(py, pm - 1, pd) !== 86400000) {
      consecutive = false
      break
    }
  }
  const days = sorted.map(d => {
    const [y2, m2, d2] = d.split('-').map(Number)
    return new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'UTC' })
      .format(new Date(Date.UTC(y2, m2 - 1, d2)))
  })
  if (consecutive) return `${days[0]}–${days[days.length - 1]}`
  return days.join(', ')
}

// ── repeat-group collapsing ──────────────────────────────────────────────────

type RLCollapsedRow = {
  id: string
  task: string
  task_time: string | null
  time_type: 'at' | 'by'
  notes: string | null
  dates: string[]
}

export function buildRLDeptRows(deptAssignments: Assignment[]) {
  const groupMap = new Map<string, Assignment[]>()
  for (const a of deptAssignments) {
    if (a.repeat_group_id) {
      if (!groupMap.has(a.repeat_group_id)) groupMap.set(a.repeat_group_id, [])
      groupMap.get(a.repeat_group_id)!.push(a)
    }
  }

  const collapsibleIds = new Set<string>()
  const collapsedRows: RLCollapsedRow[] = []

  for (const [gid, group] of Array.from(groupMap.entries())) {
    const sorted = [...group].sort((a, b) => a.task_date.localeCompare(b.task_date))
    const first = sorted[0]
    const allSame = sorted.every(a => a.task === first.task && a.task_time === first.task_time && a.time_type === first.time_type)
    if (allSame) {
      collapsibleIds.add(gid)
      collapsedRows.push({
        id: first.id,
        task: first.task,
        task_time: first.task_time,
        time_type: first.time_type,
        notes: first.notes,
        dates: sorted.map(a => a.task_date),
      })
    }
  }

  collapsedRows.sort((a, b) => {
    if (!a.task_time && !b.task_time) return 0
    if (!a.task_time) return -1
    if (!b.task_time) return 1
    return a.task_time.localeCompare(b.task_time)
  })

  const individual = deptAssignments.filter(a => !a.repeat_group_id || !collapsibleIds.has(a.repeat_group_id))
  const byDate = new Map<string, Assignment[]>()
  for (const a of individual) {
    if (!byDate.has(a.task_date)) byDate.set(a.task_date, [])
    byDate.get(a.task_date)!.push(a)
  }
  const dates = Array.from(byDate.keys()).sort()
  return { collapsedRows, byDate, dates }
}

// ── styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: {
    fontFamily: 'Inter',
    fontSize: BODY,
    color: RL.text,
    paddingHorizontal: PAD,
    paddingTop: PAD,
    paddingBottom: PAD + 24,
  },

  // Header
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  headerLeft: { flex: 1, paddingRight: 16 },
  headerBrand: { fontFamily: 'Inter', fontWeight: 700, fontSize: 7.5, letterSpacing: 1.5, color: RL.label },
  eventName: { fontFamily: 'SourceSerif4', fontSize: TITLE, fontWeight: 700, color: RL.brownDark, marginTop: 3, lineHeight: 1.2 },
  headerRight: { alignItems: 'flex-end', gap: 4 },
  headerDate: { fontSize: SMALL, color: RL.label },
  pillRow: { flexDirection: 'row', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' },
  pill: { backgroundColor: RL.fillMed, paddingHorizontal: 7, paddingVertical: 2.5, borderRadius: 10, fontSize: NOTE, color: RL.brownMid },
  headerRule: { borderBottomWidth: 2, borderBottomColor: RL.brownMid, marginBottom: 14 },

  // Info strip
  infoStrip: { flexDirection: 'row', marginBottom: 16 },
  infoCol: { flex: 1, paddingRight: 14 },
  infoDivider: { width: 0.5, backgroundColor: RL.border, marginRight: 14 },
  infoSectLabel: { fontFamily: 'SourceSerif4', fontWeight: 700, fontSize: SECT, letterSpacing: 0.6, color: RL.label, marginBottom: 5 },
  infoVal: { fontSize: BODY, color: RL.text, marginBottom: 2, lineHeight: 1.4 },
  infoSm: { fontSize: SMALL, color: RL.label, marginBottom: 1.5, lineHeight: 1.3 },

  // Schedule
  schedWrap: { marginBottom: 16 },
  schedSectLabel: { fontFamily: 'SourceSerif4', fontWeight: 700, fontSize: SECT, letterSpacing: 0.6, color: RL.label, marginBottom: 8 },
  schedCols: { flexDirection: 'row', gap: 6 },
  schedCol: { flex: 1, backgroundColor: RL.fillLight, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 7 },
  schedColHead: { fontFamily: 'Inter', fontWeight: 700, fontSize: SMALL, color: RL.brownMid, marginBottom: 5, borderBottomWidth: 0.5, borderBottomColor: RL.border, paddingBottom: 3 },
  schedItem: { marginBottom: 4 },
  schedTime: { fontSize: NOTE, color: RL.brownMid, lineHeight: 1.3 },
  schedTitle: { fontSize: SMALL, color: RL.text, lineHeight: 1.3 },
  schedLoc: { fontSize: NOTE, color: RL.label, lineHeight: 1.2 },

  // Dept cards
  deptWrap: { marginBottom: 12 },
  deptSectLabel: { fontFamily: 'SourceSerif4', fontWeight: 700, fontSize: SECT, letterSpacing: 0.6, color: RL.label, marginBottom: 8 },
  deptGrid: { flexDirection: 'row', gap: 6, marginBottom: 6 },
  deptCard: { flex: 1, borderRadius: 5, borderWidth: 0.5, borderColor: RL.border, overflow: 'hidden' },
  deptCardHead: { paddingHorizontal: 8, paddingVertical: 5, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  deptCardName: { fontFamily: 'Inter', fontWeight: 700, fontSize: SMALL, color: RL.white },
  deptCardCount: { fontSize: NOTE, color: RL.white },
  deptTaskRow: { flexDirection: 'row', paddingHorizontal: 8, paddingVertical: 3.5, borderBottomWidth: 0.5, borderBottomColor: RL.border },
  deptTaskLeft: { width: 52, flexShrink: 0, paddingRight: 4 },
  deptTaskDay: { fontFamily: 'Inter', fontWeight: 700, fontSize: NOTE, color: RL.brownMid, lineHeight: 1.3 },
  deptTaskTime: { fontSize: NOTE, color: RL.label, lineHeight: 1.3 },
  deptTaskRight: { flex: 1 },
  deptTaskText: { fontSize: SMALL, color: RL.text, lineHeight: 1.4 },
  deptTaskNote: { fontSize: NOTE, color: RL.label, marginTop: 0.5, lineHeight: 1.3 },

  // Notes (amber box)
  notesBox: { backgroundColor: RL.amber, borderRadius: 6, padding: 10, marginBottom: 12 },
  notesSectLabel: { fontFamily: 'SourceSerif4', fontWeight: 700, fontSize: SECT, letterSpacing: 0.6, color: RL.brownMid, marginBottom: 5 },
  notesText: { fontSize: BODY, color: RL.text, lineHeight: 1.4 },

  // Billing
  billingWrap: { borderTopWidth: 0.5, borderTopColor: RL.border, paddingTop: 8, marginBottom: 8 },
  billingSectLabel: { fontFamily: 'SourceSerif4', fontWeight: 700, fontSize: SECT, letterSpacing: 0.6, color: RL.label, marginBottom: 4 },
  billingRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  billingItem: { flexDirection: 'row', gap: 4 },
  billingKey: { fontSize: NOTE, color: RL.label },
  billingVal: { fontSize: SMALL, color: RL.text },

  // Footer (fixed)
  footer: { position: 'absolute', bottom: 22, left: PAD, right: PAD, flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 0.5, borderTopColor: RL.border, paddingTop: 5 },
  footerText: { fontSize: NOTE, color: RL.label },
})

// ── dept card sub-component ───────────────────────────────────────────────────
function RLDeptCard({ dept, deptAssignments }: { dept: Department; deptAssignments: Assignment[] }) {
  const band = bandColor(dept.color)
  const { collapsedRows, byDate, dates } = buildRLDeptRows(deptAssignments)
  const totalTasks = deptAssignments.length

  return (
    <View style={s.deptCard}>
      <View style={[s.deptCardHead, { backgroundColor: band }]}>
        <Text style={s.deptCardName}>{dept.name}</Text>
        <Text style={s.deptCardCount}>{totalTasks} task{totalTasks !== 1 ? 's' : ''}</Text>
      </View>

      {collapsedRows.map(cr => (
        <View key={cr.id} style={s.deptTaskRow}>
          <View style={s.deptTaskLeft}>
            <Text style={s.deptTaskDay}>{rlDateRange(cr.dates)}</Text>
            <Text style={s.deptTaskTime}>
              {cr.task_time
                ? `${cr.time_type === 'by' ? 'By' : 'At'} ${formatTime(cr.task_time)}`
                : 'General'}
            </Text>
          </View>
          <View style={s.deptTaskRight}>
            <Text style={s.deptTaskText}>{cr.task}</Text>
            {cr.notes && <Text style={s.deptTaskNote}>{cr.notes}</Text>}
          </View>
        </View>
      ))}

      {dates.map(date => {
        const items = byDate.get(date)!
        const untimed = items.filter(a => !a.task_time)
        const timed = items.filter(a => a.task_time).sort((a, b) => (a.task_time! > b.task_time! ? 1 : -1))
        return [...untimed, ...timed].map(a => (
          <View key={a.id} style={s.deptTaskRow}>
            <View style={s.deptTaskLeft}>
              <Text style={s.deptTaskDay}>{rlDateShort(a.task_date)}</Text>
              <Text style={s.deptTaskTime}>
                {a.task_time
                  ? `${a.time_type === 'by' ? 'By' : 'At'} ${formatTime(a.task_time)}`
                  : 'General'}
              </Text>
            </View>
            <View style={s.deptTaskRight}>
              <Text style={s.deptTaskText}>{a.task}</Text>
              {a.notes && <Text style={s.deptTaskNote}>{a.notes}</Text>}
            </View>
          </View>
        ))
      })}

      {collapsedRows.length === 0 && dates.length === 0 && (
        <View style={[s.deptTaskRow, { paddingVertical: 5 }]}>
          <Text style={{ fontSize: NOTE, color: RL.label }}>No tasks assigned.</Text>
        </View>
      )}
    </View>
  )
}

// ── main component ────────────────────────────────────────────────────────────
type Props = {
  event: Event
  billing: EventBilling | null
  showBilling: boolean
  scheduleItems: ScheduleItem[]
  assignments: Assignment[]
  departments: Department[]
  notes: EventNote[]
  updatedByName: string | null
}

export function RanchLedgerFullEventPlanPDF({ event, billing, showBilling, scheduleItems, assignments, departments, notes, updatedByName }: Props) {
  const dayCount = getDayCount(event.start_date, event.end_date)
  const dateRange = formatDateRange(event.start_date, event.end_date)

  // Schedule
  const allDays = Array.from({ length: dayCount }, (_, i) => shiftDate(event.start_date, i))
  const schedByDate = new Map<string, ScheduleItem[]>()
  for (const item of scheduleItems) {
    if (!schedByDate.has(item.item_date)) schedByDate.set(item.item_date, [])
    schedByDate.get(item.item_date)!.push(item)
  }
  const activeDays = allDays.filter(d => (schedByDate.get(d)?.length ?? 0) > 0)
  const dayRows: string[][] = []
  for (let i = 0; i < activeDays.length; i += 5) dayRows.push(activeDays.slice(i, i + 5))

  // Departments with work
  const deptsWithWork = sortDeptsByPdfOrder(
    departments.filter(d => assignments.some(a => a.department_id === d.id))
  )
  const assignsByDept = new Map<string, Assignment[]>()
  for (const a of assignments) {
    if (!assignsByDept.has(a.department_id)) assignsByDept.set(a.department_id, [])
    assignsByDept.get(a.department_id)!.push(a)
  }

  const hasBillingData = showBilling && billing && (
    billing.room_rental != null || billing.billing_due_date ||
    billing.billing_method || billing.package || billing.notes
  )

  // Info columns
  const hasContact = !!(event.contact_name || event.contact_phone || event.contact_email || event.onsite_contact)
  const hasWhere = !!(event.location || event.start_time || event.end_time)
  const hasAbout = !!(event.description)

  // Header pills
  const pills: string[] = []
  if (event.event_type) pills.push(event.event_type)
  if (dayCount > 1) pills.push(`${dayCount} Days`)
  pills.push(event.pax != null ? `${event.pax} Guests` : '— Guests')

  // Notes
  const hasNotes = notes.length > 0 || !!(event.special_notes)

  return (
    <Document>
      <Page size="LETTER" style={s.page}>

        {/* Footer — fixed on every page */}
        <View fixed style={s.footer}>
          <Text style={s.footerText}>
            {updatedByName ? `Updated ${formatTimestamp(event.updated_at)} by ${updatedByName}` : ''}
          </Text>
          <Text
            style={s.footerText}
            render={({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) =>
              `Page ${pageNumber} of ${totalPages}`
            }
          />
        </View>

        {/* Header */}
        <View style={s.headerRow}>
          <View style={s.headerLeft}>
            <Text style={s.headerBrand}>WHITE STALLION RANCH · EVENT PLAN</Text>
            <Text style={s.eventName}>{event.name}</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.headerDate}>{dateRange}{dayCount === 1 ? '  ·  1 Day' : ''}</Text>
            <View style={s.pillRow}>
              {pills.map((p, i) => <Text key={i} style={s.pill}>{p}</Text>)}
            </View>
          </View>
        </View>
        <View style={s.headerRule} />

        {/* Info strip */}
        {(hasContact || hasWhere || hasAbout) && (
          <View style={s.infoStrip}>
            {hasContact && (
              <View style={s.infoCol}>
                <Text style={s.infoSectLabel}>CONTACT</Text>
                {event.contact_name && <Text style={s.infoVal}>{event.contact_name}</Text>}
                {event.contact_phone && <Text style={s.infoSm}>{event.contact_phone}</Text>}
                {event.contact_email && <Text style={s.infoSm}>{event.contact_email}</Text>}
                {event.onsite_contact && <Text style={s.infoSm}>On-site: {event.onsite_contact}</Text>}
              </View>
            )}
            {hasContact && hasWhere && <View style={s.infoDivider} />}
            {hasWhere && (
              <View style={s.infoCol}>
                <Text style={s.infoSectLabel}>WHERE</Text>
                {event.location && <Text style={s.infoVal}>{event.location}</Text>}
                {(event.start_time || event.end_time) && (
                  <Text style={s.infoSm}>
                    {event.start_time ? `Arrival ${formatTime(event.start_time)}` : ''}
                    {event.start_time && event.end_time ? '  ·  ' : ''}
                    {event.end_time ? `Departure ${formatTime(event.end_time)}` : ''}
                  </Text>
                )}
              </View>
            )}
            {hasAbout && (hasContact || hasWhere) && <View style={s.infoDivider} />}
            {hasAbout && (
              <View style={s.infoCol}>
                <Text style={s.infoSectLabel}>ABOUT</Text>
                <Text style={s.infoSm}>{event.description}</Text>
              </View>
            )}
          </View>
        )}

        {/* Guest Schedule */}
        {activeDays.length > 0 && (
          <View style={s.schedWrap}>
            <Text style={s.schedSectLabel}>GUEST SCHEDULE</Text>
            {dayRows.map((row, ri) => (
              <View key={ri} style={[s.schedCols, ri < dayRows.length - 1 ? { marginBottom: 6 } : {}]}>
                {row.map(date => {
                  const items = schedByDate.get(date) ?? []
                  return (
                    <View key={date} style={s.schedCol}>
                      <Text style={s.schedColHead}>{rlColHead(date)}</Text>
                      {items.map(item => (
                        <View key={item.id} style={s.schedItem}>
                          {item.start_time && <Text style={s.schedTime}>{formatTime(item.start_time)}</Text>}
                          <Text style={s.schedTitle}>{item.title}</Text>
                          {item.location && <Text style={s.schedLoc}>{item.location}</Text>}
                        </View>
                      ))}
                    </View>
                  )
                })}
              </View>
            ))}
          </View>
        )}

        {/* Department Coordination */}
        {deptsWithWork.length > 0 && (
          <View style={s.deptWrap}>
            <Text style={s.deptSectLabel}>DEPARTMENT COORDINATION</Text>
            {Array.from({ length: Math.ceil(deptsWithWork.length / 2) }, (_, i) => {
              const left = deptsWithWork[i * 2]
              const right = deptsWithWork[i * 2 + 1]
              return (
                <View key={i} style={s.deptGrid}>
                  <RLDeptCard dept={left} deptAssignments={assignsByDept.get(left.id) ?? []} />
                  {right
                    ? <RLDeptCard dept={right} deptAssignments={assignsByDept.get(right.id) ?? []} />
                    : <View style={{ flex: 1 }} />
                  }
                </View>
              )
            })}
          </View>
        )}

        {/* Special Notes */}
        {hasNotes && (
          <View style={s.notesBox}>
            <Text style={s.notesSectLabel}>SPECIAL NOTES</Text>
            {event.special_notes && (
              <Text style={s.notesText}>{event.special_notes}</Text>
            )}
            {notes.map((n, i) => (
              <Text key={n.id} style={[s.notesText, (i > 0 || event.special_notes) ? { marginTop: 4 } : {}]}>
                {n.content}
              </Text>
            ))}
          </View>
        )}

        {/* Billing */}
        {hasBillingData && (
          <View style={s.billingWrap}>
            <Text style={s.billingSectLabel}>BILLING</Text>
            <View style={s.billingRow}>
              {billing!.room_rental != null && (
                <View style={s.billingItem}>
                  <Text style={s.billingKey}>Room rental</Text>
                  <Text style={s.billingVal}>${billing!.room_rental.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
                </View>
              )}
              {billing!.billing_due_date && (
                <View style={s.billingItem}>
                  <Text style={s.billingKey}>Due</Text>
                  <Text style={s.billingVal}>{formatDate(billing!.billing_due_date)}</Text>
                </View>
              )}
              {billing!.billing_method && (
                <View style={s.billingItem}>
                  <Text style={s.billingKey}>Method</Text>
                  <Text style={s.billingVal}>{billing!.billing_method}</Text>
                </View>
              )}
              {billing!.package && (
                <View style={s.billingItem}>
                  <Text style={s.billingKey}>Package</Text>
                  <Text style={s.billingVal}>{billing!.package}</Text>
                </View>
              )}
              {billing!.notes && (
                <Text style={[s.billingVal, { flexBasis: '100%' }]}>{billing!.notes}</Text>
              )}
            </View>
          </View>
        )}

      </Page>
    </Document>
  )
}
