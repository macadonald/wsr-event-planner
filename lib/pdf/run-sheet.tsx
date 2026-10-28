import React from 'react'
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import type { Assignment, Department } from '@/lib/types'
import { formatDate } from '@/lib/time'
import { C, taskTimeLabel } from './shared'

const s = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 9, color: C.brown, paddingHorizontal: 36, paddingVertical: 30 },

  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: 6, borderBottomWidth: 0.75, borderBottomColor: C.border, marginBottom: 7 },
  brandName: { fontFamily: 'Helvetica-Bold', fontSize: 11, color: C.brown },
  brandSub: { fontSize: 7, color: C.brownLight, marginTop: 1 },
  sheetTitle: { fontFamily: 'Helvetica-Bold', fontSize: 11, color: C.brown },
  dateRange: { fontSize: 8, color: C.brownMid, marginTop: 2 },

  daySection: { marginBottom: 8 },
  dayHead: { fontFamily: 'Helvetica-Bold', fontSize: 9, color: C.brown, backgroundColor: C.bgSection, paddingHorizontal: 4, paddingVertical: 2, marginBottom: 3 },

  taskRow: { flexDirection: 'row', marginBottom: 1.5, paddingHorizontal: 4 },
  timeCol: { fontSize: 8, color: C.brownLight, width: 60, flexShrink: 0 },
  taskCol: { flex: 1, fontSize: 8.5, color: C.brown },
  eventName: { fontSize: 7.5, color: C.gray },
})

export type RunSheetAssignment = Assignment & {
  event_name: string
  event_location: string | null
  event_pax: number | null
}

type SingleDeptProps = {
  department: Department
  assignments: RunSheetAssignment[]
  fromDate: string
  toDate: string
}

function DeptPage({ department, assignments, fromDate, toDate }: SingleDeptProps) {
  const dateRange = fromDate === toDate ? formatDate(fromDate) : `${formatDate(fromDate)} – ${formatDate(toDate)}`

  // Group by date
  const byDate = new Map<string, RunSheetAssignment[]>()
  for (const a of assignments) {
    if (!byDate.has(a.task_date)) byDate.set(a.task_date, [])
    byDate.get(a.task_date)!.push(a)
  }
  const dates = Array.from(byDate.keys()).sort()

  return (
    <Page size="LETTER" style={s.page}>
      <View style={s.headerRow}>
        <View>
          <Text style={s.brandName}>WSR Events</Text>
          <Text style={s.brandSub}>White Stallion Ranch</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={s.sheetTitle}>{department.name.toUpperCase()} — Run Sheet</Text>
          <Text style={s.dateRange}>{dateRange}</Text>
        </View>
      </View>

      {dates.length === 0 && (
        <Text style={{ fontSize: 8, color: C.gray }}>No assignments in this date range.</Text>
      )}

      {dates.map(date => {
        const items = byDate.get(date)!
        const untimed = items.filter(a => !a.task_time)
        const timed = items.filter(a => a.task_time).sort((a, b) => (a.task_time! > b.task_time! ? 1 : -1))

        return (
          <View key={date} style={s.daySection} wrap={false}>
            <Text style={s.dayHead}>{formatDate(date).toUpperCase()}</Text>
            {untimed.map(a => (
              <View key={a.id} style={s.taskRow}>
                <Text style={s.timeCol}>General</Text>
                <View style={s.taskCol}>
                  <Text>{a.task}</Text>
                  <Text style={s.eventName}>
                    {a.event_name}
                    {a.event_location ? `  ·  ${a.event_location}` : ''}
                    {a.event_pax != null ? `  ·  ${a.event_pax} pax` : ''}
                    {a.notes ? `  ·  ${a.notes}` : ''}
                  </Text>
                </View>
              </View>
            ))}
            {timed.map(a => (
              <View key={a.id} style={s.taskRow}>
                <Text style={s.timeCol}>{taskTimeLabel(a.task_time, a.time_type)}</Text>
                <View style={s.taskCol}>
                  <Text>{a.task}</Text>
                  <Text style={s.eventName}>
                    {a.event_name}
                    {a.event_location ? `  ·  ${a.event_location}` : ''}
                    {a.event_pax != null ? `  ·  ${a.event_pax} pax` : ''}
                    {a.notes ? `  ·  ${a.notes}` : ''}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )
      })}
    </Page>
  )
}

type Props = {
  departments: Department[]
  assignmentsByDept: Map<string, RunSheetAssignment[]>
  fromDate: string
  toDate: string
}

export function RunSheetPDF({ departments, assignmentsByDept, fromDate, toDate }: Props) {
  const deptsWithWork = departments.filter(d => (assignmentsByDept.get(d.id)?.length ?? 0) > 0)

  return (
    <Document>
      {deptsWithWork.map(dept => (
        <DeptPage
          key={dept.id}
          department={dept}
          assignments={assignmentsByDept.get(dept.id) ?? []}
          fromDate={fromDate}
          toDate={toDate}
        />
      ))}
      {deptsWithWork.length === 0 && (
        <Page size="LETTER" style={s.page}>
          <Text style={{ fontSize: 9, color: C.gray }}>No assignments found in this date range.</Text>
        </Page>
      )}
    </Document>
  )
}
