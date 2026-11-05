import { createClient } from '@/lib/supabase/server'
import { todayInPhoenix } from '@/lib/time'
import { shiftDate } from '@/lib/events'
import ChecklistView from '@/components/checklist/checklist-view'
import type { Department } from '@/lib/types'

export default async function ChecklistPage() {
  const supabase = createClient()

  const today = todayInPhoenix()
  const from = shiftDate(today, -14)
  const to = shiftDate(today, 60)

  const [
    { data: assignmentsData },
    { data: deptsData },
    { data: profilesData },
  ] = await Promise.all([
    supabase
      .from('assignments')
      .select('*, departments(id, name, color), events(id, name, location, start_date, end_date)')
      .gte('task_date', from)
      .lte('task_date', to)
      .order('task_date')
      .order('task_time', { nullsFirst: true }),
    supabase.from('departments').select('*').eq('active', true).order('sort_order'),
    supabase.from('profiles').select('id, full_name'),
  ])

  const profilesMap: Record<string, string | null> = {}
  for (const p of (profilesData ?? [])) {
    profilesMap[p.id] = p.full_name
  }

  return (
    <ChecklistView
      assignments={(assignmentsData ?? []) as unknown as ChecklistRow[]}
      departments={(deptsData ?? []) as Department[]}
      profilesMap={profilesMap}
      today={today}
    />
  )
}

// exported so ChecklistView can import the type
export type ChecklistRow = {
  id: string
  event_id: string
  department_id: string
  task: string
  task_date: string
  task_time: string | null
  time_type: 'at' | 'by'
  notes: string | null
  repeat_group_id: string | null
  completed_at: string | null
  completed_by: string | null
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
  departments: { id: string; name: string; color: string } | null
  events: { id: string; name: string; location: string | null; start_date: string; end_date: string } | null
}
