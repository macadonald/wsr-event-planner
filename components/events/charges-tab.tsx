'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { Event, EventCharge, PriceItem, BillingSettings } from '@/lib/types'
import {
  calculateCharge, computeBillSummary, resolvePriceLevel, resolveAdditionalPerPerson,
  formatMoney, formatUnitLabel, type ChargeUnit,
} from '@/lib/billing'
import { addCharge, updateCharge, deleteCharge, updatePriceLevel, bulkUpdatePeople } from '@/app/actions/charges'
import { formatDate, formatDateShortWithDay } from '@/lib/time'

// ── BillSummary ───────────────────────────────────────────────────────────────

function BillSummaryCard({
  charges,
  taxSettings,
}: {
  charges: EventCharge[]
  taxSettings: BillingSettings
}) {
  const lines = charges.map(c => {
    const r = calculateCharge(
      { unit: c.unit, unit_price: c.unit_price, additional_per_person: c.additional_per_person,
        included_people: c.included_people, max_capacity: null, minimum: null,
        service_pct: c.service_pct, taxable: c.taxable,
        quantity: c.quantity, hours: c.hours, people: c.people },
      taxSettings.tax_pct, taxSettings.tax_on_service,
    )
    return { id: c.id, category: c.category, name: c.name, ...r }
  })
  const summary = computeBillSummary(lines)
  const categories = Object.keys(summary.categorySubtotals).sort()

  if (charges.length === 0) {
    return (
      <div className="bg-white border border-cream-200 rounded-xl p-5 shadow-sm">
        <p className="text-xs font-semibold text-brown-400 uppercase tracking-wider mb-3">Bill Summary</p>
        <p className="text-sm text-brown-300">Add charges to see totals.</p>
      </div>
    )
  }

  return (
    <div className="bg-white border border-cream-200 rounded-xl p-5 shadow-sm">
      <p className="text-xs font-semibold text-brown-400 uppercase tracking-wider mb-4">Bill Summary</p>
      <div className="space-y-1">
        {categories.map(cat => (
          <div key={cat} className="flex justify-between text-sm">
            <span className="text-brown-500 truncate mr-2">{cat}</span>
            <span className="text-brown-700 shrink-0">${formatMoney(summary.categorySubtotals[cat])}</span>
          </div>
        ))}
      </div>
      <div className="border-t border-cream-200 mt-3 pt-3 space-y-1">
        <div className="flex justify-between text-sm">
          <span className="text-brown-400">Subtotal</span>
          <span className="text-brown-700">${formatMoney(summary.subtotal)}</span>
        </div>
        {summary.service > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-brown-400">Service charges</span>
            <span className="text-brown-700">${formatMoney(summary.service)}</span>
          </div>
        )}
        {summary.tax > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-brown-400">Tax ({taxSettings.tax_pct}%{taxSettings.tax_on_service ? ' incl. svc' : ''})</span>
            <span className="text-brown-700">${formatMoney(summary.tax)}</span>
          </div>
        )}
      </div>
      <div className="border-t border-cream-300 mt-3 pt-3 flex justify-between">
        <span className="font-semibold text-brown-700">Total</span>
        <span className="font-bold text-brown-800 text-lg">${formatMoney(summary.grandTotal)}</span>
      </div>
      {taxSettings.tax_on_service && (
        <p className="text-xs text-brown-300 mt-2">Tax applied to service charges.</p>
      )}
    </div>
  )
}

// ── ChargeRow ─────────────────────────────────────────────────────────────────

type InventoryInfo = { usable: number | null; available: number | null; date: string }

function ChargeRow({
  charge,
  taxSettings,
  inventoryInfo,
  onDelete,
}: {
  charge: EventCharge
  taxSettings: BillingSettings
  inventoryInfo?: InventoryInfo | null
  onDelete: () => void
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [qty,    setQty]    = useState(charge.quantity?.toString() ?? '1')
  const [hrs,    setHrs]    = useState(charge.hours?.toString()    ?? '1')
  const [ppl,    setPpl]    = useState(charge.people?.toString()   ?? '')
  const [price,  setPrice]  = useState(charge.unit_price.toString())
  const [saving, setSaving] = useState(false)

  const prevRef = useRef({ qty, hrs, ppl, price })

  const resolvedQty   = parseFloat(qty)   || null
  const resolvedHrs   = parseFloat(hrs)   || null
  const resolvedPpl   = parseInt(ppl, 10) || null
  const resolvedPrice = parseFloat(price) || charge.unit_price

  const result = calculateCharge(
    { unit: charge.unit, unit_price: resolvedPrice,
      additional_per_person: charge.additional_per_person,
      included_people: charge.included_people, max_capacity: null,
      minimum: null, service_pct: charge.service_pct, taxable: charge.taxable,
      quantity: resolvedQty, hours: resolvedHrs, people: resolvedPpl },
    taxSettings.tax_pct, taxSettings.tax_on_service,
  )

  async function handleBlur() {
    const prev = prevRef.current
    if (prev.qty === qty && prev.hrs === hrs && prev.ppl === ppl && prev.price === price) return
    prevRef.current = { qty, hrs, ppl, price }
    setSaving(true)
    const priceOverridden = resolvedPrice !== charge.list_price && charge.list_price != null
      ? true : charge.price_overridden
    await updateCharge(charge.id, charge.event_id, {
      quantity: charge.unit === 'each' ? (parseFloat(qty) || null) : charge.quantity,
      hours:    charge.unit === 'per_hour' ? (parseFloat(hrs) || null) : charge.hours,
      people:   (charge.unit === 'per_person' || charge.unit === 'per_event') ? (parseInt(ppl, 10) || null) : charge.people,
      unit_price:      resolvedPrice,
      price_overridden: priceOverridden,
    })
    setSaving(false)
    startTransition(() => router.refresh())
  }

  const isOverridden = resolvedPrice !== (charge.list_price ?? resolvedPrice)

  return (
    <div className={`border-b border-cream-100 last:border-0 py-3 ${saving ? 'opacity-60' : ''}`}>
      <div className="flex items-start gap-2 sm:gap-3">
        {/* Name + meta */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-brown-700 leading-snug">{charge.name}</p>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
            {charge.charge_date && (
              <span className="text-xs text-brown-400">{formatDate(charge.charge_date)}</span>
            )}
            {charge.notes && (
              <span className="text-xs text-brown-300">{charge.notes}</span>
            )}
            {charge.service_pct > 0 && (
              <span className="text-xs text-brown-300">+{charge.service_pct}% svc</span>
            )}
            {result.warnings.map((w, i) => (
              <span key={i} className="text-xs text-amber-600 font-medium">{w}</span>
            ))}
            {inventoryInfo && inventoryInfo.usable !== null && (
              <span className={`text-xs font-medium ${
                inventoryInfo.available !== null && inventoryInfo.available < 0
                  ? 'text-amber-600'
                  : 'text-brown-400'
              }`}>
                {inventoryInfo.available !== null && inventoryInfo.available < 0
                  ? `${Math.abs(inventoryInfo.available)} short (overbooked) ${formatDateShortWithDay(inventoryInfo.date)}`
                  : `${inventoryInfo.available} of ${inventoryInfo.usable} available ${formatDateShortWithDay(inventoryInfo.date)}`
                }
              </span>
            )}
          </div>
        </div>

        {/* Qty / people / hours input */}
        <div className="shrink-0 flex items-center gap-1">
          {(charge.unit === 'per_person' || charge.unit === 'per_event') && (
            <div className="flex items-center gap-0.5">
              <input
                type="number"
                min="1"
                value={ppl}
                onChange={e => setPpl(e.target.value)}
                onBlur={handleBlur}
                className="w-16 border border-cream-300 rounded px-2 py-1 text-xs text-right bg-white focus:outline-none focus:ring-1 focus:ring-brown-300"
                placeholder="ppl"
              />
              <span className="text-xs text-brown-300">ppl</span>
            </div>
          )}
          {charge.unit === 'each' && (
            <div className="flex items-center gap-0.5">
              <input
                type="number"
                min="1"
                value={qty}
                onChange={e => setQty(e.target.value)}
                onBlur={handleBlur}
                className="w-14 border border-cream-300 rounded px-2 py-1 text-xs text-right bg-white focus:outline-none focus:ring-1 focus:ring-brown-300"
                placeholder="qty"
              />
              <span className="text-xs text-brown-300">qty</span>
            </div>
          )}
          {charge.unit === 'per_hour' && (
            <div className="flex items-center gap-0.5">
              <input
                type="number"
                min="0.5"
                step="0.5"
                value={hrs}
                onChange={e => setHrs(e.target.value)}
                onBlur={handleBlur}
                className="w-14 border border-cream-300 rounded px-2 py-1 text-xs text-right bg-white focus:outline-none focus:ring-1 focus:ring-brown-300"
                placeholder="hrs"
              />
              <span className="text-xs text-brown-300">hr</span>
            </div>
          )}
        </div>

        {/* Price */}
        <div className="shrink-0 text-right">
          <div className="flex items-center gap-0.5 justify-end">
            <span className="text-xs text-brown-400">$</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={e => setPrice(e.target.value)}
              onBlur={handleBlur}
              className="w-20 border border-cream-300 rounded px-1 py-1 text-xs text-right bg-white focus:outline-none focus:ring-1 focus:ring-brown-300"
            />
            <span className="text-xs text-brown-300">{formatUnitLabel(charge.unit, true)}</span>
          </div>
          {isOverridden && charge.list_price != null && (
            <p className="text-xs text-brown-300 mt-0.5">List ${formatMoney(charge.list_price)}</p>
          )}
        </div>

        {/* Amount */}
        <div className="shrink-0 text-right w-20">
          <p className="text-sm font-medium text-brown-700">${formatMoney(result.amount)}</p>
          {result.service_amount > 0 && (
            <p className="text-xs text-brown-300">+${formatMoney(result.service_amount)}</p>
          )}
        </div>

        {/* Remove */}
        <button
          onClick={onDelete}
          className="shrink-0 text-brown-200 hover:text-red-400 transition-colors mt-0.5 w-5 text-center"
          title="Remove charge"
        >
          ×
        </button>
      </div>
    </div>
  )
}

// ── Custom line form ───────────────────────────────────────────────────────────

function CustomLineForm({
  eventId,
  defaultPeople,
  onDone,
}: {
  eventId: string
  defaultPeople: number | null
  onDone: () => void
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [category, setCategory] = useState('')
  const [name,     setName]     = useState('')
  const [unit,     setUnit]     = useState<ChargeUnit>('per_person')
  const [price,    setPrice]    = useState('')
  const [qty,      setQty]      = useState('1')
  const [hrs,      setHrs]      = useState('1')
  const [ppl,      setPpl]      = useState(defaultPeople?.toString() ?? '')
  const [svcPct,   setSvcPct]   = useState('0')
  const [taxable,  setTaxable]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')

  async function handleAdd() {
    if (!name.trim() || !category.trim() || !price) return
    setSaving(true)
    setError('')
    const p = parseFloat(price)
    const result = await addCharge(eventId, {
      price_item_id: null,
      category: category.trim(),
      name: name.trim(),
      unit,
      quantity: unit === 'each' ? (parseFloat(qty) || 1) : null,
      hours:    unit === 'per_hour' ? (parseFloat(hrs) || 1) : null,
      people:   (unit === 'per_person' || unit === 'per_event') ? (parseInt(ppl, 10) || null) : null,
      charge_date: null,
      notes: null,
      unit_price: p,
      list_price: p,
      additional_per_person: null,
      included_people: null,
      service_pct: parseFloat(svcPct) || 0,
      taxable,
      price_overridden: false,
      sort_order: 9999,
    })
    setSaving(false)
    if (result.error) { setError(result.error); return }
    startTransition(() => router.refresh())
    onDone()
  }

  return (
    <div className="border border-cream-200 rounded-xl p-4 bg-cream-50 space-y-3 mb-4">
      <p className="text-xs font-semibold text-brown-400 uppercase tracking-wider">Custom Line</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-brown-400 mb-0.5">Category</label>
          <input value={category} onChange={e => setCategory(e.target.value)}
            className="w-full border border-cream-300 rounded px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-brown-300"
            placeholder="e.g. Meals" />
        </div>
        <div>
          <label className="block text-xs text-brown-400 mb-0.5">Item Name</label>
          <input value={name} onChange={e => setName(e.target.value)}
            className="w-full border border-cream-300 rounded px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-brown-300"
            placeholder="Description" />
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs text-brown-400 mb-0.5">Unit</label>
          <select value={unit} onChange={e => setUnit(e.target.value as ChargeUnit)}
            className="w-full border border-cream-300 rounded px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-brown-300">
            <option value="per_person">per person</option>
            <option value="per_event">per event</option>
            <option value="each">each</option>
            <option value="per_hour">per hour</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-brown-400 mb-0.5">Price ($)</label>
          <input type="number" min="0" step="0.01" value={price} onChange={e => setPrice(e.target.value)}
            className="w-full border border-cream-300 rounded px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-brown-300" />
        </div>
        <div>
          <label className="block text-xs text-brown-400 mb-0.5">
            {unit === 'each' ? 'Qty' : unit === 'per_hour' ? 'Hours' : 'People'}
          </label>
          {unit === 'each' && (
            <input type="number" min="1" value={qty} onChange={e => setQty(e.target.value)}
              className="w-full border border-cream-300 rounded px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-brown-300" />
          )}
          {unit === 'per_hour' && (
            <input type="number" min="0.5" step="0.5" value={hrs} onChange={e => setHrs(e.target.value)}
              className="w-full border border-cream-300 rounded px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-brown-300" />
          )}
          {(unit === 'per_person' || unit === 'per_event') && (
            <input type="number" min="1" value={ppl} onChange={e => setPpl(e.target.value)}
              className="w-full border border-cream-300 rounded px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-brown-300" />
          )}
        </div>
        <div>
          <label className="block text-xs text-brown-400 mb-0.5">Service %</label>
          <input type="number" min="0" max="100" step="1" value={svcPct} onChange={e => setSvcPct(e.target.value)}
            className="w-full border border-cream-300 rounded px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-brown-300" />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={taxable} onChange={e => setTaxable(e.target.checked)}
            className="rounded border-cream-300 text-brown-500 focus:ring-brown-300" />
          <span className="text-xs text-brown-500">Taxable</span>
        </label>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button onClick={handleAdd} disabled={saving || !name.trim() || !category.trim() || !price}
          className="bg-brown-500 hover:bg-brown-600 text-white text-xs font-medium px-4 py-1.5 rounded-lg disabled:opacity-50 transition-colors">
          {saving ? 'Adding…' : 'Add Line'}
        </button>
        <button onClick={onDone} className="text-xs text-brown-400 hover:text-brown-600 px-3 py-1.5 rounded-lg transition-colors">
          Cancel
        </button>
      </div>
    </div>
  )
}

// ── Main ChargesTab ────────────────────────────────────────────────────────────

export default function ChargesTab({
  event,
  charges: initialCharges,
  priceItems,
  billingSettings,
  inventoryAvailability = {},
}: {
  event: Event
  charges: EventCharge[]
  priceItems: PriceItem[]
  billingSettings: BillingSettings
  inventoryAvailability?: Record<string, { usable: number | null; available: number | null }>
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [charges, setCharges]   = useState(initialCharges)
  const [search, setSearch]     = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [showCustom, setShowCustom]     = useState(false)
  const [deletingId, setDeletingId]     = useState<string | null>(null)
  const [paxBannerDismissed, setPaxBannerDismissed] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  // Keep local charges in sync when server refreshes
  useEffect(() => { setCharges(initialCharges) }, [initialCharges])

  // Click-outside to close dropdown
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ── pax update banner ──
  const paxTargetLines = charges.filter(c =>
    (c.unit === 'per_person' || c.unit === 'per_event') &&
    event.pax != null && c.people !== event.pax
  )
  const showPaxBanner = !paxBannerDismissed && paxTargetLines.length > 0 && event.pax != null

  async function handleUpdatePax() {
    if (!event.pax) return
    const ids = paxTargetLines.map(c => c.id)
    await bulkUpdatePeople(event.id, ids, event.pax)
    setPaxBannerDismissed(true)
    startTransition(() => router.refresh())
  }

  // ── price level ──
  async function handlePriceLevel(level: 'dmc' | 'regular') {
    await updatePriceLevel(event.id, level)
    startTransition(() => router.refresh())
  }

  // ── add from price list ──
  const filteredItems = search.trim().length >= 1
    ? priceItems.filter(p => p.active && (
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.category.toLowerCase().includes(search.toLowerCase())
      )).slice(0, 10)
    : []

  async function handleAddFromPriceList(item: PriceItem) {
    setSearch('')
    setShowDropdown(false)
    const level = event.price_level
    const unit_price = resolvePriceLevel(level, item.dmc_price, item.regular_price)
    const additional = resolveAdditionalPerPerson(level, item.additional_per_person_dmc, item.additional_per_person_regular)

    const defaultPeople = (item.unit === 'per_person' || item.unit === 'per_event') ? (event.pax ?? null) : null
    const defaultHours  = item.unit === 'per_hour' ? (item.minimum ?? 1) : null
    const defaultQty    = item.unit === 'each' ? 1 : null

    await addCharge(event.id, {
      price_item_id: item.id,
      category: item.category,
      name: item.name,
      unit: item.unit,
      quantity: defaultQty,
      hours:    defaultHours,
      people:   defaultPeople,
      charge_date: null,
      notes: null,
      unit_price,
      list_price: unit_price,
      additional_per_person: additional,
      included_people: item.included_people,
      service_pct: item.service_pct,
      taxable: item.taxable,
      price_overridden: false,
      sort_order: charges.length * 10,
    })
    startTransition(() => router.refresh())
  }

  // ── delete ──
  async function handleDelete(id: string) {
    setDeletingId(id)
    await deleteCharge(id, event.id)
    setDeletingId(null)
    startTransition(() => router.refresh())
  }

  // Group by category
  const byCategory = new Map<string, EventCharge[]>()
  for (const c of charges) {
    if (!byCategory.has(c.category)) byCategory.set(c.category, [])
    byCategory.get(c.category)!.push(c)
  }
  const categories = Array.from(byCategory.keys()).sort()

  // Category subtotals for the grouped headers
  function categoryAmount(cat: string): number {
    const cats = byCategory.get(cat) ?? []
    return cats.reduce((sum, c) => {
      const r = calculateCharge(
        { unit: c.unit, unit_price: c.unit_price, additional_per_person: c.additional_per_person,
          included_people: c.included_people, max_capacity: null, minimum: null,
          service_pct: c.service_pct, taxable: c.taxable,
          quantity: c.quantity, hours: c.hours, people: c.people },
        billingSettings.tax_pct, billingSettings.tax_on_service,
      )
      return sum + r.amount
    }, 0)
  }

  return (
    <div className="space-y-5">
      {/* Price level + search bar */}
      <div className="bg-white border border-cream-200 rounded-xl p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Price level toggle */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-brown-400 font-medium">Price Level:</span>
            <div className="flex rounded border border-cream-300 overflow-hidden text-xs">
              {(['regular', 'dmc'] as const).map(level => (
                <button
                  key={level}
                  onClick={() => handlePriceLevel(level)}
                  className={`px-3 py-1.5 capitalize transition-colors ${
                    event.price_level === level ? 'bg-brown-500 text-white' : 'bg-white text-brown-500 hover:bg-cream-50'
                  }`}
                >
                  {level === 'dmc' ? 'DMC' : 'Regular'}
                </button>
              ))}
            </div>
          </div>

          {/* Search */}
          <div className="flex-1 relative" ref={searchRef}>
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setShowDropdown(e.target.value.trim().length >= 1) }}
              onFocus={() => { if (search.trim().length >= 1) setShowDropdown(true) }}
              placeholder="Search price list by name or category…"
              className="w-full border border-cream-300 rounded-lg px-3 py-2 text-sm bg-cream-50 focus:outline-none focus:ring-2 focus:ring-brown-300"
            />
            {showDropdown && filteredItems.length > 0 && (
              <div className="absolute z-30 top-full mt-1 left-0 right-0 bg-white border border-cream-200 rounded-xl shadow-lg overflow-hidden max-h-72 overflow-y-auto">
                {filteredItems.map(item => {
                  const price = resolvePriceLevel(event.price_level, item.dmc_price, item.regular_price)
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleAddFromPriceList(item)}
                      className="w-full text-left px-4 py-3 hover:bg-cream-50 transition-colors border-b border-cream-100 last:border-0"
                    >
                      <div className="flex items-baseline justify-between gap-3">
                        <div className="min-w-0">
                          <span className="text-sm font-medium text-brown-700 truncate block">{item.name}</span>
                          <span className="text-xs text-brown-400">{item.category}</span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-sm font-medium text-brown-600">${formatMoney(price)}</span>
                          <span className="text-xs text-brown-300 ml-1">{formatUnitLabel(item.unit, true)}</span>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
            {showDropdown && search.trim().length >= 1 && filteredItems.length === 0 && (
              <div className="absolute z-30 top-full mt-1 left-0 right-0 bg-white border border-cream-200 rounded-xl shadow-lg px-4 py-3">
                <p className="text-sm text-brown-300">No items match &ldquo;{search}&rdquo;</p>
              </div>
            )}
          </div>

          <button
            onClick={() => { setShowCustom(v => !v); setSearch(''); setShowDropdown(false) }}
            className="text-xs border border-cream-300 text-brown-500 hover:bg-cream-100 px-3 py-2 rounded-lg transition-colors shrink-0"
          >
            + Custom line
          </button>
        </div>
      </div>

      {/* Pax update banner */}
      {showPaxBanner && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-4">
          <p className="text-sm text-amber-800 flex-1">
            {paxTargetLines.length} {paxTargetLines.length === 1 ? 'line uses' : 'lines use'} a different guest count.
            Update to <strong>{event.pax} guests</strong>?
          </p>
          <button onClick={handleUpdatePax}
            className="text-xs bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg transition-colors shrink-0">
            Update {paxTargetLines.length} {paxTargetLines.length === 1 ? 'line' : 'lines'}
          </button>
          <button onClick={() => setPaxBannerDismissed(true)}
            className="text-xs text-amber-500 hover:text-amber-700 transition-colors shrink-0">
            Dismiss
          </button>
        </div>
      )}

      {/* Custom line form */}
      {showCustom && (
        <CustomLineForm
          eventId={event.id}
          defaultPeople={event.pax}
          onDone={() => setShowCustom(false)}
        />
      )}

      {/* Main content: charge lines + summary */}
      <div className="flex flex-col lg:flex-row gap-5 items-start">
        {/* Charge lines */}
        <div className="flex-1 min-w-0 space-y-3">
          {charges.length === 0 && !showCustom && (
            <div className="bg-white border border-cream-200 rounded-xl p-8 text-center">
              <p className="text-sm text-brown-300">No charges yet. Search the price list above or add a custom line.</p>
            </div>
          )}

          {categories.map(cat => {
            const lines = byCategory.get(cat)!
            const catAmt = categoryAmount(cat)
            return (
              <div key={cat} className="bg-white border border-cream-200 rounded-xl shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-cream-50 border-b border-cream-200">
                  <p className="text-xs font-semibold text-brown-500 uppercase tracking-wider">{cat}</p>
                  <p className="text-xs font-medium text-brown-500">${formatMoney(catAmt)}</p>
                </div>
                <div className="px-4">
                  {lines.map(c => {
                    const invKey = c.inventory_item_id
                      ? `${c.inventory_item_id}:${c.charge_date ?? event.start_date}`
                      : null
                    const invInfo = invKey ? (inventoryAvailability[invKey] ? { ...inventoryAvailability[invKey], date: c.charge_date ?? event.start_date } : null) : null
                    return (
                    <ChargeRow
                      key={c.id}
                      charge={c}
                      taxSettings={billingSettings}
                      inventoryInfo={invInfo}
                      onDelete={() => {
                        if (deletingId === c.id) return
                        handleDelete(c.id)
                      }}
                    />
                  )})}
                </div>
              </div>
            )
          })}
        </div>

        {/* Bill summary */}
        <div className="w-full lg:w-72 shrink-0">
          <BillSummaryCard charges={charges} taxSettings={billingSettings} />
        </div>
      </div>
    </div>
  )
}
