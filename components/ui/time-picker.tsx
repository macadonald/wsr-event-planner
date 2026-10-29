'use client'

import { useState, useRef } from 'react'
import { formatTime } from '@/lib/time'

function buildTimes(): { value: string; label: string }[] {
  const result: { value: string; label: string }[] = []
  for (let h = 5; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      const hh = String(h).padStart(2, '0')
      const mm = String(m).padStart(2, '0')
      const value = `${hh}:${mm}`
      result.push({ value, label: formatTime(value) })
    }
  }
  return result
}

const TIME_OPTIONS = buildTimes()

function stepTime(value: string, direction: 1 | -1): string {
  if (!value) return direction > 0 ? '08:00' : '17:00'
  const idx = TIME_OPTIONS.findIndex(t => t.value === value)
  if (idx === -1) {
    // Value not in list; find nearest
    const [h, m] = value.split(':').map(Number)
    const target = h * 60 + m
    let best = 0
    let bestDist = Infinity
    TIME_OPTIONS.forEach((t, i) => {
      const [th, tm] = t.value.split(':').map(Number)
      const dist = Math.abs(th * 60 + tm - target)
      if (dist < bestDist) { bestDist = dist; best = i }
    })
    const next = best + direction
    if (next < 0) return TIME_OPTIONS[0].value
    if (next >= TIME_OPTIONS.length) return TIME_OPTIONS[TIME_OPTIONS.length - 1].value
    return TIME_OPTIONS[next].value
  }
  const next = idx + direction
  if (next < 0) return TIME_OPTIONS[0].value
  if (next >= TIME_OPTIONS.length) return TIME_OPTIONS[TIME_OPTIONS.length - 1].value
  return TIME_OPTIONS[next].value
}

function parseQuery(q: string): { hour: number | null; minute: number | null; forceAm: boolean; forcePm: boolean } {
  const clean = q.trim().toLowerCase()
  if (!clean) return { hour: null, minute: null, forceAm: false, forcePm: false }

  let rest = clean
  let forceAm = false
  let forcePm = false

  if (rest.endsWith('am')) { forceAm = true; rest = rest.slice(0, -2).trim() }
  else if (rest.endsWith('pm')) { forcePm = true; rest = rest.slice(0, -2).trim() }
  else if (rest.endsWith('a')) { forceAm = true; rest = rest.slice(0, -1).trim() }
  else if (rest.endsWith('p')) { forcePm = true; rest = rest.slice(0, -1).trim() }

  rest = rest.replace(/[:\s]/g, '')
  if (!rest) return { hour: null, minute: null, forceAm, forcePm }

  let hour: number | null = null
  let minute: number | null = null

  if (rest.length <= 2) {
    hour = parseInt(rest)
    minute = null
  } else if (rest.length === 3) {
    hour = parseInt(rest[0])
    minute = parseInt(rest.slice(1))
  } else if (rest.length === 4) {
    hour = parseInt(rest.slice(0, 2))
    minute = parseInt(rest.slice(2))
  }

  if (hour === null || isNaN(hour) || hour < 0 || hour > 12) return { hour: null, minute: null, forceAm, forcePm }
  if (minute !== null && (isNaN(minute) || minute < 0 || minute > 59)) return { hour: null, minute: null, forceAm, forcePm }

  return { hour, minute, forceAm, forcePm }
}

function filterTimes(query: string): { value: string; label: string }[] {
  if (!query.trim()) return TIME_OPTIONS

  const { hour, minute, forceAm, forcePm } = parseQuery(query)

  if (hour === null) {
    return TIME_OPTIONS.filter(t => t.label.toLowerCase().includes(query.toLowerCase()))
  }

  const amMatches = TIME_OPTIONS.filter(t => {
    const [h, m] = t.value.split(':').map(Number)
    if (h >= 12) return false
    const displayHour = h === 0 ? 12 : h
    if (displayHour !== hour) return false
    return minute === null || m === minute
  })

  const pmMatches = TIME_OPTIONS.filter(t => {
    const [h, m] = t.value.split(':').map(Number)
    if (h < 12) return false
    const displayHour = h === 12 ? 12 : h - 12
    if (displayHour !== hour) return false
    return minute === null || m === minute
  })

  if (forceAm) return amMatches
  if (forcePm) return pmMatches

  // 1-4: PM default; 5-11 and 12: AM first (12=noon, still show PM first)
  if (hour >= 1 && hour <= 4) return [...pmMatches, ...amMatches]
  if (hour === 12) return [...pmMatches, ...amMatches]
  return [...amMatches, ...pmMatches]
}

type Props = {
  value: string              // 'HH:MM' or ''
  onChange: (v: string) => void
  placeholder?: string
  size?: 'sm' | 'md'
  className?: string
}

export default function TimePicker({ value, onChange, placeholder = 'None', size = 'sm', className = '' }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const wrapRef = useRef<HTMLDivElement>(null)

  const label = value ? formatTime(value) : ''
  const filtered = filterTimes(query)

  const inputClass = size === 'md'
    ? 'flex-1 border border-cream-300 rounded-lg px-3 py-2 text-sm bg-cream-50 focus:outline-none focus:ring-2 focus:ring-brown-300 cursor-pointer'
    : 'flex-1 border border-cream-300 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brown-300 cursor-pointer'

  const btnClass = size === 'md'
    ? 'px-1.5 py-2 text-brown-400 hover:text-brown-600 border border-cream-300 bg-cream-50 text-sm leading-none transition-colors'
    : 'px-1 py-1 text-brown-400 hover:text-brown-600 border border-cream-300 bg-white text-xs leading-none transition-colors'

  function select(v: string) {
    onChange(v)
    setOpen(false)
    setQuery('')
  }

  function handleFocus() {
    setOpen(true)
    setQuery('')
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (filtered.length > 0) select(filtered[0].value)
      else if (query === '') select('')
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      onChange(stepTime(value, -1))
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      onChange(stepTime(value, 1))
    } else if (e.key === 'Escape') {
      setOpen(false)
      setQuery('')
      e.currentTarget.blur()
    }
  }

  function handleBlur() {
    setTimeout(() => {
      if (!wrapRef.current?.contains(document.activeElement)) {
        setOpen(false)
        setQuery('')
      }
    }, 150)
  }

  return (
    <div ref={wrapRef} className={`relative flex gap-0 ${className}`}>
      <input
        type="text"
        value={open ? query : label}
        readOnly={!open}
        placeholder={placeholder}
        onFocus={handleFocus}
        onChange={handleInputChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={`${inputClass} rounded-r-none`}
      />
      <button
        type="button"
        tabIndex={-1}
        onMouseDown={e => { e.preventDefault(); onChange(stepTime(value, -1)) }}
        className={`${btnClass} border-l-0`}
        aria-label="Earlier"
      >
        ▲
      </button>
      <button
        type="button"
        tabIndex={-1}
        onMouseDown={e => { e.preventDefault(); onChange(stepTime(value, 1)) }}
        className={`${btnClass} border-l-0 rounded-r`}
        aria-label="Later"
      >
        ▼
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-0.5 left-0 w-full min-w-[7rem] bg-white border border-cream-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          <button
            type="button"
            tabIndex={0}
            onClick={() => select('')}
            className="w-full text-left px-3 py-1.5 text-xs text-brown-300 hover:bg-cream-50"
          >
            — None —
          </button>
          {filtered.map(t => (
            <button
              key={t.value}
              type="button"
              tabIndex={0}
              onClick={() => select(t.value)}
              className={`w-full text-left px-3 py-1.5 text-xs hover:bg-cream-50 ${
                t.value === value ? 'font-semibold text-brown-700 bg-cream-50' : 'text-brown-600'
              }`}
            >
              {t.label}
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="px-3 py-2 text-xs text-brown-300">No match</p>
          )}
        </div>
      )}
    </div>
  )
}
