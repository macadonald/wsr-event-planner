import React from 'react'
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import type { Assignment, Department, Event, EventBilling, ScheduleItem } from '@/lib/types'
import { formatDate, formatTime, formatTimestamp } from '@/lib/time'
import { getDayCount, formatDateRange, shiftDate } from '@/lib/events'
import { sortDeptsByPdfOrder, taskTimeLabel, C } from './shared'

const s = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 9, color: C.brown, paddingHorizontal: 36, paddingVertical: 30 },

  // Header
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: 6, borderBottomWidth: 0.75, borderBottomColor: C.border, marginBottom: 7 },
  brandName: { fontFamily: 'Helvetica-Bold', fontSize: 11, color: C.brown },
  brandSub: { fontSize: 7, color: C.brownLight, marginTop: 1 },
  headerRight: { alignItems: 'flex-end' },
  eventName: { fontFamily: 'Helvetica-Bold', fontSize: 13, color: C.brown },
  eventMeta: { fontSize: 8, color: C.brownMid, marginTop: 2 },
  updatedLine: { fontSize: 7, color: C.gray, marginTop: 1 },

  // Section label
  secLabel: { fontFamily: 'Helvetica-Bold', fontSize: 6.5, color: C.brownLight, marginBottom: 3, letterSpacing: 0.5 },

  // Info strip (3 columns)
  infoStrip: { flexDirection: 'row', gap: 10, marginBottom: 7, paddingBottom: 7, borderBottomWidth: 0.5, borderBottomColor: C.borderLight },
  infoCol: { flex: 1 },
  infoKey: { fontSize: 7, color: C.gray, marginBottom: 0.5 },
  infoVal: { fontSize: 8.5, color: C.brown, marginBottom: 2.5 },

  // Schedule
  schedSec: { marginBottom: 7, paddingBottom: 7, borderBottomWidth: 0.5, borderBottomColor: C.borderLight },
  schedDayRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 0 },
  dayBlock: { marginBottom: 5, paddingRight: 8 },
  dayHead: { fontFamily: 'Helvetica-Bold', fontSize: 7.5, color: C.brown, marginBottom: 2 },
  schedItem: { fontSize: 8, color: C.brown, marginBottom: 1 },
  schedTime: { color: C.brownLight },

  // Dept coordination
  deptSec: { marginBottom: 7 },
  deptGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  deptBlock: { width: '50%', marginBottom: 6, paddingRight: 12 },
  deptHead: { fontFamily: 'Helvetica-Bold', fontSize: 7.5, color: C.brown, marginBottom: 2, borderBottomWidth: 0.5, borderBottomColor: C.borderLight, paddingBottom: 1 },
  deptTaskRow: { flexDirection: 'row', marginBottom: 1.5 },
  deptTaskTime: { fontSize: 7.5, color: C.brownLight, width: 52, flexShrink: 0 },
  deptTaskText: { fontSize: 8, color: C.brown, flex: 1 },

  // Notes
  notesSec: { marginTop: 4 },
  notesText: { fontSize: 8.5, color: C.brown },
})

type Props = {
  event: Event
  billing: EventBilling | null
  showBilling: boolean
  scheduleItems: ScheduleItem[]
  assignments: Assignment[]
  departments: Department[]
  updatedByName: string | null
}

export function FullEventPlanPDF({ event, billing, showBilling, scheduleItems, assignments, departments, updatedByName }: Props) {
  const dayCount = getDayCount(event.start_date, event.end_date)
  const dateRange = formatDateRange(event.start_date, event.end_date)

  // Schedule: group by date
  const allDays = Array.from({ length: dayCount }, (_, i) => shiftDate(event.start_date, i))
  const schedByDate = new Map<string, ScheduleItem[]>()
  for (const item of scheduleItems) {
    const key = item.item_date
    if (!schedByDate.has(key)) schedByDate.set(key, [])
    schedByDate.get(key)!.push(item)
  }
  // days that have items
  const activeDays = allDays.filter(d => (schedByDate.get(d)?.length ?? 0) > 0)

  // Assignments: grouped by dept in PDF order, skip depts with no assignments
  const deptsWithAssignments = sortDeptsByPdfOrder(
    departments.filter(d => assignments.some(a => a.department_id === d.id))
  )
  const assignsByDept = new Map<string, Assignment[]>()
  for (const a of assignments) {
    if (!assignsByDept.has(a.department_id)) assignsByDept.set(a.department_id, [])
    assignsByDept.get(a.department_id)!.push(a)
  }

  const hasBilling = showBilling && billing && (
    billing.room_rental != null || billing.billing_due_date ||
    billing.billing_method || billing.package || billing.notes
  )

  // Schedule column width: if ≤4 days use 50%, otherwise list all vertically
  const multiColSched = activeDays.length >= 2 && activeDays.length <= 6
  const dayColWidth = activeDays.length <= 2 ? '50%'
    : activeDays.length <= 3 ? '33.3%'
    : activeDays.length <= 4 ? '25%'
    : '50%'

  return (
    <Document>
      <Page size="LETTER" style={s.page}>

        {/* ── Header ── */}
        <View style={s.headerRow}>
          <View>
            <Text style={s.brandName}>WSR Events</Text>
            <Text style={s.brandSub}>White Stallion Ranch</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.eventName}>{event.name}</Text>
            <Text style={s.eventMeta}>
              {dateRange}
              {dayCount > 1 ? ` · ${dayCount} days` : ''}
              {event.event_type ? ` · ${event.event_type}` : ''}
            </Text>
            {updatedByName && (
              <Text style={s.updatedLine}>Updated by {updatedByName} · {formatTimestamp(event.updated_at)}</Text>
            )}
          </View>
        </View>

        {/* ── Info strip ── */}
        <View style={s.infoStrip}>
          {/* Contact */}
          <View style={s.infoCol}>
            <Text style={s.secLabel}>CONTACT</Text>
            {event.contact_name && <Text style={s.infoVal}>{event.contact_name}</Text>}
            {event.contact_phone && <Text style={s.infoKey}>{event.contact_phone}</Text>}
            {event.contact_email && <Text style={s.infoKey}>{event.contact_email}</Text>}
            {event.onsite_contact && (
              <Text style={s.infoKey}>On-site: {event.onsite_contact}</Text>
            )}
            {!event.contact_name && !event.contact_phone && !event.contact_email && !event.onsite_contact && (
              <Text style={s.infoKey}>—</Text>
            )}
          </View>

          {/* Event details */}
          <View style={s.infoCol}>
            <Text style={s.secLabel}>EVENT DETAILS</Text>
            {event.pax != null && <Text style={s.infoVal}>{event.pax} guests</Text>}
            {event.location && <Text style={s.infoVal}>{event.location}</Text>}
            {(event.start_time || event.end_time) && (
              <Text style={s.infoKey}>
                {event.start_time ? `Arrive ${formatTime(event.start_time)}` : ''}
                {event.start_time && event.end_time ? ' – ' : ''}
                {event.end_time ? `Depart ${formatTime(event.end_time)}` : ''}
              </Text>
            )}
            {event.description && <Text style={s.infoKey}>{event.description}</Text>}
          </View>

          {/* Billing (admin/planner only) */}
          {hasBilling ? (
            <View style={s.infoCol}>
              <Text style={s.secLabel}>BILLING</Text>
              {billing!.room_rental != null && (
                <Text style={s.infoVal}>${billing!.room_rental.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
              )}
              {billing!.billing_due_date && (
                <Text style={s.infoKey}>Due {formatDate(billing!.billing_due_date)}</Text>
              )}
              {billing!.billing_method && <Text style={s.infoKey}>{billing!.billing_method}</Text>}
              {billing!.package && <Text style={s.infoKey}>{billing!.package}</Text>}
              {billing!.notes && <Text style={s.infoKey}>{billing!.notes}</Text>}
            </View>
          ) : (
            // keep 3-col balance even with no billing
            <View style={s.infoCol} />
          )}
        </View>

        {/* ── Schedule ── */}
        {activeDays.length > 0 && (
          <View style={s.schedSec}>
            <Text style={s.secLabel}>SCHEDULE</Text>
            {multiColSched ? (
              <View style={[s.schedDayRow]}>
                {activeDays.map(date => {
                  const items = schedByDate.get(date) ?? []
                  return (
                    <View key={date} style={[s.dayBlock, { width: dayColWidth }]}>
                      <Text style={s.dayHead}>{formatDate(date)}</Text>
                      {items.map(item => (
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
                  )
                })}
              </View>
            ) : (
              // vertical list for 1 day or 7+ days
              activeDays.map(date => {
                const items = schedByDate.get(date) ?? []
                return (
                  <View key={date} style={{ marginBottom: 4 }}>
                    <Text style={s.dayHead}>{formatDate(date)}</Text>
                    {items.map(item => (
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
                )
              })
            )}
          </View>
        )}

        {/* ── Department coordination ── */}
        {deptsWithAssignments.length > 0 && (
          <View style={s.deptSec}>
            <Text style={s.secLabel}>DEPARTMENT COORDINATION</Text>
            <View style={s.deptGrid}>
              {deptsWithAssignments.map(dept => {
                const items = assignsByDept.get(dept.id) ?? []
                const untimed = items.filter(a => !a.task_time)
                const timed = items.filter(a => a.task_time).sort((a, b) =>
                  (a.task_time! > b.task_time! ? 1 : -1)
                )
                return (
                  <View key={dept.id} style={s.deptBlock} wrap={false}>
                    <Text style={s.deptHead}>{dept.name.toUpperCase()}</Text>
                    {untimed.map(a => (
                      <View key={a.id} style={s.deptTaskRow}>
                        <Text style={s.deptTaskTime}>General</Text>
                        <Text style={s.deptTaskText}>{a.task}</Text>
                      </View>
                    ))}
                    {timed.map(a => (
                      <View key={a.id} style={s.deptTaskRow}>
                        <Text style={s.deptTaskTime}>{taskTimeLabel(a.task_time, a.time_type)}</Text>
                        <Text style={s.deptTaskText}>{a.task}</Text>
                      </View>
                    ))}
                  </View>
                )
              })}
            </View>
          </View>
        )}

        {/* ── Special notes ── */}
        {event.special_notes && (
          <View style={s.notesSec}>
            <Text style={s.secLabel}>SPECIAL NOTES</Text>
            <Text style={s.notesText}>{event.special_notes}</Text>
          </View>
        )}

      </Page>
    </Document>
  )
}
