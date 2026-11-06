import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import EventDetailClient from '@/components/events/event-detail-client'
import { computeUsable, computeBookedOnDate, type InventoryUsage } from '@/lib/inventory'
import type { Event, EventBilling, ScheduleItem, Assignment, Department, EventNote, EventActivity, EventCharge, PriceItem, BillingSettings } from '@/lib/types'

export default async function EventPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name, active')
    .eq('id', user.id)
    .single()
  if (!profile?.active) redirect('/login')

  const [
    { data: eventData },
    { data: billingData },
    { data: scheduleData },
    { data: assignmentData },
    { data: departmentData },
    { data: notesData },
    { data: activityData },
    { data: profilesData },
    { data: settingData },
    { data: chargesData },
    { data: priceItemsData },
    { data: billingSettingsData },
  ] = await Promise.all([
    supabase.from('events').select('*').eq('id', params.id).single(),
    supabase.from('event_billing').select('*').eq('event_id', params.id).maybeSingle(),
    supabase.from('schedule_items').select('*').eq('event_id', params.id).order('item_date').order('start_time'),
    supabase.from('assignments').select('*').eq('event_id', params.id).order('task_date').order('task_time'),
    supabase.from('departments').select('*').eq('active', true).order('sort_order'),
    supabase.from('event_notes').select('*').eq('event_id', params.id).order('sort_order').order('created_at'),
    supabase.from('event_activity').select('*').eq('event_id', params.id).order('created_at', { ascending: false }).limit(30),
    supabase.from('profiles').select('id, full_name'),
    supabase.from('app_settings').select('value').eq('key', 'recent_changes_hours').single(),
    // Charges + price list only fetched for admin/planner — viewer RLS returns empty
    supabase.from('event_charges').select('*').eq('event_id', params.id).order('category').order('sort_order'),
    supabase.from('price_items').select('*').order('category').order('sort_order').order('name'),
    supabase.from('billing_settings').select('*').limit(1).maybeSingle(),
  ])

  if (!eventData) notFound()

  let updatedByName: string | null = null
  if (eventData.updated_by) {
    const { data: updater } = await supabase
      .from('profiles').select('full_name').eq('id', eventData.updated_by).single()
    updatedByName = updater?.full_name ?? null
  }

  const profilesMap: Record<string, string | null> = {}
  for (const p of (profilesData ?? [])) {
    profilesMap[p.id] = p.full_name
  }

  const recentHours = parseInt(settingData?.value ?? '48', 10)

  const event = eventData as Event
  const billing = billingData as EventBilling | null
  const scheduleItems = (scheduleData ?? []) as ScheduleItem[]
  const assignments = (assignmentData ?? []) as Assignment[]
  const departments = (departmentData ?? []) as Department[]
  const notes = (notesData ?? []) as EventNote[]
  const activity = (activityData ?? []) as EventActivity[]
  const charges = (chargesData ?? []) as EventCharge[]
  const priceItems = (priceItemsData ?? []) as PriceItem[]
  const billingSettings = billingSettingsData as BillingSettings | null

  const defaultBillingSettings: BillingSettings = billingSettings ?? {
    id: '', tax_pct: 6.1, tax_on_service: false,
    regular_markup_note: null, updated_at: '', updated_by: null,
  }

  const canEdit = profile.role === 'admin' || profile.role === 'planner'

  // ── Inventory availability for charge lines ──────────────────────────────────
  const inventoryItemIds = Array.from(new Set(
    charges.filter(c => c.inventory_item_id).map(c => c.inventory_item_id!)
  ))

  const inventoryAvailability: Record<string, { usable: number | null; available: number | null }> = {}

  if (inventoryItemIds.length > 0) {
    const [{ data: invItems }, { data: allInvCharges }] = await Promise.all([
      supabase
        .from('inventory_items')
        .select('id, quantity_owned, qty_needs_repair, qty_retired')
        .in('id', inventoryItemIds),
      supabase
        .from('event_charges')
        .select('inventory_item_id, quantity, charge_date, events(start_date, end_date)')
        .in('inventory_item_id', inventoryItemIds),
    ])

    if (invItems && allInvCharges) {
      type RawCharge = { inventory_item_id: string; quantity: number | null; charge_date: string | null; events: { start_date: string; end_date: string } | null }
      const usages: InventoryUsage[] = (allInvCharges as unknown as RawCharge[])
        .filter(c => c.events)
        .map(c => ({
          inventory_item_id: c.inventory_item_id,
          quantity: c.quantity,
          charge_date: c.charge_date,
          event_start_date: c.events!.start_date,
          event_end_date: c.events!.end_date,
        }))

      for (const charge of charges) {
        if (!charge.inventory_item_id) continue
        const date = charge.charge_date ?? event.start_date
        const key = `${charge.inventory_item_id}:${date}`
        if (inventoryAvailability[key] !== undefined) continue
        const item = invItems.find(i => i.id === charge.inventory_item_id)
        if (!item) continue
        const itemUsages = usages.filter(u => u.inventory_item_id === charge.inventory_item_id)
        const usable = computeUsable(item)
        inventoryAvailability[key] = {
          usable,
          available: usable !== null ? usable - computeBookedOnDate(itemUsages, date) : null,
        }
      }
    }
  }

  return (
    <EventDetailClient
      event={event}
      billing={billing}
      scheduleItems={scheduleItems}
      assignments={assignments}
      departments={departments}
      notes={notes}
      updatedByName={updatedByName}
      canEdit={canEdit}
      profilesMap={profilesMap}
      recentHours={recentHours}
      activity={activity}
      charges={charges}
      priceItems={priceItems}
      billingSettings={defaultBillingSettings}
      inventoryAvailability={inventoryAvailability}
    />
  )
}
