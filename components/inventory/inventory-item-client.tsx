'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { InventoryItem, PriceItem } from '@/lib/types'
import { formatDate } from '@/lib/time'
import { computeUsable, isCountStale } from '@/lib/inventory'
import { updateInventoryItem, deactivateInventoryItem, recordInventoryCount } from '@/app/actions/inventory'

export type CountWithName = {
  id: string
  counted_qty: number
  counted_at: string
  notes: string | null
  counter_name: string | null
}

export type UpcomingUse = {
  id: string
  event_id: string
  event_name: string
  event_start_date: string
  event_end_date: string
  quantity: number | null
  charge_date: string | null
}

function RecordCountForm({
  item,
  onDone,
}: {
  item: InventoryItem
  onDone: () => void
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [qty, setQty]       = useState(item.quantity_owned?.toString() ?? '')
  const [notes, setNotes]   = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  async function handleSave() {
    const n = parseInt(qty, 10)
    if (isNaN(n) || n < 0) { setError('Enter a valid quantity.'); return }
    setSaving(true)
    setError('')
    const result = await recordInventoryCount(item.id, n, notes.trim() || null)
    setSaving(false)
    if (result.error) { setError(result.error); return }
    startTransition(() => router.refresh())
    onDone()
  }

  return (
    <div className="border border-cream-200 rounded-xl p-4 bg-cream-50 space-y-3">
      <p className="text-xs font-semibold text-brown-400 uppercase tracking-wider">Record Count</p>
      <div className="flex gap-3 items-end">
        <div className="flex-1">
          <label className="block text-xs text-brown-400 mb-0.5">Counted Qty</label>
          <input
            type="number"
            min="0"
            value={qty}
            onChange={e => setQty(e.target.value)}
            className="w-full border border-cream-300 rounded px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-brown-300"
            placeholder="Enter count"
            autoFocus
          />
        </div>
        <div className="flex-1">
          <label className="block text-xs text-brown-400 mb-0.5">Notes (optional)</label>
          <input
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="w-full border border-cream-300 rounded px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-brown-300"
            placeholder="e.g. 2 in back storage"
          />
        </div>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button onClick={handleSave} disabled={saving || qty.trim() === ''}
          className="bg-brown-500 hover:bg-brown-600 text-white text-xs font-medium px-4 py-1.5 rounded-lg disabled:opacity-50 transition-colors">
          {saving ? 'Saving…' : 'Save Count'}
        </button>
        <button onClick={onDone} className="text-xs text-brown-400 hover:text-brown-600 px-3 py-1.5 rounded-lg transition-colors">
          Cancel
        </button>
      </div>
    </div>
  )
}

export default function InventoryItemClient({
  item,
  counts,
  upcomingUse,
  canEdit,
  isAdmin,
  priceItems,
}: {
  item: InventoryItem
  counts: CountWithName[]
  upcomingUse: UpcomingUse[]
  canEdit: boolean
  isAdmin: boolean
  priceItems: PriceItem[]
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [editing, setEditing]           = useState(false)
  const [showCount, setShowCount]       = useState(false)
  const [confirmDeactivate, setConfirmDeactivate] = useState(false)
  const [saving, setSaving]             = useState(false)
  const [error, setError]               = useState('')

  // Edit state
  const [name, setName]             = useState(item.name)
  const [category, setCategory]     = useState(item.category)
  const [repair, setRepair]         = useState(item.qty_needs_repair.toString())
  const [retired, setRetired]       = useState(item.qty_retired.toString())
  const [location, setLocation]     = useState(item.storage_location ?? '')
  const [notes, setNotes]           = useState(item.notes ?? '')
  const [linkedPriceItem, setLinkedPriceItem] = useState<PriceItem | null>(
    item.price_item_id ? priceItems.find(p => p.id === item.price_item_id) ?? null : null
  )
  const [priceSearch, setPriceSearch] = useState('')
  const [showPriceDropdown, setShowPriceDropdown] = useState(false)

  const filteredPriceItems = priceSearch.trim().length >= 1
    ? priceItems.filter(p => p.active && p.name.toLowerCase().includes(priceSearch.toLowerCase())).slice(0, 8)
    : []

  const usable = computeUsable(item)
  const latestCount = counts[0]
  const stale = latestCount ? isCountStale(latestCount.counted_at) : true

  async function handleSave() {
    if (!name.trim() || !category.trim()) return
    setSaving(true)
    setError('')
    const result = await updateInventoryItem(item.id, {
      name: name.trim(),
      category: category.trim(),
      qty_needs_repair: parseInt(repair, 10) || 0,
      qty_retired: parseInt(retired, 10) || 0,
      storage_location: location.trim() || null,
      notes: notes.trim() || null,
      price_item_id: linkedPriceItem?.id ?? null,
    })
    setSaving(false)
    if (result.error) { setError(result.error); return }
    setEditing(false)
    startTransition(() => router.refresh())
  }

  async function handleDeactivate() {
    setSaving(true)
    const result = await deactivateInventoryItem(item.id)
    setSaving(false)
    if (result.error) { setError(result.error); return }
    startTransition(() => router.push('/inventory'))
  }

  return (
    <div className="max-w-3xl space-y-5">
      {/* Header */}
      <div>
        <Link href="/inventory" className="text-brown-300 hover:text-brown-500 text-sm">← Inventory</Link>
        <div className="flex flex-wrap items-start justify-between gap-3 mt-1">
          <div>
            <h1 className="text-2xl font-bold text-brown-800">{item.name}</h1>
            <p className="text-xs text-brown-400 mt-0.5">{item.category}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canEdit && !editing && (
              <button onClick={() => setShowCount(v => !v)}
                className="text-xs bg-brown-500 hover:bg-brown-600 text-white font-medium px-3 py-1.5 rounded-lg transition-colors">
                Record count
              </button>
            )}
            {canEdit && !editing && (
              <button onClick={() => setEditing(true)}
                className="text-xs border border-cream-300 text-brown-500 hover:bg-cream-100 px-3 py-1.5 rounded-lg transition-colors">
                Edit
              </button>
            )}
            {isAdmin && !editing && !confirmDeactivate && (
              <button onClick={() => setConfirmDeactivate(true)}
                className="text-xs text-red-400 hover:text-red-600 px-2 py-1.5 transition-colors">
                Deactivate
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Deactivate confirm */}
      {confirmDeactivate && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-4">
          <p className="text-sm text-red-700 flex-1">Deactivate <strong>{item.name}</strong>? It will be hidden from new charges but historical data is preserved.</p>
          <button onClick={handleDeactivate} disabled={saving}
            className="bg-red-600 hover:bg-red-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg disabled:opacity-50">
            {saving ? 'Deactivating…' : 'Deactivate'}
          </button>
          <button onClick={() => setConfirmDeactivate(false)} className="text-xs text-brown-400 hover:text-brown-600 px-2 py-1.5">Cancel</button>
        </div>
      )}

      {/* Record count */}
      {showCount && canEdit && (
        <RecordCountForm item={item} onDone={() => setShowCount(false)} />
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Owned',         value: item.quantity_owned !== null ? item.quantity_owned.toString() : '—', amber: item.quantity_owned === null },
          { label: 'Usable',        value: usable !== null ? usable.toString() : '—', amber: usable === null },
          { label: 'Needs repair',  value: item.qty_needs_repair.toString(), amber: item.qty_needs_repair > 0 },
          { label: 'Retired',       value: item.qty_retired.toString(), amber: false },
        ].map(s => (
          <div key={s.label} className="bg-white border border-cream-200 rounded-xl p-4 text-center">
            <p className={`text-2xl font-bold ${s.amber ? 'text-amber-600' : 'text-brown-700'}`}>{s.value}</p>
            <p className="text-xs text-brown-400 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Edit form */}
      {editing ? (
        <div className="bg-white border border-cream-200 rounded-xl p-4 space-y-3">
          <p className="text-xs font-semibold text-brown-400 uppercase tracking-wider">Edit Item</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-brown-400 mb-0.5">Name</label>
              <input value={name} onChange={e => setName(e.target.value)}
                className="w-full border border-cream-300 rounded px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-brown-300" />
            </div>
            <div>
              <label className="block text-xs text-brown-400 mb-0.5">Category</label>
              <input value={category} onChange={e => setCategory(e.target.value)}
                className="w-full border border-cream-300 rounded px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-brown-300" />
            </div>
            <div>
              <label className="block text-xs text-brown-400 mb-0.5">Needs Repair</label>
              <input type="number" min="0" value={repair} onChange={e => setRepair(e.target.value)}
                className="w-full border border-cream-300 rounded px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-brown-300" />
            </div>
            <div>
              <label className="block text-xs text-brown-400 mb-0.5">Retired</label>
              <input type="number" min="0" value={retired} onChange={e => setRetired(e.target.value)}
                className="w-full border border-cream-300 rounded px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-brown-300" />
            </div>
            <div>
              <label className="block text-xs text-brown-400 mb-0.5">Storage Location</label>
              <input value={location} onChange={e => setLocation(e.target.value)}
                className="w-full border border-cream-300 rounded px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-brown-300" />
            </div>
            <div className="relative">
              <label className="block text-xs text-brown-400 mb-0.5">Price Item Link</label>
              {linkedPriceItem ? (
                <div className="flex items-center gap-2 py-1.5">
                  <span className="text-sm text-brown-700 truncate">{linkedPriceItem.name}</span>
                  <button type="button" onClick={() => { setLinkedPriceItem(null); setPriceSearch('') }}
                    className="text-xs text-brown-300 hover:text-red-400 shrink-0">×</button>
                </div>
              ) : (
                <>
                  <input
                    value={priceSearch}
                    onChange={e => { setPriceSearch(e.target.value); setShowPriceDropdown(e.target.value.trim().length >= 1) }}
                    className="w-full border border-cream-300 rounded px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-brown-300"
                    placeholder="Search price list…"
                  />
                  {showPriceDropdown && filteredPriceItems.length > 0 && (
                    <div className="absolute z-30 top-full mt-1 left-0 right-0 bg-white border border-cream-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                      {filteredPriceItems.map(p => (
                        <button key={p.id} type="button"
                          onClick={() => { setLinkedPriceItem(p); setPriceSearch(''); setShowPriceDropdown(false) }}
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
              className="w-full border border-cream-300 rounded px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-brown-300" />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving || !name.trim() || !category.trim()}
              className="bg-brown-500 hover:bg-brown-600 text-white text-xs font-medium px-4 py-1.5 rounded-lg disabled:opacity-50 transition-colors">
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button onClick={() => { setEditing(false); setError('') }}
              className="text-xs text-brown-400 hover:text-brown-600 px-3 py-1.5 rounded-lg transition-colors">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        /* Details card */
        <div className="bg-white border border-cream-200 rounded-xl p-4 space-y-2">
          {item.storage_location && (
            <div className="flex gap-2 text-sm">
              <span className="text-brown-400 w-28 shrink-0">Location</span>
              <span className="text-brown-700">{item.storage_location}</span>
            </div>
          )}
          {item.notes && (
            <div className="flex gap-2 text-sm">
              <span className="text-brown-400 w-28 shrink-0">Notes</span>
              <span className="text-brown-700">{item.notes}</span>
            </div>
          )}
          {linkedPriceItem && (
            <div className="flex gap-2 text-sm">
              <span className="text-brown-400 w-28 shrink-0">Price item</span>
              <Link href="/settings/price-list" className="text-brown-500 hover:underline">{linkedPriceItem.name}</Link>
            </div>
          )}
          <div className="flex gap-2 text-sm">
            <span className="text-brown-400 w-28 shrink-0">Last counted</span>
            <span className={stale ? 'text-amber-600' : 'text-brown-700'}>
              {latestCount
                ? `${formatDate(latestCount.counted_at.slice(0, 10))}${latestCount.counter_name ? ` · ${latestCount.counter_name}` : ''}`
                : 'Never'
              }
              {stale && latestCount && <span className="ml-1 text-xs">(90+ days ago)</span>}
            </span>
          </div>
        </div>
      )}

      {/* Upcoming use */}
      {upcomingUse.length > 0 && (
        <div className="bg-white border border-cream-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-2.5 bg-cream-50 border-b border-cream-200">
            <p className="text-xs font-semibold text-brown-400 uppercase tracking-wider">Upcoming use</p>
          </div>
          <div className="divide-y divide-cream-100">
            {upcomingUse.map(use => (
              <div key={use.id} className="px-4 py-3 flex items-center justify-between gap-4">
                <div>
                  <Link href={`/events/${use.event_id}`} className="text-sm font-medium text-brown-700 hover:underline">
                    {use.event_name}
                  </Link>
                  <p className="text-xs text-brown-400 mt-0.5">
                    {use.charge_date
                      ? formatDate(use.charge_date)
                      : `${formatDate(use.event_start_date)} – ${formatDate(use.event_end_date)}`
                    }
                  </p>
                </div>
                {use.quantity !== null && (
                  <span className="text-sm font-medium text-brown-700 shrink-0">
                    qty {use.quantity}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Count history */}
      <div className="bg-white border border-cream-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-2.5 bg-cream-50 border-b border-cream-200">
          <p className="text-xs font-semibold text-brown-400 uppercase tracking-wider">Count history</p>
        </div>
        {counts.length === 0 ? (
          <p className="px-4 py-6 text-sm text-brown-300 text-center">No counts recorded yet.</p>
        ) : (
          <div className="divide-y divide-cream-100">
            {counts.map(c => (
              <div key={c.id} className="px-4 py-3 flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-brown-700">{c.counted_qty} {item.name.toLowerCase()}</p>
                  {c.notes && <p className="text-xs text-brown-400 mt-0.5">{c.notes}</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-brown-500">{formatDate(c.counted_at.slice(0, 10))}</p>
                  {c.counter_name && <p className="text-xs text-brown-300 mt-0.5">{c.counter_name}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
