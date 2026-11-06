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
  return { supabase, userId: user.id, role: profile.role as 'admin' | 'planner' }
}

async function guardAdmin() {
  const ctx = await guardPlanner()
  if (!ctx || ctx.role !== 'admin') return null
  return ctx
}

export type InventoryItemFormData = {
  name: string
  category: string
  quantity_owned?: number | null
  qty_needs_repair?: number
  qty_retired?: number
  storage_location?: string | null
  notes?: string | null
  price_item_id?: string | null
  sort_order?: number
}

export async function createInventoryItem(
  data: InventoryItemFormData,
): Promise<{ id?: string; error: string | null }> {
  const ctx = await guardPlanner()
  if (!ctx) return { error: 'Unauthorized' }

  const { data: item, error } = await ctx.supabase
    .from('inventory_items')
    .insert({ ...data, created_by: ctx.userId, updated_by: ctx.userId })
    .select('id')
    .single()

  if (error) return { error: error.message }
  revalidatePath('/inventory')
  return { id: item.id, error: null }
}

export async function updateInventoryItem(
  id: string,
  data: Partial<InventoryItemFormData>,
): Promise<{ error: string | null }> {
  const ctx = await guardPlanner()
  if (!ctx) return { error: 'Unauthorized' }

  const { error } = await ctx.supabase
    .from('inventory_items')
    .update({ ...data, updated_by: ctx.userId })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/inventory')
  revalidatePath(`/inventory/${id}`)
  return { error: null }
}

export async function deactivateInventoryItem(id: string): Promise<{ error: string | null }> {
  const ctx = await guardAdmin()
  if (!ctx) return { error: 'Unauthorized — admin only' }

  const { error } = await ctx.supabase
    .from('inventory_items')
    .update({ active: false, updated_by: ctx.userId })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/inventory')
  revalidatePath(`/inventory/${id}`)
  return { error: null }
}

export async function deleteInventoryItem(id: string): Promise<{ error: string | null }> {
  const ctx = await guardAdmin()
  if (!ctx) return { error: 'Unauthorized — admin only' }

  const { error } = await ctx.supabase
    .from('inventory_items')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/inventory')
  return { error: null }
}

export async function recordInventoryCount(
  inventoryItemId: string,
  countedQty: number,
  notes?: string | null,
): Promise<{ error: string | null }> {
  const ctx = await guardPlanner()
  if (!ctx) return { error: 'Unauthorized' }

  const { error } = await ctx.supabase
    .from('inventory_counts')
    .insert({
      inventory_item_id: inventoryItemId,
      counted_qty: countedQty,
      counted_by: ctx.userId,
      notes: notes ?? null,
      created_by: ctx.userId,
    })

  if (error) return { error: error.message }
  revalidatePath('/inventory')
  revalidatePath(`/inventory/${inventoryItemId}`)
  return { error: null }
}
