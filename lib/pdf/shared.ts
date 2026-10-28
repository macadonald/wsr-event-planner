import { formatTime } from '@/lib/time'
import type { TimeType } from '@/lib/types'

// Canonical department order for PDFs (CLAUDE.md spec)
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

export function taskTimeLabel(taskTime: string | null, timeType: TimeType): string {
  if (!taskTime) return 'General'
  return `${timeType === 'by' ? 'By' : 'At'} ${formatTime(taskTime)}`
}

export function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

// Shared PDF color palette
export const C = {
  brown: '#5A3A22',
  brownMid: '#7A5030',
  brownLight: '#B07B44',
  border: '#CCA882',
  borderLight: '#E8D5C0',
  bg: '#FDF6ED',
  bgSection: '#F5EDE5',
  gray: '#888888',
  grayLight: '#BBBBBB',
  white: '#FFFFFF',
} as const
