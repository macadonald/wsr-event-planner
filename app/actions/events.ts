'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { shiftDate, getDateOffset } from '@/lib/events'
import type { EventStatus, EventType } from '@/lib/types'

async function guardPlanner() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile?.active) return null
  if (profile.role !== 'admin' && profile.role !== 'planner') return null
  return { supabase, userId: user.id, role: profile.role }
}

export type EventFormData = {
  name: string
  event_type: EventType | null
  start_date: string
  end_date: string
  start_time: string | null
  end_time: string | null
  pax: number | null
  location: string | null
  contact_name: string | null
  contact_phone: string | null
  contact_email: string | null
  onsite_contact: string | null
  description: string | null
  special_notes: string | null
  status: EventStatus
}

export async function createEvent(data: EventFormData): Promise<{ id?: string; error: string | null }> {
  const ctx = await guardPlanner()
  if (!ctx) return { error: 'Unauthorized' }

  const { data: event, error } = await ctx.supabase
    .from('events')
    .insert({ ...data, created_by: ctx.userId, updated_by: ctx.userId })
    .select('id')
    .single()

  if (error) return { error: error.message }
  revalidatePath('/dashboard')
  return { id: event.id, error: null }
}

export async function updateEvent(id: string, data: Partial<EventFormData>): Promise<{ error: string | null }> {
  const ctx = await guardPlanner()
  if (!ctx) return { error: 'Unauthorized' }

  const { error } = await ctx.supabase
    .from('events')
    .update({ ...data, updated_by: ctx.userId })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath(`/events/${id}`)
  revalidatePath('/dashboard')
  return { error: null }
}

export async function deleteEvent(id: string): Promise<{ error: string | null }> {
  const ctx = await guardPlanner()
  if (!ctx) return { error: 'Unauthorized' }

  const { error } = await ctx.supabase.from('events').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/dashboard')
  redirect('/dashboard')
}

export async function setEventStatus(id: string, status: EventStatus): Promise<{ error: string | null }> {
  const ctx = await guardPlanner()
  if (!ctx) return { error: 'Unauthorized' }

  const { error } = await ctx.supabase
    .from('events')
    .update({ status, updated_by: ctx.userId })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath(`/events/${id}`)
  revalidatePath('/dashboard')
  return { error: null }
}

export async function duplicateEvent(
  sourceId: string,
  newStartDate: string,
): Promise<{ id?: string; error: string | null }> {
  const ctx = await guardPlanner()
  if (!ctx) return { error: 'Unauthorized' }

  // Load source event
  const { data: source, error: sourceErr } = await ctx.supabase
    .from('events').select('*').eq('id', sourceId).single()
  if (sourceErr || !source) return { error: sourceErr?.message ?? 'Event not found' }

  const offset = getDateOffset(source.start_date, newStartDate)
  const newEndDate = shiftDate(source.end_date, offset)

  const { data: newEvent, error: insertErr } = await ctx.supabase
    .from('events')
    .insert({
      name: `${source.name} (Copy)`,
      event_type: source.event_type,
      start_date: newStartDate,
      end_date: newEndDate,
      start_time: source.start_time,
      end_time: source.end_time,
      pax: source.pax,
      location: source.location,
      contact_name: source.contact_name,
      contact_phone: source.contact_phone,
      contact_email: source.contact_email,
      onsite_contact: source.onsite_contact,
      description: source.description,
      special_notes: source.special_notes,
      status: 'planning' as EventStatus,
      created_by: ctx.userId,
      updated_by: ctx.userId,
    })
    .select('id')
    .single()

  if (insertErr || !newEvent) return { error: insertErr?.message ?? 'Failed to create event' }

  // Copy schedule items with date shift
  const { data: scheduleItems } = await ctx.supabase
    .from('schedule_items').select('*').eq('event_id', sourceId)
  if (scheduleItems?.length) {
    await ctx.supabase.from('schedule_items').insert(
      scheduleItems.map((item) => ({
        event_id: newEvent.id,
        item_date: shiftDate(item.item_date, offset),
        start_time: item.start_time,
        end_time: item.end_time,
        title: item.title,
        location: item.location,
        notes: item.notes,
        created_by: ctx.userId,
        updated_by: ctx.userId,
      }))
    )
  }

  // Copy assignments with date shift
  const { data: assignments } = await ctx.supabase
    .from('assignments').select('*').eq('event_id', sourceId)
  if (assignments?.length) {
    await ctx.supabase.from('assignments').insert(
      assignments.map((item) => ({
        event_id: newEvent.id,
        department_id: item.department_id,
        task: item.task,
        task_date: shiftDate(item.task_date, offset),
        task_time: item.task_time,
        notes: item.notes,
        completed_at: null,
        completed_by: null,
        created_by: ctx.userId,
        updated_by: ctx.userId,
      }))
    )
  }

  revalidatePath('/dashboard')
  return { id: newEvent.id, error: null }
}
