'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Role } from '@/lib/types'

async function guardAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (profile?.role !== 'admin') return null
  return user.id
}

export async function inviteUser(email: string, fullName: string, role: Role) {
  const adminId = await guardAdmin()
  if (!adminId) return { error: 'Unauthorized' }

  const adminClient = createAdminClient()

  const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName },
  })
  if (error) return { error: error.message }
  if (!data.user) return { error: 'Invite failed' }

  // handle_new_user trigger already created the profile; update role + name
  const { error: updateError } = await adminClient
    .from('profiles')
    .upsert({ id: data.user.id, email, full_name: fullName, role, active: true })

  if (updateError) return { error: updateError.message }

  revalidatePath('/settings/users')
  return { error: null }
}

export async function updateUserRole(userId: string, role: Role) {
  const adminId = await guardAdmin()
  if (!adminId) return { error: 'Unauthorized' }
  if (userId === adminId) return { error: 'Cannot change your own role' }

  const adminClient = createAdminClient()
  const { error } = await adminClient.from('profiles').update({ role }).eq('id', userId)
  if (error) return { error: error.message }

  revalidatePath('/settings/users')
  return { error: null }
}

export async function setUserActive(userId: string, active: boolean) {
  const adminId = await guardAdmin()
  if (!adminId) return { error: 'Unauthorized' }
  if (userId === adminId) return { error: 'Cannot deactivate yourself' }

  const adminClient = createAdminClient()
  const { error } = await adminClient.from('profiles').update({ active }).eq('id', userId)
  if (error) return { error: error.message }

  revalidatePath('/settings/users')
  return { error: null }
}
