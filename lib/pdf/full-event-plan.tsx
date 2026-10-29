import React from 'react'
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import type { Assignment, Department, Event, EventBilling, EventNote, ScheduleItem } from '@/lib/types'
import { formatDate, formatTime, formatTimestamp } from '@/lib/time'
import { getDayCount, formatDateRange, shiftDate } from '@/lib/events'
import { sortDeptsByPdfOrder, bandColor, tint, C, T, SP } from './shared'

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
  brandSub: { fontSize: T.small, color: C.label },
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

  // Info strip (3 columns)
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

function DeptBlock({ dept, assignments }: { dept: Department; assignments: Assignment[] }) {
  const untimed = assignments.filter(a => !a.task_time)
  const timed = assignments.filter(a => a.task_time).sort((a, b) => (a.task_time! > b.task_time! ? 1 : -1))
  const allRows = [...untimed, ...timed]
  const band = bandColor(dept.color)
  const rowTint = tint(dept.color, 0.08)

  return (
    <View style={s.deptBlock}>
      <View style={[s.deptBand, { backgroundColor: band }]}>
        <Text style={s.deptBandName}>{dept.name.toUpperCase()}</Text>
      </View>
      {allRows.map((a, i) => {
        const isUntimed = !a.task_time
        const bg = i % 2 === 0 ? C.white : rowTint
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
            <View style={s.taskBody}>
              <Text style={s.taskText}>{a.task}</Text>
            </View>
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
}

export function FullEventPlanPDF({ event, billing, showBilling, scheduleItems, assignments, departments, notes, updatedByName }: Props) {
  const dayCount = getDayCount(event.start_date, event.end_date)
  const dateRange = formatDateRange(event.start_date, event.end_date)

  // Meta line: dates · days · type · pax
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
            <Text style={s.brandName}>WSR Events</Text>
            <Text style={s.brandSub}>White Stallion Ranch</Text>
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
            {event.pax != null && <Text style={s.infoSm}>{event.pax} guests</Text>}
            {(event.start_time || event.end_time) && (
              <Text style={s.infoSm}>
                {event.start_time ? formatTime(event.start_time) : ''}
                {event.start_time && event.end_time ? ' – ' : ''}
                {event.end_time ? formatTime(event.end_time) : ''}
              </Text>
            )}
            {event.description && <Text style={s.infoSm}>{event.description}</Text>}
          </View>

          {/* Billing or spacer */}
          {hasBillingData ? (
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
          ) : (
            <>
              <View style={s.infoDivider} />
              <View style={s.infoCol} />
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
                      <Text style={s.dayHead}>{formatDate(date).toUpperCase()}</Text>
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
                  <DeptBlock dept={left} assignments={assignsByDept.get(left.id) ?? []} />
                  {right
                    ? <DeptBlock dept={right} assignments={assignsByDept.get(right.id) ?? []} />
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
