'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function getRecentChangesHours(): Promise<number> {
  const supabase = createClient()
  const { data } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'recent_changes_hours')
    .single()
  return parseInt(data?.value ?? '48', 10)
}

export async function setRecentChangesHours(hours: number): Promise<{ error: string | null }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }
  const { data: profile } = await supabase.from('profiles').select('role, active').eq('id', user.id).single()
  if (!profile?.active || profile.role !== 'admin') return { error: 'Unauthorized' }

  const { error } = await supabase
    .from('app_settings')
    .update({ value: String(hours), updated_by: user.id, updated_at: new Date().toISOString() })
    .eq('key', 'recent_changes_hours')

  if (error) return { error: error.message }
  revalidatePath('/settings/general')
  return { error: null }
}
