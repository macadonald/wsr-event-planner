/**
 * Seed price_items from data/price-list-seed.csv
 * Run: npx tsx scripts/seed-price-list.ts [--force]
 *   --force  clears existing rows before inserting
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

// Load .env.local without dotenv dependency
function loadEnv(p: string) {
  try {
    for (const line of readFileSync(p, 'utf-8').split('\n')) {
      const m = line.match(/^([^#=]+)=(.*)$/)
      if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '')
    }
  } catch { /* rely on existing env */ }
}
loadEnv(join(process.cwd(), '.env.local'))

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey   = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const csvPath = join(process.cwd(), 'data/price-list-seed.csv')
const csv     = readFileSync(csvPath, 'utf-8')
const lines   = csv.trim().split('\n')
const headers = lines[0].split(',').map(h => h.trim())

function n(v: string | undefined): number | null {
  return v && v.trim() !== '' ? parseFloat(v.trim()) : null
}
function i(v: string | undefined): number | null {
  return v && v.trim() !== '' ? parseInt(v.trim(), 10) : null
}
function b(v: string | undefined): boolean {
  return v?.trim().toLowerCase() === 'yes' || v?.trim().toLowerCase() === 'true'
}

function parseRow(line: string) {
  // Simple CSV split — the seed file has no commas inside quoted fields
  const cols = line.split(',')
  const get  = (name: string) => cols[headers.indexOf(name)]?.trim() ?? ''

  return {
    category:                  get('category'),
    name:                      get('name'),
    unit:                      get('unit') as 'per_event' | 'per_person' | 'each' | 'per_hour',
    dmc_price:                 parseFloat(get('dmc_price')),
    regular_price:             n(get('regular_price')),
    included_people:           i(get('included_people')),
    additional_per_person_dmc: n(get('additional_per_person_dmc')),
    additional_per_person_regular: n(get('additional_per_person_regular')),
    max_capacity:              i(get('max_capacity')),
    minimum:                   n(get('minimum')),
    service_pct:               n(get('service_pct')) ?? 0,
    taxable:                   b(get('taxable')),
    notes:                     get('notes') || null,
    active:                    true,
    sort_order:                0, // assigned below per-category
  }
}

const rows = lines.slice(1).filter(l => l.trim()).map(parseRow)

// Assign sort_order per-category (10, 20, 30, …)
const categoryCounters: Record<string, number> = {}
for (const row of rows) {
  categoryCounters[row.category] = (categoryCounters[row.category] ?? 0) + 1
  row.sort_order = categoryCounters[row.category] * 10
}

async function main() {
  const force = process.argv.includes('--force')

  const { count } = await supabase
    .from('price_items')
    .select('*', { count: 'exact', head: true })

  if (count && count > 0 && !force) {
    console.log(`price_items already has ${count} rows. Use --force to clear and re-seed.`)
    process.exit(0)
  }

  if (force && count && count > 0) {
    const { error: delErr } = await supabase
      .from('price_items')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
    if (delErr) { console.error('Clear failed:', delErr.message); process.exit(1) }
    console.log(`Cleared ${count} existing rows.`)
  }

  const { error } = await supabase.from('price_items').insert(rows)
  if (error) { console.error('Seed failed:', error.message); process.exit(1) }
  console.log(`✓ Seeded ${rows.length} price items.`)
}

main()
