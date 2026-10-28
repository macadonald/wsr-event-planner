export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { renderToBuffer } from '@react-pdf/renderer'
import { createClient } from '@/lib/supabase/server'
import { FullEventPlanPDF } from '@/lib/pdf/full-event-plan'
import type { Assignment, Department, Event, EventBilling, ScheduleItem } from '@/lib/types'
import { slugify } from '@/lib/pdf/shared'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name, active')
    .eq('id', user.id)
    .single()
  if (!profile?.active) return new Response('Unauthorized', { status: 401 })

  const canSeeBilling = profile.role === 'admin' || profile.role === 'planner'

  const [
    { data: eventData },
    { data: billingData },
    { data: scheduleData },
    { data: assignmentData },
    { data: departmentData },
  ] = await Promise.all([
    supabase.from('events').select('*').eq('id', params.id).single(),
    canSeeBilling
      ? supabase.from('event_billing').select('*').eq('event_id', params.id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from('schedule_items').select('*').eq('event_id', params.id).order('item_date').order('start_time'),
    supabase.from('assignments').select('*').eq('event_id', params.id).order('task_date').order('task_time'),
    supabase.from('departments').select('*').order('sort_order'),
  ])

  if (!eventData) return new Response('Not found', { status: 404 })

  let updatedByName: string | null = null
  if (eventData.updated_by) {
    const { data: updater } = await supabase
      .from('profiles').select('full_name').eq('id', eventData.updated_by).single()
    updatedByName = updater?.full_name ?? null
  }

  type PdfArg = Parameters<typeof renderToBuffer>[0]
  const buffer = await renderToBuffer(<FullEventPlanPDF
    event={eventData as Event}
    billing={billingData as EventBilling | null}
    showBilling={canSeeBilling}
    scheduleItems={(scheduleData ?? []) as ScheduleItem[]}
    assignments={(assignmentData ?? []) as Assignment[]}
    departments={(departmentData ?? []) as Department[]}
    updatedByName={updatedByName}
  /> as unknown as PdfArg)

  const filename = `event-plan-${slugify(eventData.name)}.pdf`
  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${filename}"`,
    },
  })
}
