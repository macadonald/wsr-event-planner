import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import EventDetailClient from '@/components/events/event-detail-client'
import type { Event, EventBilling, ScheduleItem, Assignment, Department } from '@/lib/types'

export default async function EventPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name, active')
    .eq('id', user.id)
    .single()
  if (!profile?.active) redirect('/login')

  const [
    { data: eventData },
    { data: billingData },
    { data: scheduleData },
    { data: assignmentData },
    { data: departmentData },
  ] = await Promise.all([
    supabase.from('events').select('*').eq('id', params.id).single(),
    supabase.from('event_billing').select('*').eq('event_id', params.id).maybeSingle(),
    supabase.from('schedule_items').select('*').eq('event_id', params.id).order('item_date').order('start_time'),
    supabase.from('assignments').select('*').eq('event_id', params.id).order('task_date').order('task_time'),
    supabase.from('departments').select('*').eq('active', true).order('sort_order'),
  ])

  if (!eventData) notFound()

  let updatedByName: string | null = null
  if (eventData.updated_by) {
    const { data: updater } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', eventData.updated_by)
      .single()
    updatedByName = updater?.full_name ?? null
  }

  const event = eventData as Event
  const billing = billingData as EventBilling | null
  const scheduleItems = (scheduleData ?? []) as ScheduleItem[]
  const assignments = (assignmentData ?? []) as Assignment[]
  const departments = (departmentData ?? []) as Department[]

  const canEdit = profile.role === 'admin' || profile.role === 'planner'

  return (
    <EventDetailClient
      event={event}
      billing={billing}
      scheduleItems={scheduleItems}
      assignments={assignments}
      departments={departments}
      updatedByName={updatedByName}
      canEdit={canEdit}
    />
  )
}
