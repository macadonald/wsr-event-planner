import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import InventoryList, { type LatestCount } from '@/components/inventory/inventory-list'
import { todayInPhoenix } from '@/lib/time'
import { computeAvailableOnDate, type InventoryUsage } from '@/lib/inventory'
import type { InventoryItem, PriceItem } from '@/lib/types'

export default async function InventoryPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, active')
    .eq('id', user.id)
    .single()
  if (!profile?.active) redirect('/login')

  const today = todayInPhoenix()

  const [
    { data: itemsData },
    { data: chargesData },
    { data: countsData },
    { data: priceItemsData },
  ] = await Promise.all([
    supabase
      .from('inventory_items')
      .select('*')
      .order('category')
      .order('sort_order')
      .order('name'),
    // All charges that reference an inventory item (across all events)
    supabase
      .from('event_charges')
      .select('inventory_item_id, quantity, charge_date, events(start_date, end_date)')
      .not('inventory_item_id', 'is', null),
    // All counts, most recent first — we'll pick the latest per item in TypeScript
    supabase
      .from('inventory_counts')
      .select('inventory_item_id, counted_qty, counted_at, profiles(full_name)')
      .order('counted_at', { ascending: false }),
    supabase
      .from('price_items')
      .select('*')
      .eq('active', true)
      .order('category')
      .order('name'),
  ])

  const items = (itemsData ?? []) as InventoryItem[]
  const priceItems = (priceItemsData ?? []) as PriceItem[]

  type RawCharge = { inventory_item_id: string; quantity: number | null; charge_date: string | null; events: { start_date: string; end_date: string } | null }
  type RawCount  = { inventory_item_id: string; counted_qty: number; counted_at: string; profiles: { full_name: string | null } | null }

  // Build usage list for availability computation
  const usages: InventoryUsage[] = []
  for (const c of (chargesData ?? []) as unknown as RawCharge[]) {
    if (c.inventory_item_id && c.events) {
      usages.push({
        inventory_item_id: c.inventory_item_id,
        quantity: c.quantity,
        charge_date: c.charge_date,
        event_start_date: c.events.start_date,
        event_end_date: c.events.end_date,
      })
    }
  }

  // Available today per item
  const availableToday: Record<string, number | null> = {}
  for (const item of items) {
    const itemUsages = usages.filter(u => u.inventory_item_id === item.id)
    availableToday[item.id] = computeAvailableOnDate(item, itemUsages, today)
  }

  // Latest count per item (counts are already sorted DESC so first match wins)
  const latestCountByItem: Record<string, LatestCount> = {}
  for (const c of (countsData ?? []) as unknown as RawCount[]) {
    if (!latestCountByItem[c.inventory_item_id]) {
      latestCountByItem[c.inventory_item_id] = {
        counted_qty: c.counted_qty,
        counted_at:  c.counted_at,
        counter_name: c.profiles?.full_name ?? null,
      }
    }
  }

  const canEdit = profile.role === 'admin' || profile.role === 'planner'

  return (
    <InventoryList
      items={items}
      availableToday={availableToday}
      latestCountByItem={latestCountByItem}
      canEdit={canEdit}
      priceItems={priceItems}
    />
  )
}
