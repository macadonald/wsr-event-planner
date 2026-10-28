'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

async function guardAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (profile?.role !== 'admin') return null
  return { supabase, userId: user.id }
}

export async function createDepartment(name: string, color: string) {
  const ctx = await guardAdmin()
  if (!ctx) return { error: 'Unauthorized' }

  // Append at the end
  const { data: last } = await ctx.supabase
    .from('departments').select('sort_order').order('sort_order', { ascending: false }).limit(1).single()
  const sortOrder = (last?.sort_order ?? 0) + 1

  const { error } = await ctx.supabase
    .from('departments')
    .insert({ name: name.trim(), color, sort_order: sortOrder, active: true })

  if (error) return { error: error.message }
  revalidatePath('/settings/departments')
  return { error: null }
}

export async function updateDepartment(id: string, data: { name?: string; color?: string; active?: boolean }) {
  const ctx = await guardAdmin()
  if (!ctx) return { error: 'Unauthorized' }

  const { error } = await ctx.supabase
    .from('departments')
    .update({
      ...(data.name !== undefined && { name: data.name.trim() }),
      ...(data.color !== undefined && { color: data.color }),
      ...(data.active !== undefined && { active: data.active }),
    })
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/settings/departments')
  return { error: null }
}

export async function moveDepartment(id: string, direction: 'up' | 'down') {
  const ctx = await guardAdmin()
  if (!ctx) return { error: 'Unauthorized' }

  const { data: all } = await ctx.supabase
    .from('departments').select('id, sort_order').order('sort_order', { ascending: true })
  if (!all) return { error: 'Could not load departments' }

  const idx = all.findIndex((d) => d.id === id)
  if (idx < 0) return { error: 'Not found' }
  const swapIdx = direction === 'up' ? idx - 1 : idx + 1
  if (swapIdx < 0 || swapIdx >= all.length) return { error: null } // already at boundary

  const a = all[idx]
  const b = all[swapIdx]

  await Promise.all([
    ctx.supabase.from('departments').update({ sort_order: b.sort_order }).eq('id', a.id),
    ctx.supabase.from('departments').update({ sort_order: a.sort_order }).eq('id', b.id),
  ])

  revalidatePath('/settings/departments')
  return { error: null }
}

export async function addRecipient(departmentId: string, name: string, email: string) {
  const ctx = await guardAdmin()
  if (!ctx) return { error: 'Unauthorized' }

  const { error } = await ctx.supabase
    .from('department_recipients')
    .insert({ department_id: departmentId, name: name.trim(), email: email.trim() })

  if (error) return { error: error.message }
  revalidatePath('/settings/departments')
  return { error: null }
}

export async function deleteRecipient(id: string) {
  const ctx = await guardAdmin()
  if (!ctx) return { error: 'Unauthorized' }

  const { error } = await ctx.supabase.from('department_recipients').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/settings/departments')
  return { error: null }
}
