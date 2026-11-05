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

  const [
    { data },
    { data: profilesData },
    { data: settingData },
    { data: assignmentData },
  ] = await Promise.all([
    supabase.from('events').select('*').order('start_date', { ascending: true }),
    supabase.from('profiles').select('id, full_name'),
    supabase.from('app_settings').select('value').eq('key', 'recent_changes_hours').single(),
    supabase.from('assignments').select('event_id, completed_at'),
  ])

  const events = (data ?? []) as Event[]
  const current = events.filter(e => e.start_date <= today && e.end_date >= today)
  const upcoming = events.filter(e => e.start_date > today)
  const completed = events.filter(e => e.end_date < today).reverse()

  const profilesMap: Record<string, string | null> = {}
  for (const p of (profilesData ?? [])) {
    profilesMap[p.id] = p.full_name
  }

  const completionCounts: Record<string, { total: number; done: number }> = {}
  for (const a of (assignmentData ?? [])) {
    if (!completionCounts[a.event_id]) completionCounts[a.event_id] = { total: 0, done: 0 }
    completionCounts[a.event_id].total++
    if (a.completed_at) completionCounts[a.event_id].done++
  }

  const recentHours = parseInt(settingData?.value ?? '48', 10)
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
      <EventsList
        current={current}
        upcoming={upcoming}
        completed={completed}
        profilesMap={profilesMap}
        recentHours={recentHours}
        completionCounts={completionCounts}
      />
    </div>
  )
}
