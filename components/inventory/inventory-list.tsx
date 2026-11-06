'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { InventoryItem, PriceItem } from '@/lib/types'
import { formatDate } from '@/lib/time'
import { isCountStale } from '@/lib/inventory'
import { createInventoryItem } from '@/app/actions/inventory'

export type LatestCount = {
  counted_qty: number
  counted_at: string
  counter_name: string | null
}

const DEFAULT_CATEGORIES = ['Tables', 'Seating', 'Décor', 'Equipment', 'Other']

function AddItemForm({
  priceItems,
  existingCategories,
  onDone,
}: {
  priceItems: PriceItem[]
  existingCategories: string[]
  onDone: () => void
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [name, setName]       = useState('')
  const [category, setCategory] = useState('')
  const [qty, setQty]         = useState('')
  const [repair, setRepair]   = useState('0')
  const [location, setLocation] = useState('')
  const [notes, setNotes]     = useState('')
  const [priceSearch, setPriceSearch] = useState('')
  const [selectedPriceItem, setSelectedPriceItem] = useState<PriceItem | null>(null)
  const [showPriceDropdown, setShowPriceDropdown] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')
  const priceRef = useRef<HTMLDivElement>(null)

  const allCategories = Array.from(new Set([...DEFAULT_CATEGORIES, ...existingCategories])).sort()

  const filteredPriceItems = priceSearch.trim().length >= 1
    ? priceItems.filter(p => p.active && (
        p.name.toLowerCase().includes(priceSearch.toLowerCase()) ||
        p.category.toLowerCase().includes(priceSearch.toLowerCase())
      )).slice(0, 8)
    : []

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (priceRef.current && !priceRef.current.contains(e.target as Node)) {
        setShowPriceDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function handleSave() {
    if (!name.trim() || !category.trim()) return
    setSaving(true)
    setError('')
    const result = await createInventoryItem({
      name: name.trim(),
      category: category.trim(),
      quantity_owned: qty.trim() !== '' ? parseInt(qty, 10) : null,
      qty_needs_repair: parseInt(repair, 10) || 0,
      storage_location: location.trim() || null,
      notes: notes.trim() || null,
      price_item_id: selectedPriceItem?.id ?? null,
      sort_order: 0,
    })
    setSaving(false)
    if (result.error) { setError(result.error); return }
    startTransition(() => router.refresh())
    onDone()
  }

  return (
    <div className="border border-cream-200 rounded-xl p-4 bg-cream-50 space-y-3 mb-4">
      <p className="text-xs font-semibold text-brown-400 uppercase tracking-wider">New Item</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-brown-400 mb-0.5">Item Name *</label>
          <input value={name} onChange={e => setName(e.target.value)}
            className="w-full border border-cream-300 rounded px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-brown-300"
            placeholder="e.g. Round Tables" />
        </div>
        <div>
          <label className="block text-xs text-brown-400 mb-0.5">Category *</label>
          <input
            list="inv-categories"
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="w-full border border-cream-300 rounded px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-brown-300"
            placeholder="Tables, Seating, Décor…"
          />
          <datalist id="inv-categories">
            {allCategories.map(c => <option key={c} value={c} />)}
          </datalist>
        </div>
        <div>
          <label className="block text-xs text-brown-400 mb-0.5">Qty Owned</label>
          <input type="number" min="0" value={qty} onChange={e => setQty(e.target.value)}
            className="w-full border border-cream-300 rounded px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-brown-300"
            placeholder="Leave blank = not yet counted" />
        </div>
        <div>
          <label className="block text-xs text-brown-400 mb-0.5">Needs Repair</label>
          <input type="number" min="0" value={repair} onChange={e => setRepair(e.target.value)}
            className="w-full border border-cream-300 rounded px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-brown-300" />
        </div>
        <div>
          <label className="block text-xs text-brown-400 mb-0.5">Storage Location</label>
          <input value={location} onChange={e => setLocation(e.target.value)}
            className="w-full border border-cream-300 rounded px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-brown-300"
            placeholder="e.g. Barn loft" />
        </div>
        <div className="relative" ref={priceRef}>
          <label className="block text-xs text-brown-400 mb-0.5">Link to Price Item</label>
          {selectedPriceItem ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-brown-700 truncate">{selectedPriceItem.name}</span>
              <button type="button" onClick={() => { setSelectedPriceItem(null); setPriceSearch('') }}
                className="text-xs text-brown-300 hover:text-red-400 shrink-0">×</button>
            </div>
          ) : (
            <>
              <input
                value={priceSearch}
                onChange={e => { setPriceSearch(e.target.value); setShowPriceDropdown(e.target.value.trim().length >= 1) }}
                onFocus={() => { if (priceSearch.trim().length >= 1) setShowPriceDropdown(true) }}
                className="w-full border border-cream-300 rounded px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-brown-300"
                placeholder="Search price list…"
              />
              {showPriceDropdown && filteredPriceItems.length > 0 && (
                <div className="absolute z-30 top-full mt-1 left-0 right-0 bg-white border border-cream-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                  {filteredPriceItems.map(p => (
                    <button key={p.id} type="button"
                      onClick={() => { setSelectedPriceItem(p); setPriceSearch(''); setShowPriceDropdown(false) }}
                      className="w-full text-left px-3 py-2 text-sm text-brown-700 hover:bg-cream-50 border-b border-cream-100 last:border-0">
                      {p.name} <span className="text-xs text-brown-400">— {p.category}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <div>
        <label className="block text-xs text-brown-400 mb-0.5">Notes</label>
        <input value={notes} onChange={e => setNotes(e.target.value)}
          className="w-full border border-cream-300 rounded px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-brown-300"
          placeholder="e.g. Price sheet says max 11" />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button onClick={handleSave} disabled={saving || !name.trim() || !category.trim()}
          className="bg-brown-500 hover:bg-brown-600 text-white text-xs font-medium px-4 py-1.5 rounded-lg disabled:opacity-50 transition-colors">
          {saving ? 'Adding…' : 'Add Item'}
        </button>
        <button onClick={onDone} className="text-xs text-brown-400 hover:text-brown-600 px-3 py-1.5 rounded-lg transition-colors">
          Cancel
        </button>
      </div>
    </div>
  )
}

export default function InventoryList({
  items,
  availableToday,
  latestCountByItem,
  canEdit,
  priceItems,
}: {
  items: InventoryItem[]
  availableToday: Record<string, number | null>
  latestCountByItem: Record<string, LatestCount>
  canEdit: boolean
  priceItems: PriceItem[]
}) {
  const [search, setSearch]           = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)

  const categories = Array.from(new Set(items.map(i => i.category))).sort()

  const filtered = items.filter(item => {
    if (!item.active) return false
    if (selectedCategory && item.category !== selectedCategory) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      return item.name.toLowerCase().includes(q) ||
             item.category.toLowerCase().includes(q) ||
             (item.storage_location ?? '').toLowerCase().includes(q)
    }
    return true
  })

  const existingCategories = Array.from(new Set(items.map(i => i.category)))

  function renderOwned(item: InventoryItem) {
    if (item.quantity_owned === null) return <span className="text-amber-600">—</span>
    return <span>{item.quantity_owned}</span>
  }

  function renderAvailable(item: InventoryItem) {
    const avail = availableToday[item.id]
    if (avail === null || avail === undefined) return <span className="text-brown-300">—</span>
    if (avail < 0) return <span className="text-red-500 font-medium">{avail}</span>
    if (item.quantity_owned !== null && avail < item.quantity_owned * 0.2) {
      return <span className="text-amber-600 font-medium">{avail}</span>
    }
    return <span className="text-green-700">{avail}</span>
  }

  function renderLastCounted(item: InventoryItem) {
    const count = latestCountByItem[item.id]
    if (!count) return <span className="text-amber-600 text-xs">Not counted</span>
    const stale = isCountStale(count.counted_at)
    const dateStr = formatDate(count.counted_at.slice(0, 10))
    const name = count.counter_name ? ` · ${count.counter_name}` : ''
    return (
      <span className={stale ? 'text-amber-600' : 'text-brown-400'}>
        {stale && <span className="mr-1" title="Not counted in 90+ days">⚠</span>}
        {dateStr}{name}
      </span>
    )
  }

  return (
    <div className="max-w-6xl space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brown-800">Inventory</h1>
          <p className="text-xs text-brown-300 mt-0.5">{items.filter(i => i.active).length} items</p>
        </div>
        {canEdit && !showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="text-xs bg-brown-500 hover:bg-brown-600 text-white font-medium px-3 py-1.5 rounded-lg transition-colors"
          >
            + Add item
          </button>
        )}
      </div>

      {/* Add form */}
      {showAddForm && canEdit && (
        <AddItemForm
          priceItems={priceItems}
          existingCategories={existingCategories}
          onDone={() => setShowAddForm(false)}
        />
      )}

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${
              selectedCategory === null
                ? 'bg-brown-500 text-white border-brown-500'
                : 'border-cream-300 text-brown-500 hover:bg-cream-100'
            }`}
          >
            All
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                selectedCategory === cat
                  ? 'bg-brown-500 text-white border-brown-500'
                  : 'border-cream-300 text-brown-500 hover:bg-cream-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search items…"
          className="sm:ml-auto border border-cream-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-brown-300 w-full sm:w-56"
        />
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block bg-white border border-cream-200 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-cream-200 bg-cream-50">
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-brown-400 uppercase tracking-wider">Item</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-brown-400 uppercase tracking-wider">Category</th>
              <th className="text-right px-4 py-2.5 text-xs font-semibold text-brown-400 uppercase tracking-wider">Owned</th>
              <th className="text-right px-4 py-2.5 text-xs font-semibold text-brown-400 uppercase tracking-wider">Avail. today</th>
              <th className="text-right px-4 py-2.5 text-xs font-semibold text-brown-400 uppercase tracking-wider">Repair</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-brown-400 uppercase tracking-wider hidden lg:table-cell">Location</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-brown-400 uppercase tracking-wider">Last counted</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-brown-300">
                  {items.length === 0 ? 'No items yet. Add your first item above.' : 'No items match your filter.'}
                </td>
              </tr>
            )}
            {filtered.map(item => (
              <tr key={item.id} className="border-b border-cream-100 last:border-0 hover:bg-cream-50 transition-colors">
                <td className="px-4 py-3">
                  <Link href={`/inventory/${item.id}`} className="font-medium text-brown-700 hover:text-brown-900 hover:underline">
                    {item.name}
                  </Link>
                  {item.notes && <p className="text-xs text-brown-300 mt-0.5 truncate max-w-xs">{item.notes}</p>}
                </td>
                <td className="px-4 py-3 text-brown-500">{item.category}</td>
                <td className="px-4 py-3 text-right">{renderOwned(item)}</td>
                <td className="px-4 py-3 text-right">{renderAvailable(item)}</td>
                <td className="px-4 py-3 text-right text-brown-500">
                  {item.qty_needs_repair > 0 ? (
                    <span className="text-amber-600">{item.qty_needs_repair}</span>
                  ) : (
                    <span className="text-brown-200">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-brown-400 hidden lg:table-cell text-xs">
                  {item.storage_location ?? <span className="text-brown-200">—</span>}
                </td>
                <td className="px-4 py-3 text-xs">{renderLastCounted(item)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden space-y-2">
        {filtered.length === 0 && (
          <div className="bg-white border border-cream-200 rounded-xl p-6 text-center">
            <p className="text-sm text-brown-300">
              {items.length === 0 ? 'No items yet.' : 'No items match your filter.'}
            </p>
          </div>
        )}
        {filtered.map(item => {
          const avail = availableToday[item.id]
          const count = latestCountByItem[item.id]
          const stale = count ? isCountStale(count.counted_at) : true
          return (
            <Link key={item.id} href={`/inventory/${item.id}`}
              className="block bg-white border border-cream-200 rounded-xl p-4 hover:border-brown-300 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-brown-700">{item.name}</p>
                  <p className="text-xs text-brown-400 mt-0.5">{item.category}
                    {item.storage_location && ` · ${item.storage_location}`}
                  </p>
                  {item.notes && <p className="text-xs text-brown-300 mt-1 truncate">{item.notes}</p>}
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-medium text-brown-700">
                    {item.quantity_owned !== null ? item.quantity_owned : <span className="text-amber-600">—</span>}
                    <span className="text-xs text-brown-300 ml-1">owned</span>
                  </p>
                  {avail !== null && avail !== undefined && (
                    <p className={`text-xs mt-0.5 ${avail < 0 ? 'text-red-500' : 'text-brown-400'}`}>
                      {avail} avail.
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-cream-100 flex items-center justify-between">
                <span className={`text-xs ${stale ? 'text-amber-600' : 'text-brown-400'}`}>
                  {count
                    ? `${stale ? '⚠ ' : ''}${formatDate(count.counted_at.slice(0, 10))}${count.counter_name ? ` · ${count.counter_name}` : ''}`
                    : 'Not counted yet'}
                </span>
                {item.qty_needs_repair > 0 && (
                  <span className="text-xs text-amber-600">{item.qty_needs_repair} need repair</span>
                )}
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
