import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CreateEventForm from '@/components/events/create-event-form'

export default async function NewEventPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role, active').eq('id', user!.id).single()

  if (!profile?.active || (profile.role !== 'admin' && profile.role !== 'planner')) {
    redirect('/dashboard')
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-brown-700 mb-6">New Event</h1>
      <CreateEventForm />
    </div>
  )
}
