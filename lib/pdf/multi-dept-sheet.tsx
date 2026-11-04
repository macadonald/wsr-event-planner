import React from 'react'
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import type { Assignment, Department, Event, EventNote, ScheduleItem } from '@/lib/types'
import { formatTime, formatTimestamp } from '@/lib/time'
import { getDayCount, formatDateRange } from '@/lib/events'
import { bandColor, tint, pdfDateShort, pdfDateShortWithLabel, formatCollapsedDates, C, T, SP } from './shared'
import { isWithinHours } from '@/lib/time'

const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: T.body,
    color: C.body,
    paddingHorizontal: SP.pagePadX,
    paddingVertical: SP.pagePadY,
    lineHeight: 1.35,
  },
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
  headerRight: { alignItems: 'flex-end', gap: 2 },
  eventTitle: { fontFamily: 'Helvetica-Bold', fontSize: T.eventName, color: C.brown },
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

  deptBand: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SP.cellPadH,
    paddingVertical: 4,
    marginTop: 6,
  },
  deptBandName: { fontFamily: 'Helvetica-Bold', fontSize: T.body, color: C.white },
  taskDateHead: {
    fontFamily: 'Helvetica-Bold',
    fontSize: T.small,
    color: C.brown,
    paddingVertical: 3,
    paddingHorizontal: SP.cellPadH,
    backgroundColor: C.stripeOdd,
  },
  taskRow: { flexDirection: 'row', paddingHorizontal: SP.cellPadH, paddingVertical: SP.rowPadV },
  taskTimeCol: { width: SP.timeColW, flexShrink: 0 },
  taskTimeText: { fontSize: T.small, color: C.label },
  taskTimeBold: { fontFamily: 'Helvetica-Bold', fontSize: T.small, color: C.label },
  taskBody: { flex: 1 },
  taskText: { fontSize: T.body, color: C.body },
  taskNote: { fontSize: T.note, color: C.note, marginTop: 0.5 },

  notesWrap: { paddingTop: 6, borderTopWidth: 0.5, borderTopColor: C.borderFaint, marginTop: 6 },
})

type CollapsedRow = {
  id: string; task: string; task_time: string | null; time_type: 'at' | 'by'; notes: string | null; dateRange: string
}

function buildDeptRows(deptAssignments: Assignment[]) {
  const groupMap = new Map<string, Assignment[]>()
  for (const a of deptAssignments) {
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
      collapsedRows.push({ id: first.id, task: first.task, task_time: first.task_time, time_type: first.time_type, notes: first.notes, dateRange: formatCollapsedDates(sorted.map(a => a.task_date)) })
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

function DeptSection({ dept, assignments, rowTint, event, recentHours }: { dept: Department; assignments: Assignment[]; rowTint: string; event: Event; recentHours: number }) {
  const band = bandColor(dept.color)
  const { collapsedRows, byDate, dates } = buildDeptRows(assignments)
  let rowIdx = 0

  return (
    <View>
      <View style={[s.deptBand, { backgroundColor: band }]}>
        <Text style={s.deptBandName}>{dept.name.toUpperCase()} — TASKS</Text>
      </View>

      {collapsedRows.map(cr => {
        const bg = rowIdx++ % 2 === 0 ? C.white : rowTint
        return (
          <View key={cr.id} style={[s.taskRow, { backgroundColor: bg }]}>
            <View style={s.taskTimeCol}>
              <Text style={[s.taskTimeText, { fontSize: T.note, lineHeight: 1.2 }]}>{cr.dateRange}</Text>
              {cr.task_time ? (
                <Text style={s.taskTimeText}><Text style={s.taskTimeBold}>{cr.time_type === 'by' ? 'By ' : 'At '}</Text>{formatTime(cr.task_time)}</Text>
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

      {dates.map(date => {
        const items = byDate.get(date)!
        const untimed = items.filter(a => !a.task_time)
        const timed = items.filter(a => a.task_time).sort((a, b) => (a.task_time! > b.task_time! ? 1 : -1))
        return (
          <View key={date}>
            <View style={s.taskDateHead}><Text>{pdfDateShortWithLabel(date, event)}</Text></View>
            {[...untimed, ...timed].map(a => {
              const bg = rowIdx++ % 2 === 0 ? C.white : rowTint
              const isUpd = recentHours > 0 && isWithinHours(a.updated_at, recentHours)
              return (
                <View key={a.id} style={[s.taskRow, { backgroundColor: bg }]}>
                  <View style={s.taskTimeCol}>
                    {!a.task_time ? (
                      <Text style={s.taskTimeText}>General</Text>
                    ) : (
                      <Text style={s.taskTimeText}><Text style={s.taskTimeBold}>{a.time_type === 'by' ? 'By ' : 'At '}</Text>{formatTime(a.task_time)}</Text>
                    )}
                  </View>
                  <View style={s.taskBody}>
                    <Text style={s.taskText}>{a.task}{isUpd && <Text style={{ fontSize: T.note, color: C.amber, fontFamily: 'Helvetica-Bold', paddingLeft: 4 }}>  UPDATED</Text>}</Text>
                    {a.notes && <Text style={s.taskNote}>{a.notes}</Text>}
                  </View>
                </View>
              )
            })}
          </View>
        )
      })}

      {collapsedRows.length === 0 && dates.length === 0 && (
        <View style={[s.taskRow, { backgroundColor: C.white }]}>
          <Text style={{ fontSize: T.small, color: C.small }}>No tasks assigned.</Text>
        </View>
      )}
    </View>
  )
}

function PageHeader({ event, dayCount, dateRange, updatedByName }: { event: Event; dayCount: number; dateRange: string; updatedByName: string | null }) {
  return (
    <View style={s.headerWrap}>
      <View><Text style={s.brandName}>White Stallion Ranch</Text></View>
      <View style={s.headerRight}>
        <Text style={s.eventTitle}>{event.name}</Text>
        <Text style={s.eventLine}>{dateRange}{dayCount > 1 ? ` (${dayCount} days)` : ''}  ·  Department Sheets</Text>
        {updatedByName && <Text style={s.updatedLine}>Updated by {updatedByName}  ·  {formatTimestamp(event.updated_at)}</Text>}
      </View>
    </View>
  )
}

function SummaryBar({ event }: { event: Event }) {
  return (
    <View style={s.summaryBar}>
      <View style={s.sumItem}><Text style={s.sumLabel}>Guests</Text><Text style={s.sumVal}>{event.pax != null ? event.pax : '—'}</Text></View>
      {event.location && (
        <View style={s.sumItem}><Text style={s.sumLabel}>Location</Text><Text style={s.sumVal}>{event.location}</Text></View>
      )}
      {event.contact_name && (
        <View style={s.sumItem}>
          <Text style={s.sumLabel}>Contact</Text>
          <Text style={s.sumVal}>{event.contact_name}{event.contact_phone ? `  ${event.contact_phone}` : ''}</Text>
        </View>
      )}
    </View>
  )
}

function ScheduleSection({ scheduleItems }: { scheduleItems: ScheduleItem[] }) {
  if (scheduleItems.length === 0) return null
  const byDate = new Map<string, ScheduleItem[]>()
  for (const item of scheduleItems) {
    if (!byDate.has(item.item_date)) byDate.set(item.item_date, [])
    byDate.get(item.item_date)!.push(item)
  }
  const dates = Array.from(byDate.keys()).sort()
  return (
    <View style={s.schedWrap}>
      <Text style={s.secLabel}>FULL SCHEDULE</Text>
      {dates.map(date => (
        <View key={date} style={{ marginBottom: 5 }}>
          <Text style={s.dayHead}>{pdfDateShort(date)}</Text>
          {(byDate.get(date) ?? []).map(item => (
            <View key={item.id} style={s.schedRow}>
              <Text style={s.schedTime}>{item.start_time ? formatTime(item.start_time) : ''}</Text>
              <Text style={s.schedTitle}>{item.title}{item.location ? `  ·  ${item.location}` : ''}</Text>
            </View>
          ))}
        </View>
      ))}
      <View style={s.rule} />
    </View>
  )
}

type Props = {
  event: Event
  departments: Department[]
  assignments: Assignment[]
  scheduleItems: ScheduleItem[]
  notes: EventNote[]
  updatedByName: string | null
  layout: 'paged' | 'combined'
  recentHours?: number
}

export function MultiDeptSheetPDF({ event, departments, assignments, scheduleItems, notes, updatedByName, layout, recentHours = 0 }: Props) {
  const dayCount = getDayCount(event.start_date, event.end_date)
  const dateRange = formatDateRange(event.start_date, event.end_date)
  const deptNotes = notes.filter(n => n.print_on_dept_sheets)

  const assignsByDept = new Map<string, Assignment[]>()
  for (const a of assignments) {
    if (!assignsByDept.has(a.department_id)) assignsByDept.set(a.department_id, [])
    assignsByDept.get(a.department_id)!.push(a)
  }

  if (layout === 'paged') {
    return (
      <Document>
        {departments.map(dept => {
          const deptAssignments = assignsByDept.get(dept.id) ?? []
          const rowTint = tint(dept.color, 0.08)
          return (
            <Page key={dept.id} size="LETTER" style={s.page}>
              <PageHeader event={event} dayCount={dayCount} dateRange={dateRange} updatedByName={updatedByName} />
              <SummaryBar event={event} />
              <ScheduleSection scheduleItems={scheduleItems} />
              <DeptSection dept={dept} assignments={deptAssignments} rowTint={rowTint} event={event} recentHours={recentHours} />
              {deptNotes.length > 0 && (
                <View style={s.notesWrap}>
                  <Text style={s.secLabel}>NOTES</Text>
                  {deptNotes.map((n, i) => (
                    <Text key={n.id} style={{ fontSize: T.body, color: C.body, marginTop: i > 0 ? 3 : 0 }}>{n.content}</Text>
                  ))}
                </View>
              )}
            </Page>
          )
        })}
      </Document>
    )
  }

  // Combined: one flowing document
  return (
    <Document>
      <Page size="LETTER" style={s.page}>
        <PageHeader event={event} dayCount={dayCount} dateRange={dateRange} updatedByName={updatedByName} />
        <SummaryBar event={event} />
        <ScheduleSection scheduleItems={scheduleItems} />
        {departments.map(dept => {
          const deptAssignments = assignsByDept.get(dept.id) ?? []
          const rowTint = tint(dept.color, 0.08)
          return (
            <DeptSection key={dept.id} dept={dept} assignments={deptAssignments} rowTint={rowTint} event={event} recentHours={recentHours} />
          )
        })}
        {deptNotes.length > 0 && (
          <View style={s.notesWrap}>
            <Text style={s.secLabel}>NOTES</Text>
            {deptNotes.map((n, i) => (
              <Text key={n.id} style={{ fontSize: T.body, color: C.body, marginTop: i > 0 ? 3 : 0 }}>{n.content}</Text>
            ))}
          </View>
        )}
      </Page>
    </Document>
  )
}
