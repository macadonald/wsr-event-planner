'use client'

import { useState, useEffect } from 'react'
import type { Department } from '@/lib/types'
import { todayInPhoenix } from '@/lib/time'
import { shiftDate } from '@/lib/events'

function thisWeek(): { from: string; to: string } {
  const today = todayInPhoenix()
  const [y, m, d] = today.split('-').map(Number)
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay()
  const mondayOffset = dow === 0 ? -6 : 1 - dow
  const sundayOffset = dow === 0 ? 0 : 7 - dow
  return { from: shiftDate(today, mondayOffset), to: shiftDate(today, sundayOffset) }
}

function nextWeek(): { from: string; to: string } {
  const { from, to } = thisWeek()
  return { from: shiftDate(from, 7), to: shiftDate(to, 7) }
}

export default function RunSheetForm({ departments }: { departments: Department[] }) {
  const week = thisWeek()
  const [selectedDeptIds, setSelectedDeptIds] = useState<Set<string>>(new Set())
  const [fromDate, setFromDate] = useState(week.from)
  const [toDate, setToDate] = useState(week.to)
  const [runLayout, setRunLayout] = useState<'paged' | 'combined'>('paged')
  const [pdfStyle, setPdfStyle] = useState<'classic' | 'ledger'>('ledger')

  useEffect(() => {
    const stored = localStorage.getItem('wsr-pdf-style')
    if (stored === 'classic' || stored === 'ledger') setPdfStyle(stored)
  }, [])

  function handleStyleChange(s: 'classic' | 'ledger') {
    setPdfStyle(s)
    localStorage.setItem('wsr-pdf-style', s)
  }

  const allChecked = departments.every(d => selectedDeptIds.has(d.id))
  const noneChecked = selectedDeptIds.size === 0
  const multipleSelected = selectedDeptIds.size >= 2

  function toggleSelectAll() {
    if (allChecked) {
      setSelectedDeptIds(new Set())
    } else {
      setSelectedDeptIds(new Set(departments.map(d => d.id)))
    }
  }

  function toggleDept(id: string) {
    const next = new Set(selectedDeptIds)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    setSelectedDeptIds(next)
  }

  function generatePdf() {
    const depts = Array.from(selectedDeptIds).join(',')
    const layout = multipleSelected ? runLayout : 'paged'
    const url = `/api/pdf/run-sheet?depts=${depts}&from=${fromDate}&to=${toDate}&layout=${layout}&style=${pdfStyle}`
    window.open(url, '_blank')
  }

  const inputClass = 'w-full border border-cream-300 rounded-lg px-3 py-2 text-sm bg-cream-50 focus:outline-none focus:ring-2 focus:ring-brown-300'

  return (
    <div className="bg-white border border-cream-200 rounded-xl p-6 shadow-sm space-y-5">

      {/* Departments */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-xs font-medium text-brown-400">Departments</label>
          <button
            type="button"
            onClick={toggleSelectAll}
            className="text-xs text-brown-400 hover:text-brown-600 transition-colors"
          >
            {allChecked ? 'Deselect all' : 'Select all'}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-y-1.5 gap-x-4">
          {departments.map(d => (
            <label key={d.id} className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={selectedDeptIds.has(d.id)}
                onChange={() => toggleDept(d.id)}
                className="rounded border-cream-300 text-brown-500 focus:ring-brown-300 flex-shrink-0"
              />
              <span
                className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: d.color }}
              />
              <span className="text-sm text-brown-700 truncate">{d.name}</span>
            </label>
          ))}
        </div>
        {noneChecked && (
          <p className="text-xs text-red-400 mt-1.5">Select at least one department.</p>
        )}
      </div>

      {/* Layout toggle — only shown when 2+ selected */}
      {multipleSelected && (
        <div>
          <label className="block text-xs font-medium text-brown-400 mb-1.5">Layout</label>
          <div className="flex rounded border border-cream-300 overflow-hidden text-xs w-fit">
            {(['paged', 'combined'] as const).map(opt => (
              <button
                key={opt}
                type="button"
                onClick={() => setRunLayout(opt)}
                className={`px-3 py-1.5 transition-colors ${
                  runLayout === opt ? 'bg-brown-500 text-white' : 'bg-white text-brown-500 hover:bg-cream-50'
                }`}
              >
                {opt === 'paged' ? 'One per page' : 'Combined'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Date range */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-medium text-brown-400">Date Range</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { const w = thisWeek(); setFromDate(w.from); setToDate(w.to) }}
              className="text-xs text-brown-400 hover:text-brown-600 transition-colors"
            >
              This week
            </button>
            <span className="text-xs text-brown-200">·</span>
            <button
              type="button"
              onClick={() => { const w = nextWeek(); setFromDate(w.from); setToDate(w.to) }}
              className="text-xs text-brown-400 hover:text-brown-600 transition-colors"
            >
              Next week
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-brown-300 mb-1">From</label>
            <input
              type="date"
              value={fromDate}
              onChange={e => { setFromDate(e.target.value); if (e.target.value > toDate) setToDate(e.target.value) }}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs text-brown-300 mb-1">To</label>
            <input
              type="date"
              value={toDate}
              min={fromDate}
              onChange={e => setToDate(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* Style selector + Print button */}
      <div className="flex items-center justify-between">
        <div className="flex rounded border border-cream-300 overflow-hidden text-xs">
          {(['ledger', 'classic'] as const).map(opt => (
            <button
              key={opt}
              type="button"
              onClick={() => handleStyleChange(opt)}
              className={`px-2 py-1 transition-colors ${
                pdfStyle === opt ? 'bg-brown-500 text-white' : 'bg-white text-brown-500 hover:bg-cream-50'
              }`}
            >
              {opt === 'ledger' ? 'Ranch Ledger' : 'Classic'}
            </button>
          ))}
        </div>

        <button
          onClick={generatePdf}
          disabled={noneChecked}
          className="bg-brown-500 hover:bg-brown-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
        >
          Print →
        </button>
      </div>

      <p className="text-xs text-brown-300 text-center">
        Opens in a new tab — use your browser&apos;s print dialog to print or save.
      </p>
    </div>
  )
}
