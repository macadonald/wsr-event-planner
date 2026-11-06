'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { ChargeUnit } from '@/lib/billing'

async function guardAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile?.active || profile.role !== 'admin') return null
  return { supabase, userId: user.id }
}

export type PriceItemFormData = {
  category: string
  name: string
  unit: ChargeUnit
  dmc_price: number
  regular_price: number | null
  included_people: number | null
  additional_per_person_dmc: number | null
  additional_per_person_regular: number | null
  max_capacity: number | null
  minimum: number | null
  service_pct: number
  taxable: boolean
  notes: string | null
  active: boolean
  sort_order: number
}

export async function createPriceItem(data: PriceItemFormData): Promise<{ id?: string; error: string | null }> {
  const ctx = await guardAdmin()
  if (!ctx) return { error: 'Unauthorized' }

  const { data: item, error } = await ctx.supabase
    .from('price_items')
    .insert(data)
    .select('id')
    .single()

  if (error) return { error: error.message }
  revalidatePath('/settings/price-list')
  return { id: item.id, error: null }
}

export async function updatePriceItem(id: string, data: Partial<PriceItemFormData>): Promise<{ error: string | null }> {
  const ctx = await guardAdmin()
  if (!ctx) return { error: 'Unauthorized' }

  const { error } = await ctx.supabase.from('price_items').update(data).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/settings/price-list')
  return { error: null }
}

export async function importPriceItems(items: Omit<PriceItemFormData, 'sort_order'>[]): Promise<{ count?: number; error: string | null }> {
  const ctx = await guardAdmin()
  if (!ctx) return { error: 'Unauthorized' }

  // Assign sort_order per category
  const categoryCounters: Record<string, number> = {}
  const withSort = items.map(item => {
    categoryCounters[item.category] = (categoryCounters[item.category] ?? 0) + 1
    return { ...item, sort_order: categoryCounters[item.category] * 10 }
  })

  const { error } = await ctx.supabase.from('price_items').insert(withSort)
  if (error) return { error: error.message }
  revalidatePath('/settings/price-list')
  return { count: withSort.length, error: null }
}

export async function upsertBillingSettings(data: {
  tax_pct: number
  tax_on_service: boolean
  regular_markup_note: string | null
}): Promise<{ error: string | null }> {
  const ctx = await guardAdmin()
  if (!ctx) return { error: 'Unauthorized' }

  const { data: existing } = await ctx.supabase
    .from('billing_settings')
    .select('id')
    .limit(1)
    .maybeSingle()

  if (existing) {
    const { error } = await ctx.supabase
      .from('billing_settings')
      .update({ ...data, updated_by: ctx.userId, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
    if (error) return { error: error.message }
  } else {
    const { error } = await ctx.supabase
      .from('billing_settings')
      .insert({ ...data, updated_by: ctx.userId })
    if (error) return { error: error.message }
  }

  revalidatePath('/settings/price-list')
  revalidatePath('/events', 'layout')  // charges tab needs updated settings
  return { error: null }
}
