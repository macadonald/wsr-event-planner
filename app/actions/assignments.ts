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
