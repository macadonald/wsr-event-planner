import React from 'react'
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import type { Assignment, Department, Event, EventNote, ScheduleItem } from '@/lib/types'
import { formatTime, formatTimestamp } from '@/lib/time'
import { getDayCount, formatDateRange } from '@/lib/events'
import { bandColor } from './shared'
import { registerLedgerFonts } from './fonts'
import { rlDateShort, rlDateRange, rlColHead, buildRLDeptRows } from './ranch-ledger-plan'

registerLedgerFonts()

// ── palette & scale (mirrors ranch-ledger-plan) ──────────────────────────────
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
const TITLE = 18

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
  deptName: { fontFamily: 'SourceSerif4', fontSize: TITLE, fontWeight: 700, color: RL.brownDark, marginTop: 3, lineHeight: 1.2 },
  headerRight: { alignItems: 'flex-end', gap: 4 },
  headerEventName: { fontFamily: 'SourceSerif4', fontSize: 11, fontWeight: 700, color: RL.brownMid },
  headerDate: { fontSize: SMALL, color: RL.label },
  headerRule: { borderBottomWidth: 2, borderBottomColor: RL.brownMid, marginBottom: 14 },

  summaryBar: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14, paddingBottom: 10, borderBottomWidth: 0.5, borderBottomColor: RL.border },
  sumItem: { flexDirection: 'row', gap: 4, alignItems: 'baseline' },
  sumLabel: { fontSize: NOTE, color: RL.label },
  sumVal: { fontSize: SMALL, color: RL.text },

  schedWrap: { marginBottom: 16 },
  schedSectLabel: { fontFamily: 'SourceSerif4', fontWeight: 700, fontSize: SECT, letterSpacing: 0.6, color: RL.label, marginBottom: 8 },
  schedCols: { flexDirection: 'row', gap: 6 },
  schedCol: { flex: 1, backgroundColor: RL.fillLight, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 7 },
  schedColHead: { fontFamily: 'Inter', fontWeight: 700, fontSize: SMALL, color: RL.brownMid, marginBottom: 5, borderBottomWidth: 0.5, borderBottomColor: RL.border, paddingBottom: 3 },
  schedItem: { marginBottom: 4 },
  schedTime: { fontSize: NOTE, color: RL.brownMid, lineHeight: 1.3 },
  schedTitle: { fontSize: SMALL, color: RL.text, lineHeight: 1.3 },
  schedLoc: { fontSize: NOTE, color: RL.label, lineHeight: 1.2 },

  deptSectLabel: { fontFamily: 'SourceSerif4', fontWeight: 700, fontSize: SECT, letterSpacing: 0.6, color: RL.label, marginBottom: 8 },
  deptCard: { borderRadius: 5, borderWidth: 0.5, borderColor: RL.border, overflow: 'hidden', marginBottom: 8 },
  deptCardHead: { paddingHorizontal: 8, paddingVertical: 6, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  deptCardName: { fontFamily: 'Inter', fontWeight: 700, fontSize: SMALL, color: RL.white },
  deptCardCount: { fontSize: NOTE, color: RL.white },
  deptTaskRow: { flexDirection: 'row', paddingHorizontal: 8, paddingVertical: 3.5, borderBottomWidth: 0.5, borderBottomColor: RL.border },
  deptTaskLeft: { width: 52, flexShrink: 0, paddingRight: 4 },
  deptTaskDay: { fontFamily: 'Inter', fontWeight: 700, fontSize: NOTE, color: RL.brownMid, lineHeight: 1.3 },
  deptTaskTime: { fontSize: NOTE, color: RL.label, lineHeight: 1.3 },
  deptTaskRight: { flex: 1 },
  deptTaskText: { fontSize: SMALL, color: RL.text, lineHeight: 1.4 },
  deptTaskNote: { fontSize: NOTE, color: RL.label, marginTop: 0.5, lineHeight: 1.3 },

  notesBox: { backgroundColor: RL.amber, borderRadius: 6, padding: 10, marginTop: 8 },
  notesSectLabel: { fontFamily: 'SourceSerif4', fontWeight: 700, fontSize: SECT, letterSpacing: 0.6, color: RL.brownMid, marginBottom: 5 },
  notesText: { fontSize: BODY, color: RL.text, lineHeight: 1.4 },

  footer: { position: 'absolute', bottom: 22, left: PAD, right: PAD, flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 0.5, borderTopColor: RL.border, paddingTop: 5 },
  footerText: { fontSize: NOTE, color: RL.label },
})

// ── shared sub-components ─────────────────────────────────────────────────────

function RLDeptCardFull({ dept, deptAssignments }: { dept: Department; deptAssignments: Assignment[] }) {
  const band = bandColor(dept.color)
  const { collapsedRows, byDate, dates } = buildRLDeptRows(deptAssignments)
  const totalTasks = deptAssignments.length

  return (
    <View style={s.deptCard}>
      <View style={[s.deptCardHead, { backgroundColor: band }]}>
        <Text style={s.deptCardName}>{dept.name.toUpperCase()} — TASKS</Text>
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

function RLPageHeader({ event, dayCount, dateRange, updatedByName, deptName }: {
  event: Event; dayCount: number; dateRange: string; updatedByName: string | null; deptName: string
}) {
  return (
    <>
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

      <View style={s.headerRow}>
        <View style={s.headerLeft}>
          <Text style={s.headerBrand}>WHITE STALLION RANCH · DEPARTMENT SHEET</Text>
          <Text style={s.deptName}>{deptName}</Text>
        </View>
        <View style={s.headerRight}>
          <Text style={s.headerEventName}>{event.name}</Text>
          <Text style={s.headerDate}>{dateRange}{dayCount > 1 ? `  ·  ${dayCount} Days` : ''}</Text>
        </View>
      </View>
      <View style={s.headerRule} />
    </>
  )
}

function RLSummaryBar({ event }: { event: Event }) {
  return (
    <View style={s.summaryBar}>
      <View style={s.sumItem}>
        <Text style={s.sumLabel}>Guests</Text>
        <Text style={s.sumVal}>{event.pax != null ? event.pax : '—'}</Text>
      </View>
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
    </View>
  )
}

function RLScheduleSection({ scheduleItems }: { scheduleItems: ScheduleItem[] }) {
  if (scheduleItems.length === 0) return null
  const byDate = new Map<string, ScheduleItem[]>()
  for (const item of scheduleItems) {
    if (!byDate.has(item.item_date)) byDate.set(item.item_date, [])
    byDate.get(item.item_date)!.push(item)
  }
  const dates = Array.from(byDate.keys()).sort()
  const dayRows: string[][] = []
  for (let i = 0; i < dates.length; i += 4) dayRows.push(dates.slice(i, i + 4))

  return (
    <View style={s.schedWrap}>
      <Text style={s.schedSectLabel}>FULL SCHEDULE</Text>
      {dayRows.map((row, ri) => (
        <View key={ri} style={[s.schedCols, ri < dayRows.length - 1 ? { marginBottom: 6 } : {}]}>
          {row.map(date => {
            const items = byDate.get(date) ?? []
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
  )
}

// ── single dept sheet ─────────────────────────────────────────────────────────
type SingleProps = {
  event: Event
  department: Department
  scheduleItems: ScheduleItem[]
  assignments: Assignment[]
  notes: EventNote[]
  updatedByName: string | null
}

export function RanchLedgerDeptSheetPDF({ event, department, scheduleItems, assignments, notes, updatedByName }: SingleProps) {
  const dayCount = getDayCount(event.start_date, event.end_date)
  const dateRange = formatDateRange(event.start_date, event.end_date)
  const deptAssignments = assignments.filter(a => a.department_id === department.id)
  const deptNotes = notes.filter(n => n.print_on_dept_sheets)

  return (
    <Document>
      <Page size="LETTER" style={s.page}>
        <RLPageHeader event={event} dayCount={dayCount} dateRange={dateRange} updatedByName={updatedByName} deptName={department.name} />
        <RLSummaryBar event={event} />
        <RLScheduleSection scheduleItems={scheduleItems} />
        <Text style={s.deptSectLabel}>TASKS</Text>
        <RLDeptCardFull dept={department} deptAssignments={deptAssignments} />
        {deptNotes.length > 0 && (
          <View style={s.notesBox}>
            <Text style={s.notesSectLabel}>NOTES</Text>
            {deptNotes.map((n, i) => (
              <Text key={n.id} style={[s.notesText, i > 0 ? { marginTop: 4 } : {}]}>{n.content}</Text>
            ))}
          </View>
        )}
      </Page>
    </Document>
  )
}

// ── multi-dept sheet ──────────────────────────────────────────────────────────
type MultiProps = {
  event: Event
  departments: Department[]
  assignments: Assignment[]
  scheduleItems: ScheduleItem[]
  notes: EventNote[]
  updatedByName: string | null
  layout: 'paged' | 'combined'
}

export function RanchLedgerMultiDeptSheetPDF({ event, departments, assignments, scheduleItems, notes, updatedByName, layout }: MultiProps) {
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
        {departments.map(dept => (
          <Page key={dept.id} size="LETTER" style={s.page}>
            <RLPageHeader event={event} dayCount={dayCount} dateRange={dateRange} updatedByName={updatedByName} deptName={dept.name} />
            <RLSummaryBar event={event} />
            <RLScheduleSection scheduleItems={scheduleItems} />
            <Text style={s.deptSectLabel}>TASKS</Text>
            <RLDeptCardFull dept={dept} deptAssignments={assignsByDept.get(dept.id) ?? []} />
            {deptNotes.length > 0 && (
              <View style={s.notesBox}>
                <Text style={s.notesSectLabel}>NOTES</Text>
                {deptNotes.map((n, i) => (
                  <Text key={n.id} style={[s.notesText, i > 0 ? { marginTop: 4 } : {}]}>{n.content}</Text>
                ))}
              </View>
            )}
          </Page>
        ))}
      </Document>
    )
  }

  // Combined: one flowing document
  return (
    <Document>
      <Page size="LETTER" style={s.page}>
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

        <View style={s.headerRow}>
          <View style={s.headerLeft}>
            <Text style={s.headerBrand}>WHITE STALLION RANCH · DEPARTMENT SHEETS</Text>
            <Text style={s.deptName}>{event.name}</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.headerDate}>{dateRange}{dayCount > 1 ? `  ·  ${dayCount} Days` : ''}</Text>
          </View>
        </View>
        <View style={s.headerRule} />

        <RLSummaryBar event={event} />
        <RLScheduleSection scheduleItems={scheduleItems} />

        <Text style={s.deptSectLabel}>TASKS</Text>
        {departments.map(dept => (
          <RLDeptCardFull key={dept.id} dept={dept} deptAssignments={assignsByDept.get(dept.id) ?? []} />
        ))}

        {deptNotes.length > 0 && (
          <View style={s.notesBox}>
            <Text style={s.notesSectLabel}>NOTES</Text>
            {deptNotes.map((n, i) => (
              <Text key={n.id} style={[s.notesText, i > 0 ? { marginTop: 4 } : {}]}>{n.content}</Text>
            ))}
          </View>
        )}
      </Page>
    </Document>
  )
}
