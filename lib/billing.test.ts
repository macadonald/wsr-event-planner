/**
 * Unit tests for lib/billing.ts
 * Run: npx tsx lib/billing.test.ts
 */

import { calculateCharge, computeBillSummary, resolvePriceLevel } from './billing'

let pass = 0, fail = 0

function assert(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (ok) {
    console.log(`  ✓ ${label}`)
    pass++
  } else {
    console.error(`  ✗ ${label}\n    expected: ${JSON.stringify(expected)}\n    received: ${JSON.stringify(actual)}`)
    fail++
  }
}

// ── per_person ────────────────────────────────────────────────────────────────
console.log('\nper_person')
{
  const r = calculateCharge(
    { unit: 'per_person', unit_price: 35, additional_per_person: null, included_people: null,
      max_capacity: 149, minimum: null, service_pct: 20, taxable: true,
      quantity: null, hours: null, people: 32 },
    6.1, false
  )
  assert('base_amount = 35×32',       r.base_amount,    1120)
  assert('additional = 0',            r.additional_amount, 0)
  assert('amount = 1120',             r.amount,         1120)
  assert('service = 20%',             r.service_amount, 224)
  assert('tax = 6.1% of amount only', r.tax_amount,     68.32)
  assert('total',                     r.total,          1412.32)
  assert('no warnings',               r.warnings,       [])
}

// ── per_person over capacity ───────────────────────────────────────────────────
console.log('\nper_person over capacity')
{
  const r = calculateCharge(
    { unit: 'per_person', unit_price: 35, additional_per_person: null, included_people: null,
      max_capacity: 149, minimum: null, service_pct: 20, taxable: true,
      quantity: null, hours: null, people: 200 },
    6.1, false
  )
  assert('warns over capacity', r.warnings, ['Exceeds max capacity of 149'])
}

// ── per_event with included_people ────────────────────────────────────────────
console.log('\nper_event with included_people')
{
  const r = calculateCharge(
    { unit: 'per_event', unit_price: 500, additional_per_person: 10, included_people: 75,
      max_capacity: null, minimum: null, service_pct: 0, taxable: true,
      quantity: null, hours: null, people: 90 },
    6.1, false
  )
  assert('base = 500',                r.base_amount,       500)
  assert('additional = 15×10 = 150',  r.additional_amount, 150)
  assert('amount = 650',              r.amount,            650)
  assert('service = 0',               r.service_amount,    0)
  assert('tax = 6.1% of 650',         r.tax_amount,        39.65)
  assert('total = 689.65',            r.total,             689.65)
}

// ── per_event within included_people (no surcharge) ───────────────────────────
console.log('\nper_event within included guests')
{
  const r = calculateCharge(
    { unit: 'per_event', unit_price: 500, additional_per_person: 10, included_people: 75,
      max_capacity: null, minimum: null, service_pct: 0, taxable: true,
      quantity: null, hours: null, people: 50 },
    6.1, false
  )
  assert('no additional charge', r.additional_amount, 0)
  assert('amount = 500',         r.amount,            500)
}

// ── each ──────────────────────────────────────────────────────────────────────
console.log('\neach')
{
  const r = calculateCharge(
    { unit: 'each', unit_price: 20, additional_per_person: null, included_people: null,
      max_capacity: 11, minimum: null, service_pct: 0, taxable: true,
      quantity: 8, hours: null, people: null },
    6.1, false
  )
  assert('base = 20×8 = 160',   r.base_amount, 160)
  assert('no warnings',          r.warnings,    [])
}

// ── per_hour below minimum ────────────────────────────────────────────────────
console.log('\nper_hour below minimum')
{
  const r = calculateCharge(
    { unit: 'per_hour', unit_price: 300, additional_per_person: null, included_people: null,
      max_capacity: null, minimum: 2, service_pct: 0, taxable: false,
      quantity: null, hours: 1, people: null },
    6.1, false
  )
  assert('base = 300×1',          r.base_amount, 300)
  assert('warns below minimum',   r.warnings,    ['Below 2-hour minimum'])
  assert('not taxable → tax = 0', r.tax_amount,  0)
}

// ── tax_on_service ────────────────────────────────────────────────────────────
console.log('\ntax_on_service = true')
{
  const r = calculateCharge(
    { unit: 'each', unit_price: 100, additional_per_person: null, included_people: null,
      max_capacity: null, minimum: null, service_pct: 20, taxable: true,
      quantity: 1, hours: null, people: null },
    6.1, true  // tax_on_service
  )
  assert('amount = 100',          r.amount,        100)
  assert('service = 20',          r.service_amount, 20)
  assert('tax on amount = 6.10',  r.tax_amount, Math.round((100 * 0.061 + 20 * 0.061) * 100) / 100)
}

// ── resolvePriceLevel ─────────────────────────────────────────────────────────
console.log('\nresolvePriceLevel')
{
  assert('dmc level',                       resolvePriceLevel('dmc', 35, 50), 35)
  assert('regular level',                   resolvePriceLevel('regular', 35, 50), 50)
  assert('regular null falls back to dmc',  resolvePriceLevel('regular', 35, null), 35)
}

// ── computeBillSummary ────────────────────────────────────────────────────────
console.log('\ncomputeBillSummary')
{
  const lines = [
    { id: '1', category: 'Bar', name: 'Beer', amount: 1120, service_amount: 224, tax_amount: 68.32, total: 1412.32, warnings: [] },
    { id: '2', category: 'Bar', name: 'Wine', amount: 320,  service_amount: 70.4, tax_amount: 19.52, total: 409.92, warnings: [] },
    { id: '3', category: 'Meals', name: 'Lunch', amount: 400, service_amount: 80, tax_amount: 24.4, total: 504.4, warnings: [] },
  ]
  const s = computeBillSummary(lines)
  assert('Bar subtotal',    s.categorySubtotals['Bar'],   1440)
  assert('Meals subtotal',  s.categorySubtotals['Meals'], 400)
  assert('subtotal',        s.subtotal,   1840)
  assert('service',         s.service,    374.4)
  assert('tax',             s.tax,        112.24)
  assert('grandTotal',      s.grandTotal, round2(1840 + 374.4 + 112.24))
}

function round2(n: number) { return Math.round(n * 100) / 100 }

console.log(`\n${'─'.repeat(40)}`)
console.log(`${pass + fail} tests: ${pass} passed, ${fail} failed`)
if (fail > 0) process.exit(1)
