import React from 'react'
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import type { Assignment, Department, Event, ScheduleItem } from '@/lib/types'
import { formatDate, formatTime, formatTimestamp } from '@/lib/time'
import { getDayCount, formatDateRange } from '@/lib/events'
import { taskTimeLabel, C } from './shared'

const s = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 9, color: C.brown, paddingHorizontal: 36, paddingVertical: 30 },

  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: 6, borderBottomWidth: 0.75, borderBottomColor: C.border, marginBottom: 7 },
  brandName: { fontFamily: 'Helvetica-Bold', fontSize: 11, color: C.brown },
  brandSub: { fontSize: 7, color: C.brownLight, marginTop: 1 },
  headerRight: { alignItems: 'flex-end' },
  deptLabel: { fontFamily: 'Helvetica-Bold', fontSize: 11, color: C.brown },
  eventName: { fontSize: 9, color: C.brownMid, marginTop: 2 },
  updatedLine: { fontSize: 7, color: C.gray, marginTop: 1 },

  secLabel: { fontFamily: 'Helvetica-Bold', fontSize: 6.5, color: C.brownLight, marginBottom: 3, letterSpacing: 0.5 },

  infoStrip: { flexDirection: 'row', gap: 10, marginBottom: 7, paddingBottom: 7, borderBottomWidth: 0.5, borderBottomColor: C.borderLight },
  infoCol: { flex: 1 },
  infoKey: { fontSize: 7, color: C.gray, marginBottom: 0.5 },
  infoVal: { fontSize: 8.5, color: C.brown, marginBottom: 2.5 },

  schedSec: { marginBottom: 7, paddingBottom: 7, borderBottomWidth: 0.5, borderBottomColor: C.borderLight },
  dayHead: { fontFamily: 'Helvetica-Bold', fontSize: 7.5, color: C.brown, marginBottom: 2 },
  schedItem: { fontSize: 8, color: C.brown, marginBottom: 1 },
  schedTime: { color: C.brownLight },

  taskSec: { marginBottom: 4 },
  taskDayHead: { fontFamily: 'Helvetica-Bold', fontSize: 8, color: C.brown, marginBottom: 2, marginTop: 4 },
  taskRow: { flexDirection: 'row', marginBottom: 2 },
  taskTimeCol: { fontSize: 7.5, color: C.brownLight, width: 52, flexShrink: 0 },
  taskText: { fontSize: 8.5, color: C.brown, flex: 1 },
  taskNotes: { fontSize: 7.5, color: C.gray, marginLeft: 52, marginBottom: 1 },
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

  // Schedule — condensed: only days that have items
  const schedByDate = new Map<string, ScheduleItem[]>()
  for (const item of scheduleItems) {
    if (!schedByDate.has(item.item_date)) schedByDate.set(item.item_date, [])
    schedByDate.get(item.item_date)!.push(item)
  }
  const scheduleDates = Array.from(schedByDate.keys()).sort()

  // Assignments for this department only
  const deptAssignments = assignments.filter(a => a.department_id === department.id)

  // Group assignments by date
  const assignByDate = new Map<string, Assignment[]>()
  for (const a of deptAssignments) {
    if (!assignByDate.has(a.task_date)) assignByDate.set(a.task_date, [])
    assignByDate.get(a.task_date)!.push(a)
  }
  const assignDates = Array.from(assignByDate.keys()).sort()

  return (
    <Document>
      <Page size="LETTER" style={s.page}>

        {/* Header */}
        <View style={s.headerRow}>
          <View>
            <Text style={s.brandName}>WSR Events</Text>
            <Text style={s.brandSub}>White Stallion Ranch</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.deptLabel}>{department.name}</Text>
            <Text style={s.eventName}>{event.name}  ·  {dateRange}{dayCount > 1 ? ` (${dayCount} days)` : ''}</Text>
            {updatedByName && (
              <Text style={s.updatedLine}>Updated by {updatedByName} · {formatTimestamp(event.updated_at)}</Text>
            )}
          </View>
        </View>

        {/* Event summary strip */}
        <View style={s.infoStrip}>
          {event.pax != null && (
            <View style={s.infoCol}>
              <Text style={s.infoKey}>Guests</Text>
              <Text style={s.infoVal}>{event.pax}</Text>
            </View>
          )}
          {event.location && (
            <View style={s.infoCol}>
              <Text style={s.infoKey}>Location</Text>
              <Text style={s.infoVal}>{event.location}</Text>
            </View>
          )}
          {event.contact_name && (
            <View style={s.infoCol}>
              <Text style={s.infoKey}>Contact</Text>
              <Text style={s.infoVal}>{event.contact_name}</Text>
              {event.contact_phone && <Text style={s.infoKey}>{event.contact_phone}</Text>}
            </View>
          )}
          {event.onsite_contact && (
            <View style={s.infoCol}>
              <Text style={s.infoKey}>On-site</Text>
              <Text style={s.infoVal}>{event.onsite_contact}</Text>
            </View>
          )}
        </View>

        {/* Condensed schedule */}
        {scheduleDates.length > 0 && (
          <View style={s.schedSec}>
            <Text style={s.secLabel}>FULL SCHEDULE</Text>
            {scheduleDates.map(date => (
              <View key={date} style={{ marginBottom: 4 }}>
                <Text style={s.dayHead}>{formatDate(date)}</Text>
                {(schedByDate.get(date) ?? []).map(item => (
                  <Text key={item.id} style={s.schedItem}>
                    {item.start_time
                      ? <Text style={s.schedTime}>{formatTime(item.start_time)}{'  '}</Text>
                      : null
                    }
                    {item.title}
                    {item.location ? `  ·  ${item.location}` : ''}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        )}

        {/* Department tasks */}
        <View style={s.taskSec}>
          <Text style={s.secLabel}>{department.name.toUpperCase()} TASKS</Text>
          {assignDates.length === 0 && (
            <Text style={{ fontSize: 8, color: C.gray }}>No tasks assigned.</Text>
          )}
          {assignDates.map(date => {
            const items = assignByDate.get(date)!
            const untimed = items.filter(a => !a.task_time)
            const timed = items.filter(a => a.task_time).sort((a, b) => (a.task_time! > b.task_time! ? 1 : -1))
            return (
              <View key={date}>
                <Text style={s.taskDayHead}>{formatDate(date)}</Text>
                {untimed.map(a => (
                  <View key={a.id}>
                    <View style={s.taskRow}>
                      <Text style={s.taskTimeCol}>General</Text>
                      <Text style={s.taskText}>{a.task}</Text>
                    </View>
                    {a.notes && <Text style={s.taskNotes}>{a.notes}</Text>}
                  </View>
                ))}
                {timed.map(a => (
                  <View key={a.id}>
                    <View style={s.taskRow}>
                      <Text style={s.taskTimeCol}>{taskTimeLabel(a.task_time, a.time_type)}</Text>
                      <Text style={s.taskText}>{a.task}</Text>
                    </View>
                    {a.notes && <Text style={s.taskNotes}>{a.notes}</Text>}
                  </View>
                ))}
              </View>
            )
          })}
        </View>

        {/* Special notes */}
        {event.special_notes && (
          <View style={{ marginTop: 8, paddingTop: 6, borderTopWidth: 0.5, borderTopColor: C.borderLight }}>
            <Text style={s.secLabel}>SPECIAL NOTES</Text>
            <Text style={{ fontSize: 8.5, color: C.brown }}>{event.special_notes}</Text>
          </View>
        )}

      </Page>
    </Document>
  )
}
