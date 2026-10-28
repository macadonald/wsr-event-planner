import { createClient } from '@/lib/supabase/server'
import { todayInPhoenix } from '@/lib/time'
import { getMonthWeeks, getWeekDays, type CalendarEvent, type CalendarTask } from '@/lib/calendar'
import CalendarClient from '@/components/calendar/calendar-client'

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: { view?: string; y?: string; m?: string; date?: string }
}) {
  const supabase = createClient()
  const today = todayInPhoenix()
  const todayParts = today.split('-').map(Number)

  const view = searchParams.view === 'week' ? 'week' : 'month'

  // Month-view anchor
  const year  = parseInt(searchParams.y ?? '') || todayParts[0]
  const month = parseInt(searchParams.m ?? '') || todayParts[1]

  // Week-view anchor
  const weekAnchor =
    searchParams.date && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.date)
      ? searchParams.date
      : today

  // Compute fetch window
  let fetchStart: string, fetchEnd: string
  if (view === 'month') {
    const weeks = getMonthWeeks(year, month)
    fetchStart = weeks[0][0]
    fetchEnd   = weeks[weeks.length - 1][6]
  } else {
    const wd = getWeekDays(weekAnchor)
    fetchStart = wd[0]
    fetchEnd   = wd[6]
  }

  // Events overlapping the window
  const { data: eventsRaw } = await supabase
    .from('events')
    .select('id, name, event_type, start_date, end_date, pax, location, status')
    .lte('start_date', fetchEnd)
    .gte('end_date', fetchStart)
    .order('start_date')

  const events: CalendarEvent[] = eventsRaw ?? []

  // Assignments for week view (always fetched; client toggles visibility)
  let tasks: CalendarTask[] = []
  if (view === 'week') {
    const { data: raw } = await supabase
      .from('assignments')
      .select('id, task, task_date, task_time, departments(name, color)')
      .gte('task_date', fetchStart)
      .lte('task_date', fetchEnd)
      .order('task_date')
      .order('task_time', { nullsFirst: true })

    if (raw) {
      tasks = (raw as unknown as Array<{
        id: string
        task: string
        task_date: string
        task_time: string | null
        departments: { name: string; color: string } | null
      }>).map(r => ({
        id: r.id,
        task: r.task,
        task_date: r.task_date,
        task_time: r.task_time,
        dept_name:  r.departments?.name  ?? '',
        dept_color: r.departments?.color ?? '#999',
      }))
    }
  }

  // User role for day-click permission
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user!.id)
    .single()

  // Derive year/month for week view (so view-toggle lands on the right month)
  const displayYear  = view === 'week' ? parseInt(weekAnchor.split('-')[0]) : year
  const displayMonth = view === 'week' ? parseInt(weekAnchor.split('-')[1]) : month

  return (
    <CalendarClient
      view={view}
      year={displayYear}
      month={displayMonth}
      weekAnchor={weekAnchor}
      events={events}
      tasks={tasks}
      role={profile?.role ?? 'viewer'}
      today={today}
    />
  )
}
