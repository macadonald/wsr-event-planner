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

export type NoteFormData = {
  content: string
  note_date: string | null
  print_on_dept_sheets: boolean
}

export async function createNote(
  eventId: string,
  data: NoteFormData,
): Promise<{ error: string | null }> {
  const ctx = await guardPlanner()
  if (!ctx) return { error: 'Unauthorized' }

  const { error } = await ctx.supabase.from('event_notes').insert({
    event_id: eventId,
    content: data.content.trim(),
    note_date: data.note_date || null,
    print_on_dept_sheets: data.print_on_dept_sheets,
    sort_order: 0,
    created_by: ctx.userId,
    updated_by: ctx.userId,
  })

  if (error) return { error: error.message }
  revalidatePath(`/events/${eventId}`)
  return { error: null }
}

export async function updateNote(
  id: string,
  eventId: string,
  data: NoteFormData,
): Promise<{ error: string | null }> {
  const ctx = await guardPlanner()
  if (!ctx) return { error: 'Unauthorized' }

  const { error } = await ctx.supabase
    .from('event_notes')
    .update({
      content: data.content.trim(),
      note_date: data.note_date || null,
      print_on_dept_sheets: data.print_on_dept_sheets,
      updated_by: ctx.userId,
    })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath(`/events/${eventId}`)
  return { error: null }
}

export async function deleteNote(
  id: string,
  eventId: string,
): Promise<{ error: string | null }> {
  const ctx = await guardPlanner()
  if (!ctx) return { error: 'Unauthorized' }

  const { error } = await ctx.supabase.from('event_notes').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath(`/events/${eventId}`)
  return { error: null }
}
