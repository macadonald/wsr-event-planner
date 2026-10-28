import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import EventDetailClient from '@/components/events/event-detail-client'
import type { Event, EventBilling, ScheduleItem } from '@/lib/types'

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

  const [{ data: eventData }, { data: billingData }, { data: scheduleData }] = await Promise.all([
    supabase.from('events').select('*').eq('id', params.id).single(),
    supabase.from('event_billing').select('*').eq('event_id', params.id).maybeSingle(),
    supabase.from('schedule_items').select('*').eq('event_id', params.id).order('item_date').order('start_time'),
  ])

  if (!eventData) notFound()

  // Load updater name
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

  const canEdit = profile.role === 'admin' || profile.role === 'planner'

  return (
    <EventDetailClient
      event={event}
      billing={billing}
      scheduleItems={scheduleItems}
      updatedByName={updatedByName}
      canEdit={canEdit}
    />
  )
}
