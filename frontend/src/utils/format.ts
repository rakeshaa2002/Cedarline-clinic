import type { Department } from '@/types'

export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
export const WEEKDAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export const DEPARTMENT_LABELS: Record<Department, string> = {
  general: 'General Medicine',
  dental: 'Dental Care',
  skin: 'Skin & Dermatology',
  hair: 'Hair & Trichology',
  pediatrics: 'Paediatrics',
}

/** "14:30:00" | "14:30" -> "2:30 PM" */
export function formatTime(value: string | null | undefined): string {
  if (!value) return ''
  const [h, m] = value.split(':').map(Number)
  const suffix = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2, '0')} ${suffix}`
}

/** Parse "YYYY-MM-DD" as a local date (avoids the UTC shift of `new Date(str)`). */
export function parseDate(value: string): Date {
  const [y, m, d] = value.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function toISODate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function formatDate(value: string, opts: Intl.DateTimeFormatOptions = { dateStyle: 'medium' }): string {
  return new Intl.DateTimeFormat('en-IN', opts).format(parseDate(value))
}

export function formatLongDate(value: string): string {
  return formatDate(value, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

export function formatPrice(value: string | number | null): string | null {
  if (value === null || value === undefined) return null
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(
    Number(value),
  )
}

/** Python weekday (0 = Monday) for a JS Date. */
export function pyWeekday(date: Date): number {
  return (date.getDay() + 6) % 7
}

export function consultationDaysLabel(days: number[]): string {
  const sorted = [...days].sort((a, b) => a - b)
  const contiguous = sorted.every((d, i) => i === 0 || d === sorted[i - 1] + 1)
  if (sorted.length > 2 && contiguous) return `${WEEKDAYS_SHORT[sorted[0]]}–${WEEKDAYS_SHORT[sorted.at(-1)!]}`
  return sorted.map((d) => WEEKDAYS_SHORT[d]).join(', ')
}

export function initials(name: string): string {
  return name
    .replace(/^Dr\.?\s+/, '')
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
}

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ')
}
