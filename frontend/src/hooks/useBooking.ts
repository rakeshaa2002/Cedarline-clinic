import { useMemo } from 'react'
import { z } from 'zod'
import { useApi } from '@/hooks/useApi'
import { bookingApi } from '@/services/endpoints'
import type { Availability, Department, Doctor } from '@/types'
import { parseDate, pyWeekday, toISODate } from '@/utils/format'

/** Bookings are in clinic time (Bengaluru), whatever the visitor's own timezone. */
const CLINIC_TZ = 'Asia/Kolkata'
export const BOOKING_WINDOW_DAYS = 60

export function clinicToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: CLINIC_TZ }).format(new Date()) // YYYY-MM-DD
}

/** The next `count` dates (from today) on which one of `doctors` consults. */
export function consultationDates(doctors: Pick<Doctor, 'consultation_days'>[], count: number): string[] {
  const days = new Set(doctors.flatMap((d) => d.consultation_days))
  const dates: string[] = []
  const cursor = parseDate(clinicToday())
  for (let i = 0; i <= BOOKING_WINDOW_DAYS && dates.length < count; i++) {
    if (days.has(pyWeekday(cursor))) dates.push(toISODate(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return dates
}

export interface MergedSlot {
  start: string // "10:30:00"
  end: string
  available: boolean
  doctors: string[] // slugs free at this time
}

/** One row per start time across doctors: free if any doctor is free ("first available doctor"). */
export function mergeSlots(availability?: Availability): MergedSlot[] {
  const byStart = new Map<string, MergedSlot>()
  for (const doctor of availability?.doctors ?? []) {
    for (const s of doctor.slots) {
      const row = byStart.get(s.start_time) ?? { start: s.start_time, end: s.end_time, available: false, doctors: [] }
      if (s.available) {
        row.available = true
        row.doctors.push(doctor.slug)
      }
      byStart.set(s.start_time, row)
    }
  }
  return [...byStart.values()].sort((a, b) => a.start.localeCompare(b.start))
}

/** Live slots for a date: for one doctor, or for every doctor in a department. Never cached. */
export function useAvailability(date: string | null, department: Department | null, doctor: string | null) {
  const key = date && (department || doctor) ? `availability:${department ?? ''}:${doctor ?? ''}:${date}` : null
  const result = useApi(
    key,
    () => bookingApi.availability({ date: date!, department: department ?? undefined, doctor: doctor ?? undefined }),
    { cache: false },
  )
  const slots = useMemo(() => mergeSlots(result.data), [result.data])
  return { ...result, slots }
}

/** Morning / afternoon / evening groups make a long slot list easy to scan. */
export function slotPeriod(start: string): 'Morning' | 'Afternoon' | 'Evening' {
  const hour = Number(start.slice(0, 2))
  return hour < 12 ? 'Morning' : hour < 16 ? 'Afternoon' : 'Evening'
}

/** Patient details, validated the same way as the API (shared by the booking page and the chat). */
export const bookingDetailsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Please enter your full name')
    .max(120, 'Name is too long')
    .regex(/^[A-Za-zÀ-ɏ][A-Za-zÀ-ɏ .'-]+$/, "Please use letters, spaces and . ' - only"),
  email: z.string().trim().min(1, 'Please enter your email').email('Please enter a valid email address'),
  phone: z
    .string()
    .trim()
    .min(7, 'Please enter a valid phone number')
    .refine((v) => /^\+?[0-9 ()-]{7,20}$/.test(v) && v.replace(/\D/g, '').length >= 7, 'Please enter a valid phone number with digits'),
  reason: z
    .string()
    .trim()
    .min(5, 'Please share brief details or symptoms (at least 5 characters)')
    .max(1000, 'Please keep it under 1000 characters'),
})

export type BookingDetails = z.infer<typeof bookingDetailsSchema>
