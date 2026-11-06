'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { ChargeUnit } from '@/lib/billing'

async function guardPlanner() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile?.active) return null
  if (profile.role !== 'admin' && profile.role !== 'planner') return null
  return { supabase, userId: user.id }
}

export type ChargeFormData = {
  price_item_id: string | null
  category: string
  name: string
  unit: ChargeUnit
  quantity: number | null
  hours: number | null
  people: number | null
  charge_date: string | null
  notes: string | null
  unit_price: number
  list_price: number | null
  additional_per_person: number | null
  included_people: number | null
  service_pct: number
  taxable: boolean
  price_overridden: boolean
  sort_order: number
}

export async function addCharge(eventId: string, data: ChargeFormData): Promise<{ id?: string; error: string | null }> {
  const ctx = await guardPlanner()
  if (!ctx) return { error: 'Unauthorized' }

  const { data: charge, error } = await ctx.supabase
    .from('event_charges')
    .insert({ event_id: eventId, ...data, created_by: ctx.userId, updated_by: ctx.userId })
    .select('id')
    .single()

  if (error) return { error: error.message }
  revalidatePath(`/events/${eventId}`)
  return { id: charge.id, error: null }
}

export async function updateCharge(id: string, eventId: string, data: Partial<ChargeFormData>): Promise<{ error: string | null }> {
  const ctx = await guardPlanner()
  if (!ctx) return { error: 'Unauthorized' }

  const { error } = await ctx.supabase
    .from('event_charges')
    .update({ ...data, updated_by: ctx.userId })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath(`/events/${eventId}`)
  return { error: null }
}

export async function deleteCharge(id: string, eventId: string): Promise<{ error: string | null }> {
  const ctx = await guardPlanner()
  if (!ctx) return { error: 'Unauthorized' }

  const { error } = await ctx.supabase.from('event_charges').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath(`/events/${eventId}`)
  return { error: null }
}

export async function updatePriceLevel(eventId: string, level: 'dmc' | 'regular'): Promise<{ error: string | null }> {
  const ctx = await guardPlanner()
  if (!ctx) return { error: 'Unauthorized' }

  const { error } = await ctx.supabase
    .from('events')
    .update({ price_level: level, updated_by: ctx.userId })
    .eq('id', eventId)

  if (error) return { error: error.message }
  revalidatePath(`/events/${eventId}`)
  return { error: null }
}

export async function bulkUpdatePeople(eventId: string, chargeIds: string[], people: number): Promise<{ error: string | null }> {
  const ctx = await guardPlanner()
  if (!ctx) return { error: 'Unauthorized' }

  const { error } = await ctx.supabase
    .from('event_charges')
    .update({ people, updated_by: ctx.userId })
    .in('id', chargeIds)

  if (error) return { error: error.message }
  revalidatePath(`/events/${eventId}`)
  return { error: null }
}
