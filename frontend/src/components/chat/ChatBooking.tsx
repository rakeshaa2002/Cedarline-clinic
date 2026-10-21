import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, CalendarCheck, ExternalLink, UsersRound, X } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { SlotPicker } from '@/components/site/AppointmentBookingForm'
import { DoctorPhoto } from '@/components/site/Cards'
import { Spinner } from '@/components/ui/Feedback'
import {
  bookingDetailsSchema,
  consultationDates,
  useAvailability,
  type BookingDetails,
  type MergedSlot,
} from '@/hooks/useBooking'
import { useDoctors } from '@/hooks/useClinic'
import { toApiError } from '@/services/api'
import { bookingApi } from '@/services/endpoints'
import type { BookingConfirmation, Department } from '@/types'
import { DEPARTMENT_LABELS, cn, formatDate, formatLongDate, formatPrice, formatTime } from '@/utils/format'

export interface ChatBookingStart {
  department?: Department | null
  doctorSlug?: string | null
}

const STAGES = ['department', 'doctor', 'date', 'time', 'details', 'review'] as const

const chip =
  'cursor-pointer rounded-full border border-ink-200 bg-white px-3 py-1.5 text-xs font-medium text-ink-800 transition-all hover:border-brand-400 hover:bg-brand-50 hover:text-brand-800 active:scale-95'
const input =
  'w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 focus:outline-none'

/**
 * Guided booking inside the chat: specialty → doctor → date → live slot → details → confirm,
 * without leaving the conversation. Uses the same availability API and validation as the booking page.
 */
export function ChatBooking({
  start,
  onDone,
  onCancel,
  onLeave,
}: {
  start: ChatBookingStart
  onDone: (booking: BookingConfirmation) => void
  onCancel: () => void
  onLeave: () => void
}) {
  const doctors = useDoctors()
  const [chosenDepartment, setDepartment] = useState<Department | null>(start.department ?? null)
  const [doctorSlug, setDoctorSlug] = useState<string | null | undefined>(start.doctorSlug ?? undefined) // null = any
  const [date, setDate] = useState<string | null>(null)
  const [slot, setSlot] = useState<MergedSlot | null>(null)
  const [details, setDetails] = useState<BookingDetails | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const all = useMemo(() => doctors.data ?? [], [doctors.data])
  const doctor = doctorSlug ? all.find((d) => d.slug === doctorSlug) ?? null : null
  const department = chosenDepartment ?? doctor?.department ?? null
  const deptDoctors = useMemo(() => all.filter((d) => d.department === department), [all, department])
  const dates = useMemo(() => consultationDates(doctor ? [doctor] : deptDoctors, 9), [doctor, deptDoctors])
  const availability = useAvailability(date, department, doctorSlug ?? null)

  const stage = !department
    ? 'department'
    : doctorSlug === undefined
      ? 'doctor'
      : !date
        ? 'date'
        : !slot
          ? 'time'
          : !details
            ? 'details'
            : 'review'
  const stageIndex = STAGES.indexOf(stage)

  const form = useForm<BookingDetails>({ resolver: zodResolver(bookingDetailsSchema), mode: 'onTouched' })

  const back = () => {
    setError(null)
    if (stage === 'review') setDetails(null)
    else if (stage === 'details') setSlot(null)
    else if (stage === 'time') setDate(null)
    else if (stage === 'date') setDoctorSlug(undefined)
    else if (stage === 'doctor') setDepartment(null)
  }

  const confirm = async () => {
    if (!department || !date || !slot || !details) return
    setSubmitting(true)
    setError(null)
    try {
      onDone(
        await bookingApi.book({
          department,
          doctor_slug: doctorSlug ?? null,
          appointment_date: date,
          start_time: slot.start.slice(0, 5),
          patient_name: details.name,
          patient_email: details.email,
          patient_phone: details.phone,
          reason: details.reason,
          source: 'chatbot',
        }),
      )
    } catch (err) {
      const e = toApiError(err)
      setError(e.message)
      if (e.status === 409) {
        setSlot(null)
        availability.reload()
      }
    } finally {
      setSubmitting(false)
    }
  }

  const departments = (Object.keys(DEPARTMENT_LABELS) as Department[]).filter((d) => all.some((doc) => doc.department === d))

  return (
    <div className="animate-fade-up rounded-2xl bg-white p-4 shadow-sm ring-1 ring-brand-200" role="group" aria-label="Book an appointment">
      <div className="mb-3 flex items-center gap-2">
        <span className="grid size-7 place-items-center rounded-lg bg-brand-600 text-white">
          <CalendarCheck className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-ink-900">Book in chat</p>
          <p className="text-[0.6875rem] text-ink-500">
            Step {stageIndex + 1} of {STAGES.length}
          </p>
        </div>
        <button type="button" onClick={onCancel} className="grid size-7 place-items-center rounded-full text-ink-400 hover:bg-ink-100 hover:text-ink-700" aria-label="Cancel booking">
          <X className="size-4" />
        </button>
      </div>
      <div className="mb-3 h-1 overflow-hidden rounded-full bg-ink-100" aria-hidden="true">
        <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${((stageIndex + 1) / STAGES.length) * 100}%` }} />
      </div>

      {doctors.loading && !doctors.data ? (
        <Spinner label="Loading doctors" />
      ) : stage === 'department' ? (
        <Prompt text="Which specialty do you need?">
          {departments.map((d) => (
            <button key={d} type="button" className={chip} onClick={() => setDepartment(d)}>
              {DEPARTMENT_LABELS[d]}
            </button>
          ))}
        </Prompt>
      ) : stage === 'doctor' ? (
        <Prompt text={`Who would you like to see in ${DEPARTMENT_LABELS[department!]}?`}>
          <button type="button" className={cn(chip, 'inline-flex items-center gap-1.5 border-brand-300 bg-brand-50 text-brand-800')} onClick={() => setDoctorSlug(null)}>
            <UsersRound className="size-3.5" aria-hidden="true" /> First available
          </button>
          {deptDoctors.map((d) => (
            <button key={d.slug} type="button" className={chip} onClick={() => setDoctorSlug(d.slug)}>
              {d.full_name}
              {d.consultation_fee !== null && <span className="text-ink-400"> · {formatPrice(d.consultation_fee)}</span>}
            </button>
          ))}
        </Prompt>
      ) : stage === 'date' ? (
        <Prompt text={`Pick a date${doctor ? ` with ${doctor.full_name}` : ''}:`}>
          {dates.map((d) => (
            <button key={d} type="button" className={chip} onClick={() => setDate(d)}>
              {formatDate(d, { weekday: 'short', day: 'numeric', month: 'short' })}
            </button>
          ))}
        </Prompt>
      ) : stage === 'time' ? (
        <div>
          <p className="text-sm text-ink-800">Free times on {formatLongDate(date!)}:</p>
          <SlotPicker slots={availability.slots} loading={availability.loading} selected={slot} onSelect={setSlot} compact />
        </div>
      ) : stage === 'details' ? (
        <form noValidate onSubmit={form.handleSubmit(setDetails)} className="space-y-2">
          <p className="text-sm text-ink-800">Your details for the booking:</p>
          {(
            [
              ['name', 'Full name', 'text', 'name'],
              ['phone', 'Phone (WhatsApp)', 'tel', 'tel'],
              ['email', 'Email (for confirmation)', 'email', 'email'],
            ] as const
          ).map(([name, label, type, autoComplete]) => (
            <div key={name}>
              <input {...form.register(name)} type={type} autoComplete={autoComplete} placeholder={label} aria-label={label} className={input} />
              {form.formState.errors[name] && <p className="mt-0.5 text-[0.6875rem] text-red-700">{form.formState.errors[name]?.message}</p>}
            </div>
          ))}
          <div>
            <textarea {...form.register('reason')} rows={2} placeholder="Reason for visit / main symptoms" aria-label="Reason for visit" className={cn(input, 'resize-none')} />
            {form.formState.errors.reason && <p className="mt-0.5 text-[0.6875rem] text-red-700">{form.formState.errors.reason.message}</p>}
          </div>
          <button type="submit" className="w-full rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white hover:bg-brand-600">
            Review booking
          </button>
        </form>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-3 rounded-xl bg-brand-50/60 p-3">
            {doctor ? (
              <DoctorPhoto doctor={doctor} className="size-11 shrink-0 rounded-lg text-sm" />
            ) : (
              <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-brand-100 text-brand-700">
                <UsersRound className="size-5" aria-hidden="true" />
              </span>
            )}
            <div className="min-w-0 text-xs text-ink-600">
              <p className="truncate text-sm font-semibold text-ink-900">{doctor?.full_name ?? 'First available doctor'}</p>
              <p>{DEPARTMENT_LABELS[department!]}</p>
              <p className="font-semibold text-brand-800">
                {formatDate(date!, { weekday: 'short', day: 'numeric', month: 'short' })} · {formatTime(slot!.start)}
              </p>
            </div>
          </div>
          <p className="text-xs text-ink-600">
            For <strong>{details!.name}</strong> · {details!.phone} · {details!.email}
          </p>
          <button
            type="button"
            disabled={submitting}
            onClick={() => void confirm()}
            className="w-full rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-600 disabled:opacity-60"
          >
            {submitting ? 'Reserving…' : 'Confirm booking'}
          </button>
        </div>
      )}

      {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800">{error}</p>}

      <div className="mt-3 flex items-center justify-between border-t border-ink-100 pt-2.5 text-xs">
        {stageIndex > 0 && !(stage === 'doctor' && start.department) ? (
          <button type="button" onClick={back} className="inline-flex items-center gap-1 font-semibold text-ink-500 hover:text-ink-800">
            <ArrowLeft className="size-3.5" aria-hidden="true" /> Back
          </button>
        ) : (
          <span />
        )}
        <Link
          to={doctorSlug ? `/appointments?doctor=${doctorSlug}#book` : '/appointments#book'}
          onClick={onLeave}
          className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:underline"
        >
          Full booking page <ExternalLink className="size-3" aria-hidden="true" />
        </Link>
      </div>
    </div>
  )
}

function Prompt({ text, children }: { text: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-sm text-ink-800">{text}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">{children}</div>
    </div>
  )
}
