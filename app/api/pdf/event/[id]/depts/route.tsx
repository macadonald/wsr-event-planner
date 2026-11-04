export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { renderToBuffer } from '@react-pdf/renderer'
import { createClient } from '@/lib/supabase/server'
import { MultiDeptSheetPDF } from '@/lib/pdf/multi-dept-sheet'
import { RanchLedgerMultiDeptSheetPDF } from '@/lib/pdf/ranch-ledger-dept'
import type { Assignment, Department, Event, EventNote, ScheduleItem } from '@/lib/types'
import { sortDeptsByPdfOrder, slugify } from '@/lib/pdf/shared'

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('active').eq('id', user.id).single()
  if (!profile?.active) return new Response('Unauthorized', { status: 401 })

  const { searchParams } = new URL(req.url)
  const deptsParam = searchParams.get('depts') ?? ''
  const layout = (searchParams.get('layout') ?? 'paged') as 'paged' | 'combined'
  const style = searchParams.get('style') === 'classic' ? 'classic' : 'ledger'

  const selectedIds = deptsParam ? deptsParam.split(',').filter(Boolean) : []

  const [
    { data: eventData },
    { data: scheduleData },
    { data: assignmentData },
    { data: allDeptData },
    { data: notesData },
    { data: settingData },
  ] = await Promise.all([
    supabase.from('events').select('*').eq('id', params.id).single(),
    supabase.from('schedule_items').select('*').eq('event_id', params.id).order('item_date').order('start_time'),
    supabase.from('assignments').select('*').eq('event_id', params.id).order('task_date').order('task_time'),
    supabase.from('departments').select('*').order('sort_order'),
    supabase.from('event_notes').select('*').eq('event_id', params.id).order('sort_order').order('created_at'),
    supabase.from('app_settings').select('value').eq('key', 'recent_changes_hours').single(),
  ])

  if (!eventData) return new Response('Not found', { status: 404 })

  let updatedByName: string | null = null
  if (eventData.updated_by) {
    const { data: updater } = await supabase
      .from('profiles').select('full_name').eq('id', eventData.updated_by).single()
    updatedByName = updater?.full_name ?? null
  }

  const allDepts = sortDeptsByPdfOrder((allDeptData ?? []) as Department[])
  const departments = selectedIds.length > 0
    ? allDepts.filter(d => selectedIds.includes(d.id))
    : allDepts.filter(d => (assignmentData ?? []).some((a: Assignment) => a.department_id === d.id))

  const recentHours = parseInt((settingData as { value: string } | null)?.value ?? '48', 10)

  const sharedProps = {
    event: eventData as Event,
    departments,
    assignments: (assignmentData ?? []) as Assignment[],
    scheduleItems: (scheduleData ?? []) as ScheduleItem[],
    notes: (notesData ?? []) as EventNote[],
    updatedByName,
    layout,
    recentHours,
  }

  type PdfArg = Parameters<typeof renderToBuffer>[0]
  const element = style === 'classic'
    ? <MultiDeptSheetPDF {...sharedProps} />
    : <RanchLedgerMultiDeptSheetPDF {...sharedProps} />

  const buffer = await renderToBuffer(element as unknown as PdfArg)

  const filename = `dept-sheets-${slugify(eventData.name)}.pdf`
  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${filename}"`,
    },
  })
}
