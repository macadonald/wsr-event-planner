// Pure inventory availability helpers — no React, no Supabase.

export type InventoryUsage = {
  inventory_item_id: string
  quantity: number | null
  charge_date: string | null    // 'YYYY-MM-DD' or null
  event_start_date: string      // 'YYYY-MM-DD'
  event_end_date: string        // 'YYYY-MM-DD'
}

export function computeUsable(item: {
  quantity_owned: number | null
  qty_needs_repair: number
  qty_retired: number
}): number | null {
  if (item.quantity_owned === null) return null
  return Math.max(0, item.quantity_owned - item.qty_needs_repair - item.qty_retired)
}

export function computeBookedOnDate(usages: InventoryUsage[], date: string): number {
  return usages.reduce((sum, u) => {
    const qty = u.quantity ?? 0
    if (u.charge_date !== null) {
      return sum + (u.charge_date === date ? qty : 0)
    }
    // null charge_date → reserved for every day of the event
    return sum + (u.event_start_date <= date && date <= u.event_end_date ? qty : 0)
  }, 0)
}

export function computeAvailableOnDate(
  item: { quantity_owned: number | null; qty_needs_repair: number; qty_retired: number },
  usages: InventoryUsage[],
  date: string,
): number | null {
  const usable = computeUsable(item)
  if (usable === null) return null
  return usable - computeBookedOnDate(usages, date)
}

// 90-day stale threshold in milliseconds
export const STALE_COUNT_MS = 90 * 24 * 60 * 60 * 1000

export function isCountStale(countedAt: string): boolean {
  return Date.now() - new Date(countedAt).getTime() > STALE_COUNT_MS
}
