import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import InventoryItemClient, {
  type CountWithName,
  type UpcomingUse,
} from '@/components/inventory/inventory-item-client'
import { todayInPhoenix } from '@/lib/time'
import type { InventoryItem, PriceItem } from '@/lib/types'

export default async function InventoryItemPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, active')
    .eq('id', user.id)
    .single()
  if (!profile?.active) redirect('/login')

  const [
    { data: itemData },
    { data: countsData },
    { data: upcomingData },
    { data: priceItemsData },
  ] = await Promise.all([
    supabase
      .from('inventory_items')
      .select('*')
      .eq('id', params.id)
      .single(),
    supabase
      .from('inventory_counts')
      .select('id, counted_qty, counted_at, notes, profiles(full_name)')
      .eq('inventory_item_id', params.id)
      .order('counted_at', { ascending: false }),
    // Charges that use this item, joined with event details
    supabase
      .from('event_charges')
      .select('id, quantity, charge_date, events(id, name, start_date, end_date)')
      .eq('inventory_item_id', params.id),
    supabase
      .from('price_items')
      .select('*')
      .eq('active', true)
      .order('category')
      .order('name'),
  ])

  if (!itemData) notFound()

  const item = itemData as InventoryItem
  const priceItems = (priceItemsData ?? []) as PriceItem[]
  const today = todayInPhoenix()

  type RawCount   = { id: string; counted_qty: number; counted_at: string; notes: string | null; profiles: { full_name: string | null } | null }
  type RawUse     = { id: string; quantity: number | null; charge_date: string | null; events: { id: string; name: string; start_date: string; end_date: string } | null }

  const counts: CountWithName[] = ((countsData ?? []) as unknown as RawCount[]).map((c) => ({
    id: c.id,
    counted_qty: c.counted_qty,
    counted_at: c.counted_at,
    notes: c.notes,
    counter_name: c.profiles?.full_name ?? null,
  }))

  // Build upcoming use: charges on events that haven't ended yet
  const upcomingUse: UpcomingUse[] = ((upcomingData ?? []) as unknown as RawUse[])
    .filter((c) => c.events && c.events.end_date >= today)
    .map((c) => ({
      id: c.id,
      event_id: c.events!.id,
      event_name: c.events!.name,
      event_start_date: c.events!.start_date,
      event_end_date: c.events!.end_date,
      quantity: c.quantity,
      charge_date: c.charge_date,
    }))
    .sort((a, b) => a.event_start_date.localeCompare(b.event_start_date))

  const canEdit = profile.role === 'admin' || profile.role === 'planner'
  const isAdmin = profile.role === 'admin'

  return (
    <InventoryItemClient
      item={item}
      counts={counts}
      upcomingUse={upcomingUse}
      canEdit={canEdit}
      isAdmin={isAdmin}
      priceItems={priceItems}
    />
  )
}
