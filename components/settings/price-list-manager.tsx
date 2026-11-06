'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { PriceItem, BillingSettings } from '@/lib/types'
import { createPriceItem, updatePriceItem, upsertBillingSettings, importPriceItems } from '@/app/actions/price-items'
import { formatMoney, formatUnitLabel, type ChargeUnit } from '@/lib/billing'
import type { PriceItemFormData } from '@/app/actions/price-items'

const UNITS: { value: ChargeUnit; label: string }[] = [
  { value: 'per_event',  label: 'per event' },
  { value: 'per_person', label: 'per person' },
  { value: 'each',       label: 'each' },
  { value: 'per_hour',   label: 'per hour' },
]

function blankForm(): PriceItemFormData {
  return {
    category: '', name: '', unit: 'per_person',
    dmc_price: 0, regular_price: null,
    included_people: null, additional_per_person_dmc: null, additional_per_person_regular: null,
    max_capacity: null, minimum: null, service_pct: 0, taxable: true,
    notes: null, active: true, sort_order: 0,
  }
}

function itemToForm(item: PriceItem): PriceItemFormData {
  return {
    category: item.category, name: item.name, unit: item.unit,
    dmc_price: item.dmc_price, regular_price: item.regular_price,
    included_people: item.included_people,
    additional_per_person_dmc: item.additional_per_person_dmc,
    additional_per_person_regular: item.additional_per_person_regular,
    max_capacity: item.max_capacity, minimum: item.minimum,
    service_pct: item.service_pct, taxable: item.taxable,
    notes: item.notes, active: item.active, sort_order: item.sort_order,
  }
}

function n(v: string): number | null {
  const p = parseFloat(v)
  return isNaN(p) ? null : p
}
function ni(v: string): number | null {
  const p = parseInt(v, 10)
  return isNaN(p) ? null : p
}

// ── ItemForm ──────────────────────────────────────────────────────────────────

function ItemForm({
  initial,
  categories,
  onSave,
  onCancel,
}: {
  initial: PriceItemFormData
  categories: string[]
  onSave: (data: PriceItemFormData) => Promise<void>
  onCancel: () => void
}) {
  const [form, setForm] = useState<PriceItemFormData>(initial)
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')
  const set = <K extends keyof PriceItemFormData>(k: K, v: PriceItemFormData[K]) =>
    setForm(f => ({ ...f, [k]: v }))

  async function handleSave() {
    if (!form.category.trim() || !form.name.trim()) return
    setSaving(true)
    setError('')
    try { await onSave(form) }
    catch (e: unknown) { setError(String(e)) }
    setSaving(false)
  }

  const inp = 'w-full border border-cream-300 rounded px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-brown-300'

  return (
    <div className="space-y-4 bg-cream-50 border border-cream-200 rounded-xl p-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs text-brown-400 mb-0.5">Category <span className="text-red-400">*</span></label>
          <input list="category-list" value={form.category}
            onChange={e => set('category', e.target.value)} className={inp} placeholder="e.g. Bar" />
          <datalist id="category-list">
            {categories.map(c => <option key={c} value={c} />)}
          </datalist>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs text-brown-400 mb-0.5">Item Name <span className="text-red-400">*</span></label>
          <input value={form.name} onChange={e => set('name', e.target.value)} className={inp} />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs text-brown-400 mb-0.5">Unit</label>
          <select value={form.unit} onChange={e => set('unit', e.target.value as ChargeUnit)} className={inp}>
            {UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-brown-400 mb-0.5">DMC Price ($)</label>
          <input type="number" min="0" step="0.01"
            value={form.dmc_price} onChange={e => set('dmc_price', parseFloat(e.target.value) || 0)} className={inp} />
        </div>
        <div>
          <label className="block text-xs text-brown-400 mb-0.5">Regular Price ($)</label>
          <input type="number" min="0" step="0.01" placeholder="same as DMC"
            value={form.regular_price ?? ''} onChange={e => set('regular_price', n(e.target.value))} className={inp} />
        </div>
        <div>
          <label className="block text-xs text-brown-400 mb-0.5">Service %</label>
          <input type="number" min="0" max="100" step="1"
            value={form.service_pct} onChange={e => set('service_pct', parseFloat(e.target.value) || 0)} className={inp} />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs text-brown-400 mb-0.5">Included Guests</label>
          <input type="number" min="0" placeholder="—"
            value={form.included_people ?? ''} onChange={e => set('included_people', ni(e.target.value))} className={inp} />
        </div>
        <div>
          <label className="block text-xs text-brown-400 mb-0.5">Extra/pp DMC ($)</label>
          <input type="number" min="0" step="0.01" placeholder="—"
            value={form.additional_per_person_dmc ?? ''} onChange={e => set('additional_per_person_dmc', n(e.target.value))} className={inp} />
        </div>
        <div>
          <label className="block text-xs text-brown-400 mb-0.5">Extra/pp Reg ($)</label>
          <input type="number" min="0" step="0.01" placeholder="—"
            value={form.additional_per_person_regular ?? ''} onChange={e => set('additional_per_person_regular', n(e.target.value))} className={inp} />
        </div>
        <div>
          <label className="block text-xs text-brown-400 mb-0.5">Max Capacity</label>
          <input type="number" min="0" placeholder="—"
            value={form.max_capacity ?? ''} onChange={e => set('max_capacity', ni(e.target.value))} className={inp} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-brown-400 mb-0.5">Notes</label>
          <input value={form.notes ?? ''} onChange={e => set('notes', e.target.value || null)} className={inp} />
        </div>
        <div className="flex items-end gap-4">
          <label className="flex items-center gap-1.5 cursor-pointer mb-1.5">
            <input type="checkbox" checked={form.taxable} onChange={e => set('taxable', e.target.checked)}
              className="rounded border-cream-300 text-brown-500 focus:ring-brown-300" />
            <span className="text-sm text-brown-600">Taxable</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer mb-1.5">
            <input type="checkbox" checked={form.active} onChange={e => set('active', e.target.checked)}
              className="rounded border-cream-300 text-brown-500 focus:ring-brown-300" />
            <span className="text-sm text-brown-600">Active</span>
          </label>
        </div>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button onClick={handleSave} disabled={saving || !form.category.trim() || !form.name.trim()}
          className="bg-brown-500 hover:bg-brown-600 text-white text-xs font-medium px-4 py-1.5 rounded-lg disabled:opacity-50 transition-colors">
          {saving ? 'Saving…' : 'Save Item'}
        </button>
        <button onClick={onCancel} className="text-xs text-brown-400 hover:text-brown-600 px-3 py-1.5 rounded-lg transition-colors">
          Cancel
        </button>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function PriceListManager({
  items,
  settings,
}: {
  items: PriceItem[]
  settings: BillingSettings
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [catFilter, setCatFilter]   = useState<string | null>(null)
  const [editingId, setEditingId]   = useState<string | null>(null)
  const [showAdd,   setShowAdd]     = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)
  const [settingsError, setSettingsError]   = useState('')

  // Settings form state
  const [taxPct,       setTaxPct]       = useState(settings.tax_pct.toString())
  const [taxOnService, setTaxOnService] = useState(settings.tax_on_service)
  const [markupNote,   setMarkupNote]   = useState(settings.regular_markup_note ?? '')

  const fileRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)
  const [importMsg, setImportMsg] = useState('')

  const categories = Array.from(new Set(items.map(i => i.category))).sort()
  const visible = catFilter ? items.filter(i => i.category === catFilter) : items
  const catCounts = Object.fromEntries(categories.map(c => [c, items.filter(i => i.category === c).length]))

  function refresh() { startTransition(() => router.refresh()) }

  async function handleSaveSettings() {
    setSavingSettings(true)
    setSettingsError('')
    const result = await upsertBillingSettings({
      tax_pct: parseFloat(taxPct) || 0,
      tax_on_service: taxOnService,
      regular_markup_note: markupNote.trim() || null,
    })
    setSavingSettings(false)
    if (result.error) { setSettingsError(result.error); return }
    refresh()
  }

  async function handleCreate(data: PriceItemFormData) {
    // Max sort_order in this category + 10
    const catItems = items.filter(i => i.category === data.category)
    const maxSort = catItems.reduce((m, i) => Math.max(m, i.sort_order), 0)
    const result = await createPriceItem({ ...data, sort_order: maxSort + 10 })
    if (result.error) throw new Error(result.error)
    setShowAdd(false)
    refresh()
  }

  async function handleUpdate(id: string, data: PriceItemFormData) {
    const result = await updatePriceItem(id, data)
    if (result.error) throw new Error(result.error)
    setEditingId(null)
    refresh()
  }

  async function handleToggleActive(item: PriceItem) {
    await updatePriceItem(item.id, { active: !item.active })
    refresh()
  }

  // ── CSV import ──
  function parseCsvRow(headers: string[], cols: string[]): Omit<PriceItemFormData, 'sort_order'> | null {
    const get = (name: string) => cols[headers.indexOf(name)]?.trim() ?? ''
    const nv  = (name: string): number | null => { const v = get(name); return v ? parseFloat(v) || null : null }
    const niv = (name: string): number | null => { const v = get(name); return v ? parseInt(v, 10) || null : null }
    const bv  = (name: string): boolean => ['yes','true'].includes(get(name).toLowerCase())
    const cat = get('category'); const nm = get('name'); const unit = get('unit') as ChargeUnit
    if (!cat || !nm || !unit) return null
    return {
      category: cat, name: nm, unit,
      dmc_price: parseFloat(get('dmc_price')) || 0,
      regular_price: nv('regular_price'),
      included_people: niv('included_people'),
      additional_per_person_dmc: nv('additional_per_person_dmc'),
      additional_per_person_regular: nv('additional_per_person_regular'),
      max_capacity: niv('max_capacity'),
      minimum: nv('minimum'),
      service_pct: nv('service_pct') ?? 0,
      taxable: bv('taxable'),
      notes: get('notes') || null,
      active: true,
    }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setImportMsg('')
    try {
      const text = await file.text()
      const lines = text.trim().split('\n')
      const headers = lines[0].split(',').map(h => h.trim())
      const rows = lines.slice(1)
        .filter(l => l.trim())
        .map(l => parseCsvRow(headers, l.split(',')))
        .filter(Boolean) as Omit<PriceItemFormData, 'sort_order'>[]

      if (rows.length === 0) { setImportMsg('No valid rows found in CSV.'); setImporting(false); return }
      const result = await importPriceItems(rows)
      if (result.error) { setImportMsg(`Error: ${result.error}`); }
      else { setImportMsg(`✓ Imported ${result.count} items.`); refresh() }
    } catch (err) {
      setImportMsg(`Error: ${String(err)}`)
    }
    setImporting(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="space-y-6">
      {/* Tax settings strip */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 shadow-sm">
        <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-4">Tax &amp; Service Settings</p>
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-brown-400 mb-1">Tax Rate (%)</label>
            <input type="number" min="0" max="20" step="0.1"
              value={taxPct}
              onChange={e => setTaxPct(e.target.value)}
              className="w-24 border border-cream-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brown-300"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer mb-1.5">
            <input type="checkbox" checked={taxOnService} onChange={e => setTaxOnService(e.target.checked)}
              className="rounded border-cream-300 text-brown-500 focus:ring-brown-300" />
            <span className="text-sm text-brown-600">Charge tax on service charges</span>
          </label>
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs font-medium text-brown-400 mb-1">Regular price note</label>
            <input value={markupNote} onChange={e => setMarkupNote(e.target.value)}
              placeholder="e.g. Standard retail pricing"
              className="w-full border border-cream-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brown-300"
            />
          </div>
          <div>
            <button onClick={handleSaveSettings} disabled={savingSettings}
              className="bg-brown-500 hover:bg-brown-600 text-white text-xs font-medium px-4 py-2 rounded-lg disabled:opacity-50 transition-colors mb-1.5">
              {savingSettings ? 'Saving…' : 'Save Settings'}
            </button>
          </div>
        </div>
        {settingsError && <p className="text-xs text-red-600 mt-2">{settingsError}</p>}
      </div>

      {/* Category filter chips */}
      <div className="flex gap-1.5 flex-wrap items-center">
        <button
          onClick={() => setCatFilter(null)}
          className={`text-xs px-3 py-1 rounded-full border transition-colors ${
            catFilter === null ? 'bg-brown-500 text-white border-brown-500' : 'border-cream-300 text-brown-500 hover:bg-cream-50'
          }`}
        >
          All ({items.length})
        </button>
        {categories.map(cat => (
          <button key={cat} onClick={() => setCatFilter(catFilter === cat ? null : cat)}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${
              catFilter === cat ? 'bg-brown-500 text-white border-brown-500' : 'border-cream-300 text-brown-500 hover:bg-cream-50'
            }`}>
            {cat} ({catCounts[cat]})
          </button>
        ))}
      </div>

      {/* Action bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={() => { setShowAdd(v => !v); setEditingId(null) }}
          className="bg-brown-500 hover:bg-brown-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          + Add Item
        </button>
        <label className="cursor-pointer text-sm text-brown-500 border border-cream-300 hover:bg-cream-50 px-4 py-2 rounded-lg transition-colors">
          {importing ? 'Importing…' : 'Import CSV'}
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleImport} disabled={importing} />
        </label>
        {importMsg && <span className={`text-xs ${importMsg.startsWith('✓') ? 'text-green-600' : 'text-red-600'}`}>{importMsg}</span>}
      </div>

      {/* Add form */}
      {showAdd && (
        <ItemForm
          initial={blankForm()}
          categories={categories}
          onSave={handleCreate}
          onCancel={() => setShowAdd(false)}
        />
      )}

      {/* Price list table */}
      <div className="bg-white border border-cream-200 rounded-xl shadow-sm overflow-hidden">
        {/* Desktop table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-cream-50 border-b border-cream-200">
              <tr>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-brown-400 uppercase tracking-wider">Item</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-brown-400 uppercase tracking-wider">Unit</th>
                <th className="text-right px-3 py-2.5 text-xs font-semibold text-brown-400 uppercase tracking-wider">DMC</th>
                <th className="text-right px-3 py-2.5 text-xs font-semibold text-brown-400 uppercase tracking-wider">Regular</th>
                <th className="text-center px-3 py-2.5 text-xs font-semibold text-brown-400 uppercase tracking-wider">Incl./Extra</th>
                <th className="text-center px-3 py-2.5 text-xs font-semibold text-brown-400 uppercase tracking-wider">Max</th>
                <th className="text-center px-3 py-2.5 text-xs font-semibold text-brown-400 uppercase tracking-wider">Svc%</th>
                <th className="text-center px-3 py-2.5 text-xs font-semibold text-brown-400 uppercase tracking-wider">Tax</th>
                <th className="px-3 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-100">
              {visible.map(item => (
                editingId === item.id ? (
                  <tr key={item.id}>
                    <td colSpan={9} className="px-4 py-3">
                      <ItemForm
                        initial={itemToForm(item)}
                        categories={categories}
                        onSave={data => handleUpdate(item.id, data)}
                        onCancel={() => setEditingId(null)}
                      />
                    </td>
                  </tr>
                ) : (
                  <tr key={item.id} className={`hover:bg-cream-50 transition-colors ${!item.active ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-2.5">
                      <div>
                        <p className="font-medium text-brown-700">{item.name}</p>
                        <p className="text-xs text-brown-400">{item.category}</p>
                        {item.notes && <p className="text-xs text-brown-300 mt-0.5">{item.notes}</p>}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-brown-500 whitespace-nowrap">{formatUnitLabel(item.unit)}</td>
                    <td className="px-3 py-2.5 text-right font-medium text-brown-700">${formatMoney(item.dmc_price)}</td>
                    <td className="px-3 py-2.5 text-right text-brown-500">
                      {item.regular_price != null ? `$${formatMoney(item.regular_price)}` : <span className="text-brown-200">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-center text-xs text-brown-500">
                      {item.included_people != null ? (
                        <span>
                          {item.included_people}
                          {item.additional_per_person_dmc != null && ` / +$${item.additional_per_person_dmc}`}
                        </span>
                      ) : <span className="text-brown-200">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-center text-brown-500">
                      {item.max_capacity ?? <span className="text-brown-200">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-center text-brown-500">
                      {item.service_pct > 0 ? `${item.service_pct}%` : <span className="text-brown-200">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {item.taxable
                        ? <span className="text-xs text-green-600">✓</span>
                        : <span className="text-xs text-brown-200">—</span>}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2 justify-end">
                        <button onClick={() => { setEditingId(item.id); setShowAdd(false) }}
                          className="text-xs text-brown-400 hover:text-brown-600 transition-colors">Edit</button>
                        <button onClick={() => handleToggleActive(item)}
                          className={`text-xs transition-colors ${item.active ? 'text-brown-300 hover:text-red-400' : 'text-green-500 hover:text-green-700'}`}>
                          {item.active ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              ))}
            </tbody>
          </table>
          {visible.length === 0 && (
            <p className="text-sm text-brown-300 text-center py-8">No items in this category.</p>
          )}
        </div>

        {/* Mobile cards */}
        <div className="sm:hidden divide-y divide-cream-100">
          {visible.map(item => (
            editingId === item.id ? (
              <div key={item.id} className="p-4">
                <ItemForm
                  initial={itemToForm(item)}
                  categories={categories}
                  onSave={data => handleUpdate(item.id, data)}
                  onCancel={() => setEditingId(null)}
                />
              </div>
            ) : (
              <div key={item.id} className={`p-4 ${!item.active ? 'opacity-50' : ''}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-brown-700">{item.name}</p>
                    <p className="text-xs text-brown-400">{item.category} · {formatUnitLabel(item.unit)}</p>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                      <span className="text-xs text-brown-600">DMC: ${formatMoney(item.dmc_price)}</span>
                      {item.regular_price != null && (
                        <span className="text-xs text-brown-500">Reg: ${formatMoney(item.regular_price)}</span>
                      )}
                      {item.service_pct > 0 && (
                        <span className="text-xs text-brown-400">+{item.service_pct}% svc</span>
                      )}
                    </div>
                    {item.notes && <p className="text-xs text-brown-300 mt-0.5">{item.notes}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <button onClick={() => { setEditingId(item.id); setShowAdd(false) }}
                      className="text-xs text-brown-400 hover:text-brown-600 transition-colors">Edit</button>
                    <button onClick={() => handleToggleActive(item)}
                      className={`text-xs transition-colors ${item.active ? 'text-brown-300 hover:text-red-400' : 'text-green-500 hover:text-green-700'}`}>
                      {item.active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>
              </div>
            )
          ))}
          {visible.length === 0 && (
            <p className="text-sm text-brown-300 text-center py-8">No items in this category.</p>
          )}
        </div>
      </div>
    </div>
  )
}
