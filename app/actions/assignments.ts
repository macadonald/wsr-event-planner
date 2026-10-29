'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { TimeType } from '@/lib/types'

async function guardPlanner() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile?.active) return null
  if (profile.role !== 'admin' && profile.role !== 'planner') return null
  return { supabase, userId: user.id }
}

export type AssignmentFormData = {
  department_id: string
  task: string
  task_date: string
  task_time: string | null
  time_type: TimeType
  notes: string | null
}

export async function createAssignment(
  eventId: string,
  data: AssignmentFormData,
): Promise<{ error: string | null }> {
  const ctx = await guardPlanner()
  if (!ctx) return { error: 'Unauthorized' }

  const { error } = await ctx.supabase.from('assignments').insert({
    event_id: eventId,
    ...data,
    created_by: ctx.userId,
    updated_by: ctx.userId,
  })

  if (error) return { error: error.message }
  revalidatePath(`/events/${eventId}`)
  return { error: null }
}

// Creates one assignment per date in dates[]. If dates.length > 1, all rows share a repeat_group_id.
export async function createAssignments(
  eventId: string,
  dates: string[],
  data: AssignmentFormData,
): Promise<{ error: string | null }> {
  if (dates.length === 0) return { error: 'No dates provided' }
  if (dates.length === 1) return createAssignment(eventId, { ...data, task_date: dates[0] })

  const ctx = await guardPlanner()
  if (!ctx) return { error: 'Unauthorized' }

  const groupId = crypto.randomUUID()
  const rows = dates.map(d => ({
    event_id: eventId,
    ...data,
    task_date: d,
    repeat_group_id: groupId,
    created_by: ctx.userId,
    updated_by: ctx.userId,
  }))

  const { error } = await ctx.supabase.from('assignments').insert(rows)
  if (error) return { error: error.message }
  revalidatePath(`/events/${eventId}`)
  return { error: null }
}

export async function deleteAssignmentGroup(
  repeatGroupId: string,
  eventId: string,
): Promise<{ error: string | null }> {
  const ctx = await guardPlanner()
  if (!ctx) return { error: 'Unauthorized' }

  const { error } = await ctx.supabase
    .from('assignments')
    .delete()
    .eq('repeat_group_id', repeatGroupId)
  if (error) return { error: error.message }
  revalidatePath(`/events/${eventId}`)
  return { error: null }
}

export async function updateAssignment(
  id: string,
  eventId: string,
  data: Partial<AssignmentFormData>,
): Promise<{ error: string | null }> {
  const ctx = await guardPlanner()
  if (!ctx) return { error: 'Unauthorized' }

  const { error } = await ctx.supabase
    .from('assignments')
    .update({ ...data, updated_by: ctx.userId })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath(`/events/${eventId}`)
  return { error: null }
}

export async function deleteAssignment(
  id: string,
  eventId: string,
): Promise<{ error: string | null }> {
  const ctx = await guardPlanner()
  if (!ctx) return { error: 'Unauthorized' }

  const { error } = await ctx.supabase.from('assignments').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath(`/events/${eventId}`)
  return { error: null }
}
