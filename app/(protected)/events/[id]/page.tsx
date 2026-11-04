import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import EventDetailClient from '@/components/events/event-detail-client'
import type { Event, EventBilling, ScheduleItem, Assignment, Department, EventNote, EventActivity } from '@/lib/types'

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
    { data: notesData },
    { data: activityData },
    { data: profilesData },
    { data: settingData },
  ] = await Promise.all([
    supabase.from('events').select('*').eq('id', params.id).single(),
    supabase.from('event_billing').select('*').eq('event_id', params.id).maybeSingle(),
    supabase.from('schedule_items').select('*').eq('event_id', params.id).order('item_date').order('start_time'),
    supabase.from('assignments').select('*').eq('event_id', params.id).order('task_date').order('task_time'),
    supabase.from('departments').select('*').eq('active', true).order('sort_order'),
    supabase.from('event_notes').select('*').eq('event_id', params.id).order('sort_order').order('created_at'),
    supabase.from('event_activity').select('*').eq('event_id', params.id).order('created_at', { ascending: false }).limit(30),
    supabase.from('profiles').select('id, full_name'),
    supabase.from('app_settings').select('value').eq('key', 'recent_changes_hours').single(),
  ])

  if (!eventData) notFound()

  let updatedByName: string | null = null
  if (eventData.updated_by) {
    const { data: updater } = await supabase
      .from('profiles').select('full_name').eq('id', eventData.updated_by).single()
    updatedByName = updater?.full_name ?? null
  }

  const profilesMap: Record<string, string | null> = {}
  for (const p of (profilesData ?? [])) {
    profilesMap[p.id] = p.full_name
  }

  const recentHours = parseInt(settingData?.value ?? '48', 10)

  const event = eventData as Event
  const billing = billingData as EventBilling | null
  const scheduleItems = (scheduleData ?? []) as ScheduleItem[]
  const assignments = (assignmentData ?? []) as Assignment[]
  const departments = (departmentData ?? []) as Department[]
  const notes = (notesData ?? []) as EventNote[]
  const activity = (activityData ?? []) as EventActivity[]

  const canEdit = profile.role === 'admin' || profile.role === 'planner'

  return (
    <EventDetailClient
      event={event}
      billing={billing}
      scheduleItems={scheduleItems}
      assignments={assignments}
      departments={departments}
      notes={notes}
      updatedByName={updatedByName}
      canEdit={canEdit}
      profilesMap={profilesMap}
      recentHours={recentHours}
      activity={activity}
    />
  )
}
