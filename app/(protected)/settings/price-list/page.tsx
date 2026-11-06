import { createClient } from '@/lib/supabase/server'
import PriceListManager from '@/components/settings/price-list-manager'
import type { PriceItem, BillingSettings } from '@/lib/types'

export default async function PriceListPage() {
  const supabase = createClient()

  const [
    { data: itemsData },
    { data: settingsData },
  ] = await Promise.all([
    supabase.from('price_items').select('*').order('category').order('sort_order').order('name'),
    supabase.from('billing_settings').select('*').limit(1).maybeSingle(),
  ])

  const items    = (itemsData   ?? []) as PriceItem[]
  const settings = settingsData as BillingSettings | null

  const defaultSettings: BillingSettings = settings ?? {
    id: '', tax_pct: 6.1, tax_on_service: false,
    regular_markup_note: null, updated_at: '', updated_by: null,
  }

  return (
    <div>
      <p className="text-sm text-brown-400 mb-6">
        Manage the price list that planners use when building event charges.
        DMC prices are for DMC/group clients; Regular prices are for standard guests.
        Price edits here do not affect charges already added to events.
      </p>
      <PriceListManager items={items} settings={defaultSettings} />
    </div>
  )
}
