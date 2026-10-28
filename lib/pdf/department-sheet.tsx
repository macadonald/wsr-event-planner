import React from 'react'
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import type { Assignment, Department, Event, ScheduleItem } from '@/lib/types'
import { formatDate, formatTime, formatTimestamp } from '@/lib/time'
import { getDayCount, formatDateRange } from '@/lib/events'
import { bandColor, tint, C, T, SP } from './shared'

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
  brandName: { fontFamily: 'Helvetica-Bold', fontSize: T.brandName, color: C.brown },
  brandSub: { fontSize: T.small, color: C.label, marginTop: 1 },
  headerRight: { alignItems: 'flex-end', gap: 2 },
  deptTitle: { fontFamily: 'Helvetica-Bold', fontSize: T.eventName, color: C.brown },
  eventLine: { fontSize: T.small, color: C.brownMid },
  updatedLine: { fontSize: T.note, color: C.small },

  secLabel: {
    fontFamily: 'Helvetica-Bold',
    fontSize: T.secLabel,
    color: C.label,
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  rule: { borderBottomWidth: 0.5, borderBottomColor: C.borderFaint, marginBottom: SP.ruleGap },

  // Event summary bar
  summaryBar: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 4,
    marginBottom: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: C.borderFaint,
  },
  sumItem: { flexDirection: 'row', gap: 4, alignItems: 'baseline' },
  sumLabel: { fontSize: T.note, color: C.small },
  sumVal: { fontSize: T.body, color: C.body },

  // Schedule (condensed)
  schedWrap: { marginBottom: 8 },
  dayHead: {
    fontFamily: 'Helvetica-Bold',
    fontSize: T.small,
    color: C.brown,
    marginBottom: 2,
    marginTop: 3,
  },
  schedRow: { flexDirection: 'row', marginBottom: 1.5 },
  schedTime: { width: 44, fontSize: T.small, color: C.label, flexShrink: 0 },
  schedTitle: { flex: 1, fontSize: T.small, color: C.body },

  // Task list
  taskWrap: {},
  taskDateHead: {
    fontFamily: 'Helvetica-Bold',
    fontSize: T.small,
    color: C.brown,
    paddingVertical: 3,
    paddingHorizontal: SP.cellPadH,
    backgroundColor: C.stripeOdd,
    marginBottom: 0,
  },
  taskRow: { flexDirection: 'row', paddingHorizontal: SP.cellPadH, paddingVertical: SP.rowPadV },
  taskTimeCol: { width: SP.timeColW, flexShrink: 0 },
  taskTimeText: { fontSize: T.small, color: C.label },
  taskTimeBold: { fontFamily: 'Helvetica-Bold', fontSize: T.small, color: C.label },
  taskBody: { flex: 1 },
  taskText: { fontSize: T.body, color: C.body },
  taskNote: { fontSize: T.note, color: C.note, marginTop: 0.5 },

  notesWrap: { paddingTop: 6, borderTopWidth: 0.5, borderTopColor: C.borderFaint, marginTop: 4 },
})

type Props = {
  event: Event
  department: Department
  scheduleItems: ScheduleItem[]
  assignments: Assignment[]
  updatedByName: string | null
}

export function DepartmentSheetPDF({ event, department, scheduleItems, assignments, updatedByName }: Props) {
  const dayCount = getDayCount(event.start_date, event.end_date)
  const dateRange = formatDateRange(event.start_date, event.end_date)
  const band = bandColor(department.color)
  const rowTint = tint(department.color, 0.08)

  // Schedule grouped by date
  const schedByDate = new Map<string, ScheduleItem[]>()
  for (const item of scheduleItems) {
    if (!schedByDate.has(item.item_date)) schedByDate.set(item.item_date, [])
    schedByDate.get(item.item_date)!.push(item)
  }
  const scheduleDates = Array.from(schedByDate.keys()).sort()

  // Assignments for this department only, grouped by date
  const deptAssignments = assignments.filter(a => a.department_id === department.id)
  const assignByDate = new Map<string, Assignment[]>()
  for (const a of deptAssignments) {
    if (!assignByDate.has(a.task_date)) assignByDate.set(a.task_date, [])
    assignByDate.get(a.task_date)!.push(a)
  }
  const assignDates = Array.from(assignByDate.keys()).sort()

  // All task rows flattened (for zebra striping)
  type FlatRow = { type: 'dateHead'; date: string } | { type: 'task'; assignment: Assignment }
  const flatRows: FlatRow[] = []
  for (const date of assignDates) {
    flatRows.push({ type: 'dateHead', date })
    const items = assignByDate.get(date)!
    const untimed = items.filter(a => !a.task_time)
    const timed = items.filter(a => a.task_time).sort((a, b) => (a.task_time! > b.task_time! ? 1 : -1))
    for (const a of [...untimed, ...timed]) flatRows.push({ type: 'task', assignment: a })
  }

  let taskRowIdx = 0

  return (
    <Document>
      <Page size="LETTER" style={s.page}>

        {/* Header */}
        <View style={s.headerWrap}>
          <View>
            <Text style={s.brandName}>WSR Events</Text>
            <Text style={s.brandSub}>White Stallion Ranch</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={[s.deptTitle, { color: band }]}>{department.name}</Text>
            <Text style={s.eventLine}>{event.name}  ·  {dateRange}{dayCount > 1 ? ` (${dayCount} days)` : ''}</Text>
            {updatedByName && (
              <Text style={s.updatedLine}>Updated by {updatedByName}  ·  {formatTimestamp(event.updated_at)}</Text>
            )}
          </View>
        </View>

        {/* Event summary bar */}
        <View style={s.summaryBar}>
          {event.pax != null && (
            <View style={s.sumItem}>
              <Text style={s.sumLabel}>Guests</Text>
              <Text style={s.sumVal}>{event.pax}</Text>
            </View>
          )}
          {event.location && (
            <View style={s.sumItem}>
              <Text style={s.sumLabel}>Location</Text>
              <Text style={s.sumVal}>{event.location}</Text>
            </View>
          )}
          {event.contact_name && (
            <View style={s.sumItem}>
              <Text style={s.sumLabel}>Contact</Text>
              <Text style={s.sumVal}>{event.contact_name}{event.contact_phone ? `  ${event.contact_phone}` : ''}</Text>
            </View>
          )}
          {event.onsite_contact && (
            <View style={s.sumItem}>
              <Text style={s.sumLabel}>On-site</Text>
              <Text style={s.sumVal}>{event.onsite_contact}</Text>
            </View>
          )}
        </View>

        {/* Condensed schedule */}
        {scheduleDates.length > 0 && (
          <View style={s.schedWrap}>
            <Text style={s.secLabel}>FULL SCHEDULE</Text>
            {scheduleDates.map(date => (
              <View key={date} style={{ marginBottom: 5 }}>
                <Text style={s.dayHead}>{formatDate(date).toUpperCase()}</Text>
                {(schedByDate.get(date) ?? []).map(item => (
                  <View key={item.id} style={s.schedRow}>
                    <Text style={s.schedTime}>{item.start_time ? formatTime(item.start_time) : ''}</Text>
                    <Text style={s.schedTitle}>
                      {item.title}{item.location ? `  ·  ${item.location}` : ''}
                    </Text>
                  </View>
                ))}
              </View>
            ))}
            <View style={s.rule} />
          </View>
        )}

        {/* Dept task list with colored band at top */}
        <View style={s.taskWrap}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: band,
            paddingHorizontal: SP.cellPadH,
            paddingVertical: 4,
          }}>
            <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: T.body, color: C.white }}>
              {department.name.toUpperCase()} — TASKS
            </Text>
          </View>

          {flatRows.length === 0 && (
            <View style={[s.taskRow, { backgroundColor: C.white }]}>
              <Text style={{ fontSize: T.small, color: C.small }}>No tasks assigned.</Text>
            </View>
          )}

          {flatRows.map((row) => {
            if (row.type === 'dateHead') {
              return (
                <View key={`dh-${row.date}`} style={s.taskDateHead}>
                  <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: T.small, color: C.brownMid }}>
                    {formatDate(row.date).toUpperCase()}
                  </Text>
                </View>
              )
            }
            const a = row.assignment
            const bg = taskRowIdx++ % 2 === 0 ? C.white : rowTint
            const isUntimed = !a.task_time
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
                  {a.notes && <Text style={s.taskNote}>{a.notes}</Text>}
                </View>
              </View>
            )
          })}
        </View>

        {/* Special notes */}
        {event.special_notes && (
          <View style={s.notesWrap}>
            <Text style={s.secLabel}>SPECIAL NOTES</Text>
            <Text style={{ fontSize: T.body, color: C.body }}>{event.special_notes}</Text>
          </View>
        )}

      </Page>
    </Document>
  )
}
