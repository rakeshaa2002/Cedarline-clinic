import { useApi } from '@/hooks/useApi'
import { clinicApi } from '@/services/endpoints'
import type { Department } from '@/types'

/** Shared, cached clinic data used across many pages. */
export const useClinicInfo = () => useApi('clinic-info', clinicApi.info)
export const useServices = (department?: Department) =>
  useApi(`services:${department ?? 'all'}`, () => clinicApi.services(department))
export const useDoctors = (department?: Department) =>
  useApi(`doctors:${department ?? 'all'}`, () => clinicApi.doctors(department ? { department } : undefined))

type Hours = { day: string; open: string | null; close: string | null; closed: boolean }

/** "Mon–Fri 09:00–20:00 · Sat 09:00–17:00" built from the clinic's weekly schedule. */
export function hoursSummary(hours: Hours[]): string {
  const groups: { from: string; to: string; label: string }[] = []
  for (const h of hours) {
    if (h.closed) continue
    const label = `${h.open}–${h.close}`
    const last = groups.at(-1)
    if (last && last.label === label) last.to = h.day
    else groups.push({ from: h.day, to: h.day, label })
  }
  return groups
    .map((g) => `${g.from.slice(0, 3)}${g.from !== g.to ? `–${g.to.slice(0, 3)}` : ''} ${g.label}`)
    .join(' · ')
}

/** Today's opening hours (in the visitor's local week, matching the clinic's weekly schedule). */
export function todayHours(hours: { day: string; open: string | null; close: string | null; closed: boolean }[]) {
  const name = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date())
  return hours.find((h) => h.day === name)
}
