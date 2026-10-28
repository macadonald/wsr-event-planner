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

export type BillingFormData = {
  room_rental: number | null
  billing_due_date: string | null
  billing_method: string | null
  package: string | null
  notes: string | null
}

export async function upsertBilling(eventId: string, data: BillingFormData): Promise<{ error: string | null }> {
  const ctx = await guardPlanner()
  if (!ctx) return { error: 'Unauthorized' }

  const { error } = await ctx.supabase
    .from('event_billing')
    .upsert(
      { event_id: eventId, ...data, created_by: ctx.userId, updated_by: ctx.userId },
      { onConflict: 'event_id' }
    )

  if (error) return { error: error.message }
  revalidatePath(`/events/${eventId}`)
  return { error: null }
}
