'use client'

import { useState } from 'react'
import type { Department } from '@/lib/types'
import { todayInPhoenix } from '@/lib/time'
import { shiftDate } from '@/lib/events'

function thisWeek(): { from: string; to: string } {
  const today = todayInPhoenix()
  const [y, m, d] = today.split('-').map(Number)
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay() // 0=Sun
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
  const [deptId, setDeptId] = useState('all')
  const [fromDate, setFromDate] = useState(week.from)
  const [toDate, setToDate] = useState(week.to)

  function setWeek(range: { from: string; to: string }) {
    setFromDate(range.from)
    setToDate(range.to)
  }

  function generatePdf() {
    const url = `/api/pdf/run-sheet?dept=${deptId}&from=${fromDate}&to=${toDate}`
    window.open(url, '_blank')
  }

  const inputClass = 'w-full border border-cream-300 rounded-lg px-3 py-2 text-sm bg-cream-50 focus:outline-none focus:ring-2 focus:ring-brown-300'

  return (
    <div className="bg-white border border-cream-200 rounded-xl p-6 shadow-sm space-y-5">

      <div>
        <label className="block text-xs font-medium text-brown-400 mb-1">Department</label>
        <select value={deptId} onChange={e => setDeptId(e.target.value)} className={inputClass}>
          <option value="all">All Departments (one page each)</option>
          {departments.map(d => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-medium text-brown-400">Date Range</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setWeek(thisWeek())}
              className="text-xs text-brown-400 hover:text-brown-600 transition-colors"
            >
              This week
            </button>
            <span className="text-xs text-brown-200">·</span>
            <button
              type="button"
              onClick={() => setWeek(nextWeek())}
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

      <button
        onClick={generatePdf}
        className="w-full bg-brown-500 hover:bg-brown-600 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
      >
        Generate PDF →
      </button>

      <p className="text-xs text-brown-300 text-center">
        Opens in a new tab — use your browser&apos;s print dialog to print or save.
      </p>
    </div>
  )
}
