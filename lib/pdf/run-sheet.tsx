import React from 'react'
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import type { Assignment, Department } from '@/lib/types'
import { C, T, SP, bandColor, tint, taskTimeLabel, pdfDateShort } from './shared'
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
  titleBlock: { alignItems: 'flex-end', gap: 2 },
  sheetTitle: { fontFamily: 'Helvetica-Bold', fontSize: 12, color: C.brown },
  dateRange: { fontSize: T.small, color: C.label },

  // Day section
  daySec: { marginBottom: 8 },
  dayBand: {
    paddingHorizontal: SP.cellPadH,
    paddingVertical: 3,
    marginBottom: 0,
  },
  dayBandText: { fontFamily: 'Helvetica-Bold', fontSize: T.small, color: C.white },

  // Task rows
  taskRow: { flexDirection: 'row', paddingHorizontal: SP.cellPadH, paddingVertical: SP.rowPadV },
  timeCol: { width: SP.timeColW, flexShrink: 0 },
  timeText: { fontSize: T.small, color: C.label },
  timeBold: { fontFamily: 'Helvetica-Bold', fontSize: T.small, color: C.label },
  taskCol: { flex: 1 },
  taskText: { fontSize: T.body, color: C.body },
  taskMeta: { fontSize: T.note, color: C.note, marginTop: 0.5 },
})

export type RunSheetAssignment = Assignment & {
  event_name: string
  event_location: string | null
  event_pax: number | null
  event_start_date: string
  event_end_date: string
}

type SingleDeptProps = {
  department: Department
  assignments: RunSheetAssignment[]
  fromDate: string
  toDate: string
  recentHours?: number
}

function DeptPage({ department, assignments, fromDate, toDate, recentHours = 0 }: SingleDeptProps) {
  const band = bandColor(department.color)
  const rowTint = tint(department.color, 0.08)

  const dateRange = fromDate === toDate ? pdfDateShort(fromDate) : `${pdfDateShort(fromDate)} – ${pdfDateShort(toDate)}`

  // Group by date
  const byDate = new Map<string, RunSheetAssignment[]>()
  for (const a of assignments) {
    if (!byDate.has(a.task_date)) byDate.set(a.task_date, [])
    byDate.get(a.task_date)!.push(a)
  }
  const dates = Array.from(byDate.keys()).sort()

  return (
    <Page size="LETTER" style={s.page}>
      {/* Header */}
      <View style={s.headerWrap}>
        <View>
          <Text style={s.brandName}>White Stallion Ranch</Text>
        </View>
        <View style={s.titleBlock}>
          <Text style={[s.sheetTitle, { color: band }]}>{department.name.toUpperCase()}</Text>
          <Text style={s.dateRange}>Run Sheet  ·  {dateRange}</Text>
        </View>
      </View>

      {dates.length === 0 && (
        <Text style={{ fontSize: T.body, color: C.small }}>No assignments in this date range.</Text>
      )}

      {dates.map(date => {
        const items = byDate.get(date)!
        const untimed = items.filter(a => !a.task_time)
        const timed = items.filter(a => a.task_time).sort((a, b) => (a.task_time! > b.task_time! ? 1 : -1))
        const allRows = [...untimed, ...timed]

        return (
          <View key={date} style={s.daySec} wrap={false}>
            {/* Day header band */}
            <View style={[s.dayBand, { backgroundColor: band }]}>
              <Text style={s.dayBandText}>{pdfDateShort(date)}</Text>
            </View>

            {allRows.map((a, i) => {
              const bg = i % 2 === 0 ? C.white : rowTint
              const isUntimed = !a.task_time
              const metaParts = [a.event_name]
              if (a.event_location) metaParts.push(a.event_location)
              if (a.event_pax != null && a.event_pax > 0) metaParts.push(`${a.event_pax} pax`)
              const dateLabel = a.task_date < a.event_start_date ? 'Prep' : a.task_date > a.event_end_date ? 'Teardown' : null
              if (dateLabel) metaParts.push(`(${dateLabel})`)
              if (a.notes) metaParts.push(a.notes)
              const isUpdated = recentHours > 0 && isWithinHours(a.updated_at, recentHours)

              return (
                <View key={a.id} style={[s.taskRow, { backgroundColor: bg }]}>
                  <View style={s.timeCol}>
                    {isUntimed ? (
                      <Text style={s.timeText}>General</Text>
                    ) : (
                      <Text style={s.timeText}>
                        <Text style={s.timeBold}>{a.time_type === 'by' ? 'By ' : 'At '}</Text>
                        {/* formatTime used via taskTimeLabel below would include prefix; just show time */}
                        {taskTimeLabel(a.task_time, a.time_type).replace(/^(At|By) /, '')}
                      </Text>
                    )}
                  </View>
                  <View style={s.taskCol}>
                    <Text style={s.taskText}>{a.task}{isUpdated && <Text style={{ fontSize: T.note, color: C.amber, fontFamily: 'Helvetica-Bold', paddingLeft: 4 }}>  UPDATED</Text>}</Text>
                    <Text style={s.taskMeta}>{metaParts.join('  ·  ')}</Text>
                  </View>
                </View>
              )
            })}
          </View>
        )
      })}
    </Page>
  )
}

// ── combined layout (all depts, one flowing document) ────────────────────────

function CombinedDeptSection({ dept, assignments, recentHours = 0 }: { dept: Department; assignments: RunSheetAssignment[]; recentHours?: number }) {
  const band = bandColor(dept.color)
  const rowTint = tint(dept.color, 0.08)

  const byDate = new Map<string, RunSheetAssignment[]>()
  for (const a of assignments) {
    if (!byDate.has(a.task_date)) byDate.set(a.task_date, [])
    byDate.get(a.task_date)!.push(a)
  }
  const dates = Array.from(byDate.keys()).sort()

  return (
    <View style={{ marginBottom: 8 }}>
      {/* Dept name band */}
      <View style={[s.dayBand, { backgroundColor: band, paddingVertical: 5 }]}>
        <Text style={[s.dayBandText, { fontSize: T.body }]}>{dept.name.toUpperCase()}</Text>
      </View>

      {dates.length === 0 && (
        <View style={[s.taskRow, { backgroundColor: C.white }]}>
          <Text style={{ fontSize: T.small, color: C.small }}>No assignments in this date range.</Text>
        </View>
      )}

      {dates.map(date => {
        const items = byDate.get(date)!
        const untimed = items.filter(a => !a.task_time)
        const timed = items.filter(a => a.task_time).sort((a, b) => (a.task_time! > b.task_time! ? 1 : -1))
        return (
          <View key={date}>
            <View style={{ backgroundColor: C.stripeOdd, paddingHorizontal: SP.cellPadH, paddingVertical: 2 }}>
              <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: T.small, color: C.brown }}>{pdfDateShort(date)}</Text>
            </View>
            {[...untimed, ...timed].map((a, i) => {
              const bg = i % 2 === 0 ? C.white : rowTint
              const metaParts = [a.event_name]
              if (a.event_location) metaParts.push(a.event_location)
              const dateLabelC = a.task_date < a.event_start_date ? 'Prep' : a.task_date > a.event_end_date ? 'Teardown' : null
              if (dateLabelC) metaParts.push(`(${dateLabelC})`)
              if (a.notes) metaParts.push(a.notes)
              const isUpdatedC = recentHours > 0 && isWithinHours(a.updated_at, recentHours)
              return (
                <View key={a.id} style={[s.taskRow, { backgroundColor: bg }]}>
                  <View style={s.timeCol}>
                    {!a.task_time ? (
                      <Text style={s.timeText}>General</Text>
                    ) : (
                      <Text style={s.timeText}>
                        <Text style={s.timeBold}>{a.time_type === 'by' ? 'By ' : 'At '}</Text>
                        {taskTimeLabel(a.task_time, a.time_type).replace(/^(At|By) /, '')}
                      </Text>
                    )}
                  </View>
                  <View style={s.taskCol}>
                    <Text style={s.taskText}>{a.task}{isUpdatedC && <Text style={{ fontSize: T.note, color: C.amber, fontFamily: 'Helvetica-Bold', paddingLeft: 4 }}>  UPDATED</Text>}</Text>
                    <Text style={s.taskMeta}>{metaParts.join('  ·  ')}</Text>
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
  departments: Department[]
  assignmentsByDept: Map<string, RunSheetAssignment[]>
  fromDate: string
  toDate: string
  layout?: 'paged' | 'combined'
  recentHours?: number
}

export function RunSheetPDF({ departments, assignmentsByDept, fromDate, toDate, layout = 'paged', recentHours = 0 }: Props) {
  const deptsWithWork = departments.filter(d => (assignmentsByDept.get(d.id)?.length ?? 0) > 0)

  if (layout === 'combined' && deptsWithWork.length > 1) {
    const dateRange = fromDate === toDate
      ? pdfDateShort(fromDate)
      : `${pdfDateShort(fromDate)} – ${pdfDateShort(toDate)}`
    return (
      <Document>
        <Page size="LETTER" style={s.page}>
          <View style={s.headerWrap}>
            <View>
              <Text style={s.brandName}>White Stallion Ranch</Text>
            </View>
            <View style={s.titleBlock}>
              <Text style={s.sheetTitle}>Department Run Sheet</Text>
              <Text style={s.dateRange}>{dateRange}</Text>
            </View>
          </View>
          {deptsWithWork.length === 0 ? (
            <Text style={{ fontSize: T.body, color: C.small }}>No assignments found in this date range.</Text>
          ) : (
            deptsWithWork.map(dept => (
              <CombinedDeptSection
                key={dept.id}
                dept={dept}
                assignments={assignmentsByDept.get(dept.id) ?? []}
                recentHours={recentHours}
              />
            ))
          )}
        </Page>
      </Document>
    )
  }

  // Paged: one page per dept
  return (
    <Document>
      {deptsWithWork.map(dept => (
        <DeptPage
          key={dept.id}
          department={dept}
          assignments={assignmentsByDept.get(dept.id) ?? []}
          fromDate={fromDate}
          toDate={toDate}
          recentHours={recentHours}
        />
      ))}
      {deptsWithWork.length === 0 && (
        <Page size="LETTER" style={s.page}>
          <View style={s.headerWrap}>
            <Text style={s.brandName}>White Stallion Ranch</Text>
          </View>
          <Text style={{ fontSize: T.body, color: C.small }}>No assignments found in this date range.</Text>
        </Page>
      )}
    </Document>
  )
}
