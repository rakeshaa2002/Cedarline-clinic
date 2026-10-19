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

export interface ClinicCurrentStatus {
  isOpen: boolean
  label: string
  shortLabel: string
  todayRecord?: Hours
}

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/**
 * Evaluates whether the clinic is currently operating right now based on its Indiranagar, Bengaluru
 * (Asia/Kolkata) schedule, returning live status ('Currently Open' vs 'Currently Closed') and next opening/closing hours.
 */
export function getClinicCurrentStatus(hours: Hours[], now = new Date()): ClinicCurrentStatus {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      weekday: 'long',
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    })

    const parts = formatter.formatToParts(now)
    const currentWeekday = parts.find((p) => p.type === 'weekday')?.value ?? 'Monday'
    const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0)
    const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? 0)
    const currentMinutes = hour * 60 + minute

    const todayIndex = DAYS_OF_WEEK.indexOf(currentWeekday)
    const today = hours.find((h) => h.day === currentWeekday)

    if (today && !today.closed && today.open && today.close) {
      const [openH, openM] = today.open.split(':').map(Number)
      const [closeH, closeM] = today.close.split(':').map(Number)
      const openMinutes = openH * 60 + openM
      const closeMinutes = closeH * 60 + closeM

      if (currentMinutes >= openMinutes && currentMinutes < closeMinutes) {
        return {
          isOpen: true,
          label: `Currently Open · Closes ${today.close}`,
          shortLabel: `Open now · Closes ${today.close}`,
          todayRecord: today,
        }
      }

      if (currentMinutes < openMinutes) {
        return {
          isOpen: false,
          label: `Currently Closed · Opens today ${today.open}`,
          shortLabel: `Closed now · Opens ${today.open}`,
          todayRecord: today,
        }
      }
    }

    // Clinic is closed for the rest of today or closed all day. Find the next opening time:
    let nextDayLabel = 'tomorrow'
    let nextOpenTime = '09:00'

    for (let i = 1; i <= 7; i++) {
      const nextIndex = (todayIndex + i) % 7
      const nextDayName = DAYS_OF_WEEK[nextIndex]
      const nextH = hours.find((h) => h.day === nextDayName)
      if (nextH && !nextH.closed && nextH.open) {
        nextDayLabel = i === 1 ? 'tomorrow' : nextDayName.slice(0, 3)
        nextOpenTime = nextH.open
        break
      }
    }

    return {
      isOpen: false,
      label: `Currently Closed · Opens ${nextDayLabel} ${nextOpenTime}`,
      shortLabel: `Closed now · Opens ${nextDayLabel === 'tomorrow' ? nextOpenTime : `${nextDayLabel} ${nextOpenTime}`}`,
      todayRecord: today,
    }
  } catch {
    const today = todayHours(hours)
    return {
      isOpen: !today?.closed,
      label: today && !today.closed ? `Open today ${today.open}–${today.close}` : 'Closed today',
      shortLabel: today && !today.closed ? '09:00–20:00' : 'Closed',
      todayRecord: today,
    }
  }
}

