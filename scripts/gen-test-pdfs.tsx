#!/usr/bin/env tsx
/**
 * Generates test PDFs for visual review.
 * Run: npx tsx --tsconfig tsconfig.json scripts/gen-test-pdfs.tsx
 */
import { renderToBuffer } from '@react-pdf/renderer'
import { writeFileSync, mkdirSync } from 'fs'
import React from 'react'
import { FullEventPlanPDF } from '@/lib/pdf/full-event-plan'
import { DepartmentSheetPDF } from '@/lib/pdf/department-sheet'
import { RunSheetPDF } from '@/lib/pdf/run-sheet'
import type { RunSheetAssignment } from '@/lib/pdf/run-sheet'
import type { Assignment, Department, Event, EventBilling, ScheduleItem } from '@/lib/types'

// ── mock departments (seed colors) ──────────────────────────────────────────
const DEPTS: Department[] = [
  { id: 'd1', name: 'Set-Up',       color: '#7B5E3A', sort_order: 1, active: true, created_at: '' },
  { id: 'd2', name: 'Kitchen',      color: '#C17B3A', sort_order: 2, active: true, created_at: '' },
  { id: 'd3', name: 'Corral',       color: '#8B6355', sort_order: 3, active: true, created_at: '' },
  { id: 'd4', name: 'Activities',   color: '#6B8E4E', sort_order: 4, active: true, created_at: '' },
  { id: 'd5', name: 'Housekeeping', color: '#9E8E6B', sort_order: 5, active: true, created_at: '' },
  { id: 'd6', name: 'Front Desk',   color: '#5A7A8A', sort_order: 6, active: true, created_at: '' },
]

// ── mock event ───────────────────────────────────────────────────────────────
const EVENT: Event = {
  id: 'e1',
  name: 'Unbridled Corporate Retreat',
  event_type: 'In-House Group',
  start_date: '2026-10-28',
  end_date:   '2026-10-30',
  start_time: '14:00',
  end_time:   '12:00',
  pax: 42,
  location: 'Longhorn / Sunrise Patio',
  contact_name: 'Sarah Mitchell',
  contact_phone: '(520) 555-0192',
  contact_email: 'sarah@unbridled.com',
  onsite_contact: 'Tom (cell: 520-555-0101)',
  description: null,
  special_notes: '3 vegetarians · 1 gluten-free · VIP: CEO Janine Ortega, room 12',
  status: 'finalized',
  created_by: 'u1',
  updated_by: 'u1',
  created_at: '2026-10-01T00:00:00Z',
  updated_at: '2026-10-27T15:30:00Z',
}

const BILLING: EventBilling = {
  id: 'b1', event_id: 'e1',
  room_rental: 4200.00,
  billing_due_date: '2026-11-15',
  billing_method: 'Invoice / ACH',
  package: 'All-Inclusive',
  notes: '50% deposit received 10/1',
  created_by: 'u1', updated_by: 'u1',
  created_at: '', updated_at: '',
}

// ── mock schedule ────────────────────────────────────────────────────────────
let sid = 1
function si(date: string, start_time: string | null, title: string, location?: string): ScheduleItem {
  return { id: `s${sid++}`, event_id: 'e1', item_date: date, start_time, end_time: null, title, location: location ?? null, notes: null, created_by: 'u1', updated_by: 'u1', created_at: '', updated_at: '' }
}
const SCHEDULE: ScheduleItem[] = [
  si('2026-10-28', '14:00', 'Guest Arrival & Check-in', 'Main Lodge'),
  si('2026-10-28', '15:00', 'Welcome & Ranch Overview', 'Longhorn Room'),
  si('2026-10-28', '16:30', 'Horseback Ride – Group 1', 'North Corral'),
  si('2026-10-28', '18:30', 'Cocktail Hour', 'Sunrise Patio'),
  si('2026-10-28', '19:30', 'Welcome Dinner', 'Longhorn Room'),
  si('2026-10-29', '07:00', 'Sunrise Trail Ride', 'South Corral'),
  si('2026-10-29', '08:30', 'Breakfast Buffet', 'Dining Hall'),
  si('2026-10-29', '10:00', 'Team Challenge Course', 'Activity Field'),
  si('2026-10-29', '12:30', 'BBQ Lunch', 'Patio'),
  si('2026-10-29', '14:00', 'Free Time / Optional Rides'),
  si('2026-10-29', '18:00', 'Dinner & Awards', 'Longhorn Room'),
  si('2026-10-30', '07:30', 'Breakfast', 'Dining Hall'),
  si('2026-10-30', '09:00', 'Final Ride or Nature Walk', 'Corral'),
  si('2026-10-30', '11:00', 'Checkout & Farewell', 'Main Lodge'),
]

// ── mock assignments ─────────────────────────────────────────────────────────
let aid = 1
function a(dept: Department, date: string, time: string | null, time_type: 'at' | 'by', task: string, notes?: string): Assignment {
  return { id: `a${aid++}`, event_id: 'e1', department_id: dept.id, task, task_date: date, task_time: time, time_type, notes: notes ?? null, completed_at: null, completed_by: null, created_by: 'u1', updated_by: 'u1', created_at: '', updated_at: '' }
}

const SETUP = DEPTS[0], KITCHEN = DEPTS[1], CORRAL = DEPTS[2], ACTIVITIES = DEPTS[3], HOUSEKEEPING = DEPTS[4], FRONTDESK = DEPTS[5]

const ASSIGNMENTS: Assignment[] = [
  // Set-Up
  a(SETUP, '2026-10-28', null, 'at', 'Configure Longhorn Room – 42 guests, round tables', 'See layout diagram in binder'),
  a(SETUP, '2026-10-28', '12:00', 'by', 'Set up welcome signage and registration table'),
  a(SETUP, '2026-10-28', '18:00', 'by', 'Configure Sunrise Patio for cocktail hour', '8 high-top tables'),
  a(SETUP, '2026-10-29', null, 'at', 'Prepare activity field – obstacles, stations'),
  a(SETUP, '2026-10-29', '17:00', 'by', 'Configure Longhorn for awards dinner', 'Projector + screen needed'),
  // Kitchen
  a(KITCHEN, '2026-10-28', null, 'at', 'Confirm final headcount and dietary restrictions with coordinator'),
  a(KITCHEN, '2026-10-28', '18:00', 'at', 'Cocktail hour – appetizers for 42', 'Vegetarian and GF options on the tray'),
  a(KITCHEN, '2026-10-28', '19:30', 'at', 'Welcome dinner service', '3 vegetarian plates, 1 GF'),
  a(KITCHEN, '2026-10-29', '08:00', 'by', 'Breakfast buffet ready', 'Coffee, eggs, fruit, pastries'),
  a(KITCHEN, '2026-10-29', '12:00', 'by', 'BBQ lunch ready at patio', 'Keep warm until 14:00'),
  a(KITCHEN, '2026-10-29', '18:00', 'at', 'Awards dinner – plated service'),
  a(KITCHEN, '2026-10-30', '07:15', 'by', 'Continental breakfast set up'),
  // Corral
  a(CORRAL, '2026-10-28', null, 'at', 'Assign horses – 42 riders, note skill levels from pre-survey'),
  a(CORRAL, '2026-10-28', '15:30', 'by', 'Group 1 horses tacked and ready', '21 riders'),
  a(CORRAL, '2026-10-29', '06:30', 'by', 'Sunrise ride horses ready – 20 riders'),
  a(CORRAL, '2026-10-29', '13:30', 'at', 'Optional afternoon rides – open corral'),
  a(CORRAL, '2026-10-30', '08:30', 'by', 'Final ride horses ready'),
  // Activities
  a(ACTIVITIES, '2026-10-29', null, 'at', 'Prepare all team challenge equipment and station instructions'),
  a(ACTIVITIES, '2026-10-29', '09:30', 'by', 'Staff positioned at activity field for 10:00 start'),
  a(ACTIVITIES, '2026-10-29', '13:30', 'at', 'Tally scores for awards ceremony'),
  // Housekeeping
  a(HOUSEKEEPING, '2026-10-28', '13:00', 'by', 'All guest rooms ready for 14:00 check-in'),
  a(HOUSEKEEPING, '2026-10-29', '09:00', 'by', 'Common areas cleaned after breakfast'),
  a(HOUSEKEEPING, '2026-10-30', '10:00', 'at', 'Begin turnover of all guest rooms'),
  // Front Desk
  a(FRONTDESK, '2026-10-28', '13:30', 'by', 'Check-in packets ready – room keys, itinerary, ranch map'),
  a(FRONTDESK, '2026-10-28', '14:00', 'at', 'Man check-in table – greet guests, distribute packets'),
  a(FRONTDESK, '2026-10-30', null, 'at', 'Process checkouts – collect keys, finalize folios'),
]

type PdfArg = Parameters<typeof renderToBuffer>[0]

async function gen(name: string, element: React.ReactElement) {
  const buf = await renderToBuffer(element as unknown as PdfArg)
  const path = `/tmp/wsr-pdf-test/${name}.pdf`
  writeFileSync(path, buf)
  console.log(`  ✓ ${path}`)
}

mkdirSync('/tmp/wsr-pdf-test', { recursive: true })
console.log('Generating test PDFs...')

async function main() {
  await gen('full-event-plan', <FullEventPlanPDF
    event={EVENT}
    billing={BILLING}
    showBilling={true}
    scheduleItems={SCHEDULE}
    assignments={ASSIGNMENTS}
    departments={DEPTS}
    updatedByName="T Mac"
  />)

  await gen('dept-sheet-kitchen', <DepartmentSheetPDF
    event={EVENT}
    department={KITCHEN}
    scheduleItems={SCHEDULE}
    assignments={ASSIGNMENTS}
    updatedByName="T Mac"
  />)

  const assignByDept = new Map<string, RunSheetAssignment[]>()
  for (const a of ASSIGNMENTS) {
    if (!assignByDept.has(a.department_id)) assignByDept.set(a.department_id, [])
    assignByDept.get(a.department_id)!.push({
      ...a,
      event_name: EVENT.name,
      event_location: EVENT.location,
      event_pax: EVENT.pax,
    })
  }

  await gen('run-sheet-all', <RunSheetPDF
    departments={DEPTS}
    assignmentsByDept={assignByDept}
    fromDate="2026-10-28"
    toDate="2026-10-30"
  />)

  console.log('Done.')
}

main().catch(e => { console.error(e); process.exit(1) })
