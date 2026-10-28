import { formatTime } from '@/lib/time'
import type { TimeType } from '@/lib/types'

// ── dept PDF order (CLAUDE.md spec) ─────────────────────────────────────────
export const PDF_DEPT_ORDER = [
  'Set-Up', 'Audio Visual', 'Front Desk', 'Housekeeping',
  'Maintenance', 'Kitchen', 'Activities', 'Corral', 'Bar',
]

export function sortDeptsByPdfOrder<T extends { name: string }>(depts: T[]): T[] {
  return [...depts].sort((a, b) => {
    const ai = PDF_DEPT_ORDER.indexOf(a.name)
    const bi = PDF_DEPT_ORDER.indexOf(b.name)
    if (ai === -1 && bi === -1) return a.name.localeCompare(b.name)
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })
}

// ── color helpers ────────────────────────────────────────────────────────────

/** Parse hex to [r,g,b] 0-255 */
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ]
}

function toHex(r: number, g: number, b: number): string {
  return `#${Math.round(r).toString(16).padStart(2, '0')}${Math.round(g).toString(16).padStart(2, '0')}${Math.round(b).toString(16).padStart(2, '0')}`
}

/** Darken a hex color by multiplying each channel by `factor` (0–1). */
export function darken(hex: string, factor: number): string {
  const [r, g, b] = hexToRgb(hex)
  return toHex(r * factor, g * factor, b * factor)
}

/**
 * Mix hex color with white at `strength` (0 = all white, 1 = full color).
 * Useful for creating light background tints.
 */
export function tint(hex: string, strength: number): string {
  const [r, g, b] = hexToRgb(hex)
  return toHex(255 + (r - 255) * strength, 255 + (g - 255) * strength, 255 + (b - 255) * strength)
}

/**
 * Return the header band color for a department — darkens light colors so
 * white text always has adequate contrast.
 */
export function bandColor(hex: string): string {
  const [r, g, b] = hexToRgb(hex)
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return lum > 0.5 ? darken(hex, 0.72) : hex
}

// ── shared palette ───────────────────────────────────────────────────────────
export const C = {
  brown: '#5A3A22',
  brownMid: '#7A5030',
  border: '#C8A882',
  borderFaint: '#E5D5BC',
  body: '#1E1208',       // near-black for maximum readability
  label: '#8B6B4A',      // section labels
  small: '#9A8070',      // meta / updated-by text
  note: '#777777',       // task notes
  white: '#FFFFFF',
  stripeOdd: '#F9F5F0',  // zebra odd rows (no dept color, just warm off-white)
} as const

// ── type scale & spacing ────────────────────────────────────────────────────
export const T = {
  brandName: 11,
  eventName: 14,
  secLabel: 7,
  body: 9,
  small: 7.5,
  note: 7,
} as const

export const SP = {
  pagePadX: 34,
  pagePadY: 22,
  sectionGap: 8,
  ruleGap: 4,
  rowPadV: 2,
  cellPadH: 7,
  timeColW: 56,   // fixed-width time column in task rows
  deptBandH: 13,  // height of dept header band (padding included)
} as const

// ── misc helpers ─────────────────────────────────────────────────────────────
export function taskTimeLabel(taskTime: string | null, timeType: TimeType): string {
  if (!taskTime) return 'General'
  return `${timeType === 'by' ? 'By' : 'At'} ${formatTime(taskTime)}`
}

export function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}
