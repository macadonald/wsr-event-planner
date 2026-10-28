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

type Props = {
  value: string              // 'HH:MM' or ''
  onChange: (v: string) => void
  placeholder?: string
  size?: 'sm' | 'md'        // sm = xs text/compact (inline forms), md = sm text (section forms)
  className?: string
}

export default function TimePicker({ value, onChange, placeholder = 'None', size = 'sm', className = '' }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const wrapRef = useRef<HTMLDivElement>(null)

  const label = value ? formatTime(value) : ''
  const filtered = query.trim()
    ? TIME_OPTIONS.filter(t => t.label.toLowerCase().includes(query.toLowerCase()))
    : TIME_OPTIONS

  const inputClass = size === 'md'
    ? 'w-full border border-cream-300 rounded-lg px-3 py-2 text-sm bg-cream-50 focus:outline-none focus:ring-2 focus:ring-brown-300 cursor-pointer'
    : 'w-full border border-cream-300 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brown-300 cursor-pointer'

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
    if (e.key === 'Escape') {
      setOpen(false)
      setQuery('')
      e.currentTarget.blur()
    }
  }

  function handleBlur() {
    // setTimeout lets a click/tap on an option fire before we close
    setTimeout(() => {
      if (!wrapRef.current?.contains(document.activeElement)) {
        setOpen(false)
        setQuery('')
      }
    }, 150)
  }

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <input
        type="text"
        value={open ? query : label}
        readOnly={!open}
        placeholder={placeholder}
        onFocus={handleFocus}
        onChange={handleInputChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={inputClass}
      />
      {open && (
        <div className="absolute z-50 mt-0.5 w-full min-w-[7rem] bg-white border border-cream-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
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
