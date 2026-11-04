import React from 'react'
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import type { Department } from '@/lib/types'
import type { RunSheetAssignment } from './run-sheet'
import { formatTime } from '@/lib/time'
import { bandColor } from './shared'
import { registerLedgerFonts } from './fonts'
import { rlColHead, rlDateShort } from './ranch-ledger-plan'

registerLedgerFonts()

const RL = {
  text: '#2b2118',
  brownDark: '#3d2716',
  brownMid: '#5a3a22',
  label: '#7a5a40',
  fillLight: '#f8f4ef',
  fillMed: '#f1e9df',
  border: '#e3d6c6',
  white: '#ffffff',
}
const PAD = 44
const BODY = 10
const SMALL = 9
const NOTE = 8
const SECT = 8.5

const s = StyleSheet.create({
  page: {
    fontFamily: 'Inter',
    fontSize: BODY,
    color: RL.text,
    paddingHorizontal: PAD,
    paddingTop: PAD,
    paddingBottom: PAD + 24,
  },

  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  headerLeft: { flex: 1, paddingRight: 16 },
  headerBrand: { fontFamily: 'Inter', fontWeight: 700, fontSize: 7.5, letterSpacing: 1.5, color: RL.label },
  sheetTitle: { fontFamily: 'SourceSerif4', fontSize: 18, fontWeight: 700, color: RL.brownDark, marginTop: 3, lineHeight: 1.2 },
  headerRight: { alignItems: 'flex-end' },
  dateRange: { fontSize: SMALL, color: RL.label },
  headerRule: { borderBottomWidth: 2, borderBottomColor: RL.brownMid, marginBottom: 14 },

  daySec: { marginBottom: 10 },
  dayHead: {
    fontFamily: 'SourceSerif4',
    fontWeight: 700,
    fontSize: SECT,
    letterSpacing: 0.6,
    color: RL.brownMid,
    marginBottom: 4,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: RL.border,
  },

  taskRow: { flexDirection: 'row', paddingVertical: 4, borderBottomWidth: 0.5, borderBottomColor: RL.border },
  timeCol: { width: 54, flexShrink: 0, paddingRight: 4 },
  timeDay: { fontFamily: 'Inter', fontWeight: 700, fontSize: NOTE, color: RL.brownMid, lineHeight: 1.3 },
  timeLabel: { fontSize: NOTE, color: RL.label, lineHeight: 1.3 },
  taskCol: { flex: 1 },
  taskText: { fontSize: SMALL, color: RL.text, lineHeight: 1.4 },
  taskMeta: { fontSize: NOTE, color: RL.label, marginTop: 0.5, lineHeight: 1.3 },

  empty: { fontSize: SMALL, color: RL.label, marginTop: 8 },

  footer: { position: 'absolute', bottom: 22, left: PAD, right: PAD, flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 0.5, borderTopColor: RL.border, paddingTop: 5 },
  footerText: { fontSize: NOTE, color: RL.label },
})

function dateRangeLabel(fromDate: string, toDate: string): string {
  if (fromDate === toDate) return rlColHead(fromDate)
  return `${rlColHead(fromDate)} – ${rlColHead(toDate)}`
}

function RLDeptPage({ department, assignments, fromDate, toDate }: {
  department: Department
  assignments: RunSheetAssignment[]
  fromDate: string
  toDate: string
}) {
  const band = bandColor(department.color)
  const byDate = new Map<string, RunSheetAssignment[]>()
  for (const a of assignments) {
    if (!byDate.has(a.task_date)) byDate.set(a.task_date, [])
    byDate.get(a.task_date)!.push(a)
  }
  const dates = Array.from(byDate.keys()).sort()

  return (
    <Page size="LETTER" style={s.page}>
      <View fixed style={s.footer}>
        <Text style={s.footerText}>{department.name} Run Sheet</Text>
        <Text
          style={s.footerText}
          render={({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) =>
            `Page ${pageNumber} of ${totalPages}`
          }
        />
      </View>

      <View style={s.headerRow}>
        <View style={s.headerLeft}>
          <Text style={s.headerBrand}>WHITE STALLION RANCH · RUN SHEET</Text>
          <Text style={[s.sheetTitle, { color: band }]}>{department.name}</Text>
        </View>
        <View style={s.headerRight}>
          <Text style={s.dateRange}>{dateRangeLabel(fromDate, toDate)}</Text>
        </View>
      </View>
      <View style={s.headerRule} />

      {dates.length === 0 ? (
        <Text style={s.empty}>No assignments in this date range.</Text>
      ) : (
        dates.map(date => {
          const items = byDate.get(date)!
          const untimed = items.filter(a => !a.task_time)
          const timed = items.filter(a => a.task_time).sort((a, b) => (a.task_time! > b.task_time! ? 1 : -1))
          return (
            <View key={date} style={s.daySec} wrap={false}>
              <Text style={s.dayHead}>{rlColHead(date)}</Text>
              {[...untimed, ...timed].map(a => (
                <View key={a.id} style={s.taskRow}>
                  <View style={s.timeCol}>
                    <Text style={s.timeDay}>{rlDateShort(a.task_date)}</Text>
                    <Text style={s.timeLabel}>
                      {a.task_time
                        ? `${a.time_type === 'by' ? 'By' : 'At'} ${formatTime(a.task_time)}`
                        : 'General'}
                    </Text>
                  </View>
                  <View style={s.taskCol}>
                    <Text style={s.taskText}>{a.task}</Text>
                    <Text style={s.taskMeta}>
                      {a.event_name}{a.event_location ? `  ·  ${a.event_location}` : ''}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )
        })
      )}
    </Page>
  )
}

type Props = {
  departments: Department[]
  assignmentsByDept: Map<string, RunSheetAssignment[]>
  fromDate: string
  toDate: string
}

export function RanchLedgerRunSheetPDF({ departments, assignmentsByDept, fromDate, toDate }: Props) {
  return (
    <Document>
      {departments.map(dept => (
        <RLDeptPage
          key={dept.id}
          department={dept}
          assignments={assignmentsByDept.get(dept.id) ?? []}
          fromDate={fromDate}
          toDate={toDate}
        />
      ))}
    </Document>
  )
}
