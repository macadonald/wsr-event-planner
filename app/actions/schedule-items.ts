'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

async function guardPlanner() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile?.active) return null
  if (profile.role !== 'admin' && profile.role !== 'planner') return null
  return { supabase, userId: user.id }
}

export type ScheduleItemFormData = {
  item_date: string
  start_time: string | null
  end_time: string | null
  title: string
  location: string | null
  notes: string | null
}

export async function createScheduleItem(
  eventId: string,
  data: ScheduleItemFormData,
): Promise<{ error: string | null }> {
  const ctx = await guardPlanner()
  if (!ctx) return { error: 'Unauthorized' }

  const { error } = await ctx.supabase
    .from('schedule_items')
    .insert({ event_id: eventId, ...data, created_by: ctx.userId, updated_by: ctx.userId })

  if (error) return { error: error.message }
  revalidatePath(`/events/${eventId}`)
  return { error: null }
}

export async function updateScheduleItem(
  id: string,
  eventId: string,
  data: Partial<ScheduleItemFormData>,
): Promise<{ error: string | null }> {
  const ctx = await guardPlanner()
  if (!ctx) return { error: 'Unauthorized' }

  const { error } = await ctx.supabase
    .from('schedule_items')
    .update({ ...data, updated_by: ctx.userId })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath(`/events/${eventId}`)
  return { error: null }
}

export async function deleteScheduleItem(id: string, eventId: string): Promise<{ error: string | null }> {
  const ctx = await guardPlanner()
  if (!ctx) return { error: 'Unauthorized' }

  const { error } = await ctx.supabase.from('schedule_items').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath(`/events/${eventId}`)
  return { error: null }
}
