export type ChargeUnit = 'per_event' | 'per_person' | 'each' | 'per_hour'
export type PriceLevel = 'dmc' | 'regular'

export interface ChargeCalculationInput {
  unit: ChargeUnit
  unit_price: number
  additional_per_person: number | null
  included_people: number | null
  max_capacity: number | null
  minimum: number | null       // per_hour minimum hours
  service_pct: number
  taxable: boolean
  quantity: number | null      // for 'each'
  hours: number | null         // for 'per_hour'
  people: number | null        // for 'per_event' and 'per_person'
}

export interface ChargeCalculationResult {
  base_amount: number       // price × effective qty, before additional
  additional_amount: number // extra-people surcharge
  amount: number            // base + additional (the serviceable/taxable amount)
  service_amount: number
  tax_amount: number
  total: number
  warnings: string[]
}

export function calculateCharge(
  input: ChargeCalculationInput,
  tax_pct: number,
  tax_on_service: boolean,
): ChargeCalculationResult {
  const {
    unit, unit_price, additional_per_person, included_people,
    max_capacity, minimum, service_pct, taxable,
    quantity, hours, people,
  } = input

  const warnings: string[] = []
  let base_amount = 0
  let additional_amount = 0

  if (unit === 'per_event') {
    base_amount = unit_price
    if (additional_per_person != null && included_people != null && people != null && people > included_people) {
      additional_amount = round2((people - included_people) * additional_per_person)
    }
    if (max_capacity != null && people != null && people > max_capacity) {
      warnings.push(`Exceeds max capacity of ${max_capacity}`)
    }
  } else if (unit === 'per_person') {
    const qty = people ?? 1
    base_amount = round2(unit_price * qty)
    if (max_capacity != null && qty > max_capacity) {
      warnings.push(`Exceeds max capacity of ${max_capacity}`)
    }
  } else if (unit === 'each') {
    const qty = quantity ?? 1
    base_amount = round2(unit_price * qty)
  } else if (unit === 'per_hour') {
    const h = hours ?? 1
    base_amount = round2(unit_price * h)
    if (minimum != null && h < minimum) {
      warnings.push(`Below ${minimum}-hour minimum`)
    }
  }

  const amount        = round2(base_amount + additional_amount)
  const service_amount = round2(amount * (service_pct / 100))

  let tax_amount = 0
  if (taxable) {
    tax_amount = round2(amount * (tax_pct / 100))
    if (tax_on_service && service_pct > 0) {
      tax_amount = round2(tax_amount + round2(service_amount * (tax_pct / 100)))
    }
  }

  const total = round2(amount + service_amount + tax_amount)

  return { base_amount, additional_amount, amount, service_amount, tax_amount, total, warnings }
}

export interface BillLine {
  id: string
  category: string
  name: string
  amount: number
  service_amount: number
  tax_amount: number
  total: number
  warnings: string[]
}

export interface BillSummary {
  categorySubtotals: Record<string, number>
  subtotal: number
  service: number
  tax: number
  grandTotal: number
}

export function computeBillSummary(lines: BillLine[]): BillSummary {
  const categorySubtotals: Record<string, number> = {}
  let subtotal = 0, service = 0, tax = 0

  for (const line of lines) {
    categorySubtotals[line.category] = round2((categorySubtotals[line.category] ?? 0) + line.amount)
    subtotal += line.amount
    service  += line.service_amount
    tax      += line.tax_amount
  }

  return {
    categorySubtotals,
    subtotal:   round2(subtotal),
    service:    round2(service),
    tax:        round2(tax),
    grandTotal: round2(subtotal + service + tax),
  }
}

export function resolvePriceLevel(
  level: PriceLevel,
  dmc_price: number,
  regular_price: number | null,
): number {
  if (level === 'dmc') return dmc_price
  return regular_price ?? dmc_price
}

export function resolveAdditionalPerPerson(
  level: PriceLevel,
  dmc: number | null,
  regular: number | null,
): number | null {
  if (level === 'dmc') return dmc
  return regular ?? dmc
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export function formatMoney(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function formatUnitLabel(unit: ChargeUnit, compact = false): string {
  if (compact) {
    return unit === 'per_event' ? '/event'
         : unit === 'per_person' ? '/pp'
         : unit === 'each' ? '/ea'
         : '/hr'
  }
  return unit === 'per_event' ? 'per event'
       : unit === 'per_person' ? 'per person'
       : unit === 'each' ? 'each'
       : 'per hour'
}
