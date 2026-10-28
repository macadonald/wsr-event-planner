import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { todayInPhoenix } from '@/lib/time'
import EventsList from '@/components/dashboard/events-list'
import type { Event } from '@/lib/types'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single()

  const today = todayInPhoenix()
  const { data } = await supabase
    .from('events')
    .select('*')
    .order('start_date', { ascending: true })

  const events = (data ?? []) as Event[]
  const upcoming = events.filter(e => e.end_date >= today)
  const past = events.filter(e => e.end_date < today).reverse()

  const canEdit = profile?.role === 'admin' || profile?.role === 'planner'

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-brown-700">Events</h1>
        {canEdit && (
          <Link
            href="/events/new"
            className="bg-brown-500 hover:bg-brown-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            + New Event
          </Link>
        )}
      </div>
      <EventsList upcoming={upcoming} past={past} />
    </div>
  )
}
