export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { renderToBuffer } from '@react-pdf/renderer'
import { createClient } from '@/lib/supabase/server'
import { DepartmentSheetPDF } from '@/lib/pdf/department-sheet'
import type { Assignment, Department, Event, EventNote, ScheduleItem } from '@/lib/types'
import { slugify } from '@/lib/pdf/shared'

export async function GET(
  _req: Request,
  { params }: { params: { id: string; deptId: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('active').eq('id', user.id).single()
  if (!profile?.active) return new Response('Unauthorized', { status: 401 })

  const [
    { data: eventData },
    { data: deptData },
    { data: scheduleData },
    { data: assignmentData },
    { data: notesData },
  ] = await Promise.all([
    supabase.from('events').select('*').eq('id', params.id).single(),
    supabase.from('departments').select('*').eq('id', params.deptId).single(),
    supabase.from('schedule_items').select('*').eq('event_id', params.id).order('item_date').order('start_time'),
    supabase.from('assignments').select('*').eq('event_id', params.id).order('task_date').order('task_time'),
    supabase.from('event_notes').select('*').eq('event_id', params.id).order('sort_order').order('created_at'),
  ])

  if (!eventData || !deptData) return new Response('Not found', { status: 404 })

  let updatedByName: string | null = null
  if (eventData.updated_by) {
    const { data: updater } = await supabase
      .from('profiles').select('full_name').eq('id', eventData.updated_by).single()
    updatedByName = updater?.full_name ?? null
  }

  type PdfArg = Parameters<typeof renderToBuffer>[0]
  const buffer = await renderToBuffer(<DepartmentSheetPDF
    event={eventData as Event}
    department={deptData as Department}
    scheduleItems={(scheduleData ?? []) as ScheduleItem[]}
    assignments={(assignmentData ?? []) as Assignment[]}
    notes={(notesData ?? []) as EventNote[]}
    updatedByName={updatedByName}
  /> as unknown as PdfArg)

  const filename = `${slugify(deptData.name)}-${slugify(eventData.name)}.pdf`
  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${filename}"`,
    },
  })
}
