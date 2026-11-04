import React from 'react'
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import type { Assignment, Department, Event, EventBilling, EventNote, ScheduleItem } from '@/lib/types'
import { formatDate, formatTime, formatTimestamp } from '@/lib/time'
import { getDayCount, formatDateRange, shiftDate } from '@/lib/events'
import { sortDeptsByPdfOrder, bandColor, tint, pdfDateShort, pdfDateShortWithLabel, formatCollapsedDates, C, T, SP } from './shared'
import { isWithinHours } from '@/lib/time'

// ── styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: T.body,
    color: C.body,
    paddingHorizontal: SP.pagePadX,
    paddingVertical: SP.pagePadY,
    lineHeight: 1.35,
  },

  // Header
  headerWrap: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 6,
    marginBottom: SP.ruleGap,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  brandBlock: { gap: 1 },
  brandName: { fontFamily: 'Helvetica-Bold', fontSize: T.brandName, color: C.brown },
  eventBlock: { alignItems: 'flex-end', gap: 2 },
  eventName: { fontFamily: 'Helvetica-Bold', fontSize: T.eventName, color: C.brown },
  eventMeta: { fontSize: T.small, color: C.brownMid },
  eventUpdated: { fontSize: T.note, color: C.small },

  // Rule separator
  rule: { borderBottomWidth: 0.5, borderBottomColor: C.borderFaint, marginBottom: SP.ruleGap },

  // Section label
  secLabel: {
    fontFamily: 'Helvetica-Bold',
    fontSize: T.secLabel,
    color: C.label,
    letterSpacing: 0.6,
    marginBottom: 4,
  },

  // Info strip (2 or 3 columns)
  infoStrip: {
    flexDirection: 'row',
    paddingVertical: 5,
    marginBottom: SP.ruleGap,
    borderBottomWidth: 0.5,
    borderBottomColor: C.borderFaint,
  },
  infoCol: { flex: 1 },
  infoDivider: { width: 0.5, backgroundColor: C.borderFaint, marginHorizontal: 10 },
  infoLabel: { fontSize: T.note, color: C.small, marginBottom: 0.5 },
  infoVal: { fontSize: T.body, color: C.body, marginBottom: 2 },
  infoSm: { fontSize: T.small, color: C.label, marginBottom: 1 },

  // Schedule
  schedWrap: { marginBottom: SP.sectionGap },
  dayColumns: { flexDirection: 'row' },
  dayCol: { flex: 1, paddingRight: 8 },
  dayHead: {
    fontFamily: 'Helvetica-Bold',
    fontSize: T.small,
    color: C.brown,
    paddingBottom: 2,
    marginBottom: 2,
    borderBottomWidth: 0.5,
    borderBottomColor: C.borderFaint,
  },
  schedRow: { flexDirection: 'row', marginBottom: 1.5 },
  schedTime: { width: 42, fontSize: T.small, color: C.label, flexShrink: 0 },
  schedTitle: { flex: 1, fontSize: T.small, color: C.body },

  // Dept grid
  deptWrap: { marginBottom: SP.sectionGap },
  deptRow: { flexDirection: 'row', gap: 5, marginBottom: 5 },
  deptBlock: { flex: 1 },
  deptBand: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SP.cellPadH,
    paddingVertical: 3,
  },
  deptBandName: { fontFamily: 'Helvetica-Bold', fontSize: T.small, color: C.white },
  taskDateHead: {
    fontFamily: 'Helvetica-Bold',
    fontSize: T.note,
    color: C.label,
    paddingHorizontal: SP.cellPadH,
    paddingVertical: 2,
    backgroundColor: C.stripeOdd,
  },
  taskRow: { flexDirection: 'row', paddingHorizontal: SP.cellPadH, paddingVertical: SP.rowPadV },
  taskTimeCol: { width: SP.timeColW, flexShrink: 0 },
  taskTimeText: { fontSize: T.small, color: C.label },
  taskTimeBold: { fontFamily: 'Helvetica-Bold', fontSize: T.small, color: C.label },
  taskBody: { flex: 1 },
  taskText: { fontSize: T.body, color: C.body },
  taskNote: { fontSize: T.note, color: C.note, marginTop: 0.5 },

  // Notes
  notesWrap: { paddingTop: 4, borderTopWidth: 0.5, borderTopColor: C.borderFaint },
  notesText: { fontSize: T.body, color: C.body },
})

// ── sub-components ────────────────────────────────────────────────────────────

function SecLabel({ text }: { text: string }) {
  return <Text style={s.secLabel}>{text}</Text>
}

function Rule() {
  return <View style={s.rule} />
}

type CollapsedRow = {
  id: string
  task: string
  task_time: string | null
  time_type: 'at' | 'by'
  notes: string | null
  dateRange: string
}

function DeptBlock({ dept, assignments, recentHours, event }: { dept: Department; assignments: Assignment[]; recentHours: number; event: Event }) {
  const band = bandColor(dept.color)
  const rowTint = tint(dept.color, 0.08)

  // Find collapsible repeat groups (same task + time + time_type across all siblings)
  const groupMap = new Map<string, Assignment[]>()
  for (const a of assignments) {
    if (a.repeat_group_id) {
      if (!groupMap.has(a.repeat_group_id)) groupMap.set(a.repeat_group_id, [])
      groupMap.get(a.repeat_group_id)!.push(a)
    }
  }

  const collapsibleIds = new Set<string>()
  const collapsedRows: CollapsedRow[] = []

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
        dateRange: formatCollapsedDates(sorted.map(a => a.task_date)),
      })
    }
  }

  // Sort collapsed rows: untimed first, then by time
  collapsedRows.sort((a, b) => {
    if (!a.task_time && !b.task_time) return 0
    if (!a.task_time) return -1
    if (!b.task_time) return 1
    return a.task_time.localeCompare(b.task_time)
  })

  // Per-date groups, excluding collapsible repeat tasks
  const individual = assignments.filter(a => !a.repeat_group_id || !collapsibleIds.has(a.repeat_group_id))
  const byDate = new Map<string, Assignment[]>()
  for (const a of individual) {
    if (!byDate.has(a.task_date)) byDate.set(a.task_date, [])
    byDate.get(a.task_date)!.push(a)
  }
  const dates = Array.from(byDate.keys()).sort()

  let rowIdx = 0

  return (
    <View style={s.deptBlock}>
      <View style={[s.deptBand, { backgroundColor: band }]}>
        <Text style={s.deptBandName}>{dept.name.toUpperCase()}</Text>
      </View>

      {/* Collapsed repeat rows */}
      {collapsedRows.map(cr => {
        const bg = rowIdx++ % 2 === 0 ? C.white : rowTint
        return (
          <View key={cr.id} style={[s.taskRow, { backgroundColor: bg }]}>
            <View style={s.taskTimeCol}>
              <Text style={[s.taskTimeText, { fontSize: T.note, lineHeight: 1.2 }]}>{cr.dateRange}</Text>
              {cr.task_time ? (
                <Text style={s.taskTimeText}>
                  <Text style={s.taskTimeBold}>{cr.time_type === 'by' ? 'By ' : 'At '}</Text>
                  {formatTime(cr.task_time)}
                </Text>
              ) : (
                <Text style={s.taskTimeText}>General</Text>
              )}
            </View>
            <View style={s.taskBody}>
              <Text style={s.taskText}>{cr.task}</Text>
              {cr.notes && <Text style={s.taskNote}>{cr.notes}</Text>}
            </View>
          </View>
        )
      })}

      {/* Per-date groups */}
      {dates.map(date => {
        const items = byDate.get(date)!
        const untimed = items.filter(a => !a.task_time)
        const timed = items.filter(a => a.task_time).sort((a, b) => (a.task_time! > b.task_time! ? 1 : -1))
        return (
          <View key={date}>
            <View style={s.taskDateHead}>
              <Text>{pdfDateShortWithLabel(date, event)}</Text>
            </View>
            {[...untimed, ...timed].map(a => {
              const bg = rowIdx++ % 2 === 0 ? C.white : rowTint
              const isUntimed = !a.task_time
              const isUpdated = recentHours > 0 && isWithinHours(a.updated_at, recentHours)
              return (
                <View key={a.id} style={[s.taskRow, { backgroundColor: bg }]}>
                  <View style={s.taskTimeCol}>
                    {isUntimed ? (
                      <Text style={s.taskTimeText}>General</Text>
                    ) : (
                      <Text style={s.taskTimeText}>
                        <Text style={s.taskTimeBold}>{a.time_type === 'by' ? 'By ' : 'At '}</Text>
                        {formatTime(a.task_time!)}
                      </Text>
                    )}
                  </View>
                  <View style={[s.taskBody, { flexDirection: 'row', justifyContent: 'space-between' }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.taskText}>{a.task}</Text>
                      {a.notes && <Text style={s.taskNote}>{a.notes}</Text>}
                    </View>
                    {isUpdated && <Text style={{ fontSize: T.note, color: C.amber, fontFamily: 'Helvetica-Bold', paddingLeft: 4 }}>UPDATED</Text>}
                  </View>
                </View>
              )
            })}
          </View>
        )
      })}
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
  recentHours?: number
}

export function FullEventPlanPDF({ event, billing, showBilling, scheduleItems, assignments, departments, notes, updatedByName, recentHours = 0 }: Props) {
  const dayCount = getDayCount(event.start_date, event.end_date)
  const dateRange = formatDateRange(event.start_date, event.end_date)

  // Meta line: dates · days · type · pax (hide pax if null or 0)
  const metaParts: string[] = [dateRange]
  if (dayCount > 1) metaParts.push(`${dayCount} days`)
  if (event.event_type) metaParts.push(event.event_type)
  if (event.pax != null) metaParts.push(`${event.pax} guests`)

  // Schedule: days with items
  const allDays = Array.from({ length: dayCount }, (_, i) => shiftDate(event.start_date, i))
  const schedByDate = new Map<string, ScheduleItem[]>()
  for (const item of scheduleItems) {
    if (!schedByDate.has(item.item_date)) schedByDate.set(item.item_date, [])
    schedByDate.get(item.item_date)!.push(item)
  }
  const activeDays = allDays.filter(d => (schedByDate.get(d)?.length ?? 0) > 0)

  // Departments that have assignments, in PDF order
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

  // Schedule column layout
  const dayChunks: string[][] = []
  if (activeDays.length <= 3) {
    dayChunks.push(activeDays)
  } else {
    for (let i = 0; i < activeDays.length; i += 2) {
      dayChunks.push(activeDays.slice(i, i + 2))
    }
  }

  return (
    <Document>
      <Page size="LETTER" style={s.page}>

        {/* ── Header ── */}
        <View style={s.headerWrap}>
          <View style={s.brandBlock}>
            <Text style={s.brandName}>White Stallion Ranch</Text>
          </View>
          <View style={s.eventBlock}>
            <Text style={s.eventName}>{event.name}</Text>
            <Text style={s.eventMeta}>{metaParts.join('  ·  ')}</Text>
            {updatedByName && (
              <Text style={s.eventUpdated}>Updated by {updatedByName}  ·  {formatTimestamp(event.updated_at)}</Text>
            )}
          </View>
        </View>

        {/* ── Info strip ── */}
        <View style={s.infoStrip}>
          {/* Contact */}
          <View style={s.infoCol}>
            <Text style={s.secLabel}>CONTACT</Text>
            {event.contact_name
              ? <Text style={s.infoVal}>{event.contact_name}</Text>
              : <Text style={s.infoSm}>—</Text>
            }
            {event.contact_phone && <Text style={s.infoSm}>{event.contact_phone}</Text>}
            {event.contact_email && <Text style={s.infoSm}>{event.contact_email}</Text>}
            {event.onsite_contact && <Text style={s.infoSm}>On-site: {event.onsite_contact}</Text>}
          </View>

          <View style={s.infoDivider} />

          {/* Event details */}
          <View style={s.infoCol}>
            <Text style={s.secLabel}>EVENT DETAILS</Text>
            {event.location && <Text style={s.infoVal}>{event.location}</Text>}
            {event.pax != null
              ? <Text style={s.infoSm}>{event.pax} guests</Text>
              : <Text style={s.infoSm}>Guests: —</Text>
            }
            {(event.start_time || event.end_time) && (
              <Text style={s.infoSm}>
                {event.start_time ? formatTime(event.start_time) : ''}
                {event.start_time && event.end_time ? ' – ' : ''}
                {event.end_time ? formatTime(event.end_time) : ''}
              </Text>
            )}
            {event.description && <Text style={s.infoSm}>{event.description}</Text>}
          </View>

          {/* Billing column — only if there is billing data */}
          {hasBillingData && (
            <>
              <View style={s.infoDivider} />
              <View style={s.infoCol}>
                <Text style={s.secLabel}>BILLING</Text>
                {billing!.room_rental != null && (
                  <Text style={s.infoVal}>${billing!.room_rental.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
                )}
                {billing!.billing_due_date && <Text style={s.infoSm}>Due {formatDate(billing!.billing_due_date)}</Text>}
                {billing!.billing_method && <Text style={s.infoSm}>{billing!.billing_method}</Text>}
                {billing!.package && <Text style={s.infoSm}>{billing!.package}</Text>}
                {billing!.notes && <Text style={s.infoSm}>{billing!.notes}</Text>}
              </View>
            </>
          )}
        </View>

        {/* ── Schedule ── */}
        {activeDays.length > 0 && (
          <View style={s.schedWrap}>
            <SecLabel text="SCHEDULE" />
            {dayChunks.map((chunk, ci) => (
              <View key={ci} style={[s.dayColumns, { marginBottom: 4 }]}>
                {chunk.map(date => {
                  const items = schedByDate.get(date) ?? []
                  return (
                    <View key={date} style={s.dayCol}>
                      <Text style={s.dayHead}>{pdfDateShort(date)}</Text>{/* schedule stays on event days */}
                      {items.map(item => (
                        <View key={item.id} style={s.schedRow}>
                          <Text style={s.schedTime}>
                            {item.start_time ? formatTime(item.start_time) : ''}
                          </Text>
                          <Text style={s.schedTitle}>
                            {item.title}
                            {item.location ? `  ·  ${item.location}` : ''}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )
                })}
              </View>
            ))}
            <Rule />
          </View>
        )}

        {/* ── Department coordination ── */}
        {deptsWithWork.length > 0 && (
          <View style={s.deptWrap}>
            <SecLabel text="DEPARTMENT COORDINATION" />
            {Array.from({ length: Math.ceil(deptsWithWork.length / 2) }, (_, i) => {
              const left = deptsWithWork[i * 2]
              const right = deptsWithWork[i * 2 + 1]
              return (
                <View key={i} style={s.deptRow} wrap={false}>
                  <DeptBlock dept={left} assignments={assignsByDept.get(left.id) ?? []} recentHours={recentHours} event={event} />
                  {right
                    ? <DeptBlock dept={right} assignments={assignsByDept.get(right.id) ?? []} recentHours={recentHours} event={event} />
                    : <View style={s.deptBlock} />
                  }
                </View>
              )
            })}
          </View>
        )}

        {/* ── Notes ── */}
        {notes.length > 0 && (
          <View style={s.notesWrap}>
            <SecLabel text="NOTES" />
            {notes.map((n, i) => (
              <View key={n.id} style={i > 0 ? { marginTop: 4 } : {}}>
                <Text style={s.notesText}>{n.content}</Text>
              </View>
            ))}
          </View>
        )}

      </Page>
    </Document>
  )
}
