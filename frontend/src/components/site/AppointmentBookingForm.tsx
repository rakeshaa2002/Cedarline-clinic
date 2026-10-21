import { zodResolver } from '@hookform/resolvers/zod'
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  CalendarPlus,
  CheckCircle2,
  Clock,
  Pencil,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  User,
  UsersRound,
} from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { DoctorPhoto } from '@/components/site/Cards'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Feedback'
import { Field, Input, Textarea } from '@/components/ui/Form'
import { Card } from '@/components/ui/Layout'
import { useToast } from '@/components/ui/Toast'
import { WhatsAppIcon } from '@/components/ui/WhatsAppIcon'
import { bookingDetailsSchema, consultationDates, slotPeriod, useAvailability, type BookingDetails as Details, type MergedSlot } from '@/hooks/useBooking'
import { useClinicInfo, useDoctors } from '@/hooks/useClinic'
import { toApiError } from '@/services/api'
import { bookingApi } from '@/services/endpoints'
import type { BookingConfirmation, Department, Doctor } from '@/types'
import { DEPARTMENT_LABELS, cn, consultationDaysLabel, formatDate, formatLongDate, formatPrice, formatTime } from '@/utils/format'

type Step = 1 | 2 | 3 | 4

const STEPS: { n: Step; label: string; icon: typeof Stethoscope }[] = [
  { n: 1, label: 'Specialist', icon: Stethoscope },
  { n: 2, label: 'Date & time', icon: Clock },
  { n: 3, label: 'Your details', icon: User },
  { n: 4, label: 'Confirm', icon: CheckCircle2 },
]

interface AppointmentBookingFormProps {
  initialDoctorSlug?: string | null
  selectedDoctor?: Doctor | null
  onClearDoctor?: () => void
}

function googleCalendarUrl(b: BookingConfirmation, clinicName: string, address: string) {
  const day = b.appointment_date.replaceAll('-', '')
  const hhmmss = (t: string) => t.replaceAll(':', '').padEnd(6, '0').slice(0, 6)
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `${clinicName}: ${b.doctor.full_name}`,
    dates: `${day}T${hhmmss(b.start_time)}/${day}T${hhmmss(b.end_time)}`,
    ctz: 'Asia/Kolkata',
    details: `Booking reference ${b.reference}. Awaiting confirmation from the front desk.`,
    location: address,
  })
  return `https://calendar.google.com/calendar/render?${params}`
}

/**
 * Multi-step booking engine: specialist → live slot → details → review. The slot is held the moment
 * the patient confirms (status "pending"); the front desk then confirms it by email with a calendar invite.
 */
export function AppointmentBookingForm({ initialDoctorSlug, selectedDoctor, onClearDoctor }: AppointmentBookingFormProps) {
  const { data: clinic } = useClinicInfo()
  const doctors = useDoctors()
  const toast = useToast()

  const [step, setStep] = useState<Step>(1)
  const [department, setDepartment] = useState<Department | null>(null)
  const [doctorSlug, setDoctorSlug] = useState<string | null>(null) // null = first available
  const [date, setDate] = useState<string | null>(null)
  const [slot, setSlot] = useState<MergedSlot | null>(null)
  const [details, setDetails] = useState<Details | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [confirmed, setConfirmed] = useState<BookingConfirmation | null>(null)

  const form = useForm<Details>({
    resolver: zodResolver(bookingDetailsSchema),
    defaultValues: { name: '', email: '', phone: '', reason: '' },
    mode: 'onTouched',
  })

  // A doctor chosen elsewhere on the page (or via ?doctor=slug) jumps straight to picking a time.
  const preselected = selectedDoctor ?? doctors.data?.find((d) => d.slug === initialDoctorSlug) ?? null
  const [appliedPreselect, setAppliedPreselect] = useState<Doctor | null>(null)
  if (preselected !== appliedPreselect) {
    setAppliedPreselect(preselected)
    if (preselected) {
      setDepartment(preselected.department)
      setDoctorSlug(preselected.slug)
      setDate(null)
      setSlot(null)
      setConfirmed(null)
      setStep(2)
    }
  }

  const departments = useMemo(() => {
    const counts = new Map<Department, number>()
    for (const d of doctors.data ?? []) counts.set(d.department, (counts.get(d.department) ?? 0) + 1)
    return (Object.keys(DEPARTMENT_LABELS) as Department[]).filter((d) => counts.has(d)).map((d) => ({ id: d, count: counts.get(d)! }))
  }, [doctors.data])
  const deptDoctors = useMemo(
    () => (doctors.data ?? []).filter((d) => d.department === department),
    [doctors.data, department],
  )
  const doctor = deptDoctors.find((d) => d.slug === doctorSlug) ?? null
  const dates = useMemo(() => consultationDates(doctor ? [doctor] : deptDoctors, 14), [doctor, deptDoctors])
  const availability = useAvailability(step === 2 ? date : null, department, doctorSlug)

  const chooseDepartment = (d: Department) => {
    setDepartment(d)
    setDoctorSlug(null)
    setDate(null)
    setSlot(null)
  }
  const chooseDoctor = (slug: string | null) => {
    setDoctorSlug(slug)
    setDate(null)
    setSlot(null)
    setStep(2)
  }

  const submit = async () => {
    if (!department || !date || !slot || !details) return
    setSubmitting(true)
    try {
      const booking = await bookingApi.book({
        department,
        doctor_slug: doctorSlug,
        appointment_date: date,
        start_time: slot.start.slice(0, 5),
        patient_name: details.name,
        patient_email: details.email,
        patient_phone: details.phone,
        reason: details.reason,
        source: 'website',
      })
      setConfirmed(booking)
      toast.success('Slot reserved', `Reference ${booking.reference}. We'll email you once it's confirmed.`)
    } catch (err) {
      const e = toApiError(err)
      if (e.status === 409) {
        // Someone took the slot while the patient was typing: back to the (refreshed) slot list.
        setSlot(null)
        setStep(2)
        availability.reload()
      }
      toast.error('Booking not completed', e.message)
    } finally {
      setSubmitting(false)
    }
  }

  const reset = () => {
    setConfirmed(null)
    setStep(1)
    setDepartment(null)
    setDoctorSlug(null)
    setDate(null)
    setSlot(null)
    setDetails(null)
    form.reset()
    onClearDoctor?.()
  }

  if (confirmed) {
    const address = clinic ? `${clinic.address_line}, ${clinic.city}` : ''
    return (
      <div id="book" className="scroll-mt-24">
        <Card className="overflow-hidden border-2 border-emerald-500/30 bg-gradient-to-b from-emerald-50/40 via-white to-white p-6 shadow-lift sm:p-10">
          <div className="mx-auto max-w-2xl text-center">
            <div className="inline-grid size-16 place-items-center rounded-2xl bg-emerald-600 text-white shadow-md">
              <CheckCircle2 className="size-8" aria-hidden="true" />
            </div>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-amber-100 px-3.5 py-1 text-xs font-bold text-amber-800">
              <span className="size-2 animate-pulse rounded-full bg-amber-500" /> Slot reserved · awaiting confirmation
            </div>
            <h3 className="mt-3 text-2xl font-bold text-ink-900 sm:text-3xl">Your time is held</h3>
            <p className="mt-2 text-sm text-ink-600 sm:text-base">
              The front desk will confirm shortly. You'll get an email at <strong>{confirmed.patient_email}</strong> with a
              calendar invite once it's confirmed.
            </p>

            <div className="mt-6 rounded-2xl border border-emerald-200 bg-white p-5 text-left shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-100 pb-3">
                <span className="text-xs font-semibold tracking-wider text-ink-500 uppercase">Booking reference</span>
                <span className="font-mono text-lg font-bold text-brand-800">{confirmed.reference}</span>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <DoctorPhoto doctor={confirmed.doctor} className="size-14 rounded-xl text-lg" />
                <div>
                  <p className="font-semibold text-ink-900">{confirmed.doctor.full_name}</p>
                  <p className="text-sm text-ink-500">
                    {confirmed.doctor.specialization} · {DEPARTMENT_LABELS[confirmed.department]}
                  </p>
                </div>
              </div>
              <dl className="mt-4 grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-xs font-medium text-ink-400">Date</dt>
                  <dd className="font-semibold text-ink-900">{formatLongDate(confirmed.appointment_date)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-ink-400">Time</dt>
                  <dd className="font-semibold text-ink-900">
                    {formatTime(confirmed.start_time)} – {formatTime(confirmed.end_time)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-ink-400">Consultation fee</dt>
                  <dd className="font-semibold text-ink-900">{formatPrice(confirmed.consultation_fee) ?? 'At the front desk'}</dd>
                </div>
              </dl>
            </div>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:flex-wrap">
              {clinic && (
                <a
                  href={`https://wa.me/${(clinic.whatsapp || clinic.phone).replace(/\D/g, '')}?text=${encodeURIComponent(
                    `Hello Cedarline Clinic, I just booked online (Ref: ${confirmed.reference}) with ${confirmed.doctor.full_name} on ${formatDate(confirmed.appointment_date)} at ${formatTime(confirmed.start_time)}. Please confirm my slot.`,
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-6 py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#20bd5a] sm:w-auto"
                >
                  <WhatsAppIcon className="size-5" /> Fast-track on WhatsApp
                </a>
              )}
              <a
                href={googleCalendarUrl(confirmed, clinic?.name ?? 'Cedarline Clinic', address)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-ink-200 bg-white px-6 py-3 text-sm font-semibold text-ink-800 transition-all hover:border-brand-300 hover:bg-brand-50 sm:w-auto"
              >
                <CalendarPlus className="size-4.5" aria-hidden="true" /> Add to Google Calendar
              </a>
              <Button variant="outline" size="lg" icon={<RotateCcw className="size-4" />} onClick={reset}>
                Book another
              </Button>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div id="book" className="scroll-mt-24">
      <Card className="overflow-hidden border border-brand-200/90 bg-white shadow-lift">
        <div className="border-b border-brand-100 bg-gradient-to-r from-brand-50/80 via-white to-brand-50/40 p-6 sm:p-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-brand-100/80 px-3 py-1 text-xs font-bold text-brand-800">
            <Calendar className="size-3.5" aria-hidden="true" /> Real-time online booking
          </div>
          <h3 className="mt-2 text-2xl font-bold text-ink-900 sm:text-3xl">Book an appointment</h3>
          <p className="mt-1 text-sm text-ink-600 sm:text-base">
            Pick a specialist and a free slot. Your time is held instantly and confirmed by email.
          </p>

          <ol className="mt-6 grid grid-cols-4 gap-2" aria-label="Booking progress">
            {STEPS.map(({ n, label, icon: Icon }) => {
              const done = n < step
              const current = n === step
              return (
                <li key={n}>
                  <button
                    type="button"
                    disabled={n > step}
                    onClick={() => setStep(n)}
                    aria-current={current ? 'step' : undefined}
                    className="group flex w-full flex-col items-center gap-1.5 disabled:cursor-default"
                  >
                    <span
                      className={cn(
                        'grid size-9 place-items-center rounded-full border-2 transition-colors',
                        current && 'border-brand-600 bg-brand-600 text-white',
                        done && 'border-brand-600 bg-brand-50 text-brand-700 group-hover:bg-brand-100',
                        !current && !done && 'border-ink-200 bg-white text-ink-400',
                      )}
                    >
                      {done ? <CheckCircle2 className="size-4.5" aria-hidden="true" /> : <Icon className="size-4" aria-hidden="true" />}
                    </span>
                    <span className={cn('text-center text-[0.6875rem] font-semibold sm:text-xs', current ? 'text-brand-800' : 'text-ink-500')}>
                      {label}
                    </span>
                  </button>
                </li>
              )
            })}
          </ol>
        </div>

        <div className="p-6 sm:p-8">
          {/* Step 1 — specialty and doctor */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-bold text-ink-900">Which specialty do you need?</h4>
                {doctors.loading && !doctors.data ? (
                  <div className="mt-4 flex justify-center">
                    <Spinner label="Loading specialists" />
                  </div>
                ) : (
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                    {departments.map(({ id, count }) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => chooseDepartment(id)}
                        aria-pressed={department === id}
                        className={cn(
                          'rounded-xl border px-3 py-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-sm',
                          department === id ? 'border-brand-600 bg-brand-50 ring-2 ring-brand-500/20' : 'border-ink-200 bg-white hover:border-brand-300',
                        )}
                      >
                        <span className="block text-sm font-semibold text-ink-900">{DEPARTMENT_LABELS[id]}</span>
                        <span className="text-xs text-ink-500">
                          {count} doctor{count > 1 ? 's' : ''}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {department && (
                <div className="animate-fade-up">
                  <h4 className="text-sm font-bold text-ink-900">Choose your doctor</h4>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => chooseDoctor(null)}
                      className="flex items-center gap-3 rounded-2xl border border-dashed border-brand-300 bg-brand-50/50 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-brand-500 hover:shadow-sm"
                    >
                      <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-brand-100 text-brand-700">
                        <UsersRound className="size-6" aria-hidden="true" />
                      </span>
                      <span>
                        <span className="block font-semibold text-ink-900">First available doctor</span>
                        <span className="text-xs text-ink-500">Most slots to choose from in {DEPARTMENT_LABELS[department]}</span>
                      </span>
                    </button>
                    {deptDoctors.map((d) => (
                      <button
                        key={d.slug}
                        type="button"
                        onClick={() => chooseDoctor(d.slug)}
                        className="flex items-center gap-3 rounded-2xl border border-ink-200 bg-white p-4 text-left transition-all hover:-translate-y-0.5 hover:border-brand-400 hover:shadow-sm"
                      >
                        <DoctorPhoto doctor={d} className="size-14 shrink-0 rounded-xl text-lg" />
                        <span className="min-w-0">
                          <span className="block truncate font-semibold text-ink-900">{d.full_name}</span>
                          <span className="block truncate text-xs text-ink-500">
                            {d.specialization} · {d.experience_years} yrs
                          </span>
                          <span className="mt-0.5 block text-xs text-ink-500">
                            {consultationDaysLabel(d.consultation_days)} · {formatTime(d.start_time)}–{formatTime(d.end_time)}
                            {d.consultation_fee !== null && <> · <strong className="text-brand-800">{formatPrice(d.consultation_fee)}</strong></>}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2 — date and live slots */}
          {step === 2 && department && (
            <div className="space-y-6">
              <SelectionSummary
                title={doctor ? doctor.full_name : 'First available doctor'}
                subtitle={doctor ? `${doctor.specialization} · ${DEPARTMENT_LABELS[department]}` : DEPARTMENT_LABELS[department]}
                doctor={doctor}
                onChange={() => setStep(1)}
              />
              <div>
                <h4 className="text-sm font-bold text-ink-900">Pick a date</h4>
                <div className="mt-3 flex gap-2 overflow-x-auto pb-2" role="listbox" aria-label="Available dates">
                  {dates.map((d) => {
                    const [weekday, day, month] = formatDate(d, { weekday: 'short', day: 'numeric', month: 'short' }).split(' ')
                    return (
                      <button
                        key={d}
                        type="button"
                        role="option"
                        aria-selected={date === d}
                        onClick={() => {
                          setDate(d)
                          setSlot(null)
                        }}
                        className={cn(
                          'flex w-16 shrink-0 flex-col items-center rounded-xl border py-2.5 transition-all',
                          date === d ? 'border-brand-600 bg-brand-600 text-white shadow-md' : 'border-ink-200 bg-white text-ink-800 hover:border-brand-300',
                        )}
                      >
                        <span className="text-[0.6875rem] font-semibold uppercase opacity-80">{weekday.replace(',', '')}</span>
                        <span className="text-lg leading-6 font-bold">{day}</span>
                        <span className="text-[0.6875rem] opacity-80">{month}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {date && (
                <div className="animate-fade-up">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-ink-900">Choose a time · {formatLongDate(date)}</h4>
                    {availability.loading && <Spinner label="Checking free slots" />}
                  </div>
                  <SlotPicker slots={availability.slots} loading={availability.loading} selected={slot} onSelect={setSlot} />
                  {availability.error && <p className="mt-3 text-sm text-red-700">{availability.error.message}</p>}
                </div>
              )}

              <StepNav onBack={() => setStep(1)} onNext={() => setStep(3)} nextDisabled={!slot} />
            </div>
          )}

          {/* Step 3 — patient details */}
          {step === 3 && (
            <form
              noValidate
              onSubmit={form.handleSubmit((values) => {
                setDetails(values)
                setStep(4)
              })}
              className="space-y-5"
            >
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Full name" required error={form.formState.errors.name?.message}>
                  {(p) => <Input {...p} {...form.register('name')} placeholder="e.g. Rahul Sharma" autoComplete="name" />}
                </Field>
                <Field label="Phone" required error={form.formState.errors.phone?.message} hint="For WhatsApp / SMS updates">
                  {(p) => <Input {...p} {...form.register('phone')} type="tel" placeholder="+91 98765 43210" autoComplete="tel" />}
                </Field>
                <Field label="Email" required error={form.formState.errors.email?.message} hint="Your confirmation is sent here">
                  {(p) => <Input {...p} {...form.register('email')} type="email" placeholder="you@example.com" autoComplete="email" />}
                </Field>
              </div>
              <Field
                label="Reason for visit or main symptoms"
                required
                error={form.formState.errors.reason?.message}
                hint="A line or two helps the doctor prepare. No detailed history needed."
              >
                {(p) => (
                  <Textarea
                    {...p}
                    {...form.register('reason')}
                    rows={3}
                    placeholder="e.g. Routine dental cleaning, itchy rash for two weeks, hair thinning at the crown…"
                  />
                )}
              </Field>
              <StepNav onBack={() => setStep(2)} nextLabel="Review booking" submit />
            </form>
          )}

          {/* Step 4 — review */}
          {step === 4 && department && date && slot && details && (
            <div className="space-y-6">
              <div className="grid gap-4 rounded-2xl border border-ink-100 bg-ink-50/50 p-5 sm:grid-cols-2">
                <ReviewItem label="Specialist" onEdit={() => setStep(1)}>
                  {doctor ? doctor.full_name : 'First available doctor'}
                  <span className="block text-xs font-normal text-ink-500">{DEPARTMENT_LABELS[department]}</span>
                </ReviewItem>
                <ReviewItem label="When" onEdit={() => setStep(2)}>
                  {formatLongDate(date)}
                  <span className="block text-xs font-normal text-ink-500">
                    {formatTime(slot.start)} – {formatTime(slot.end)}
                  </span>
                </ReviewItem>
                <ReviewItem label="Patient" onEdit={() => setStep(3)}>
                  {details.name}
                  <span className="block text-xs font-normal text-ink-500">
                    {details.phone} · {details.email}
                  </span>
                </ReviewItem>
                <ReviewItem label="Reason" onEdit={() => setStep(3)}>
                  <span className="line-clamp-3 font-normal">{details.reason}</span>
                </ReviewItem>
              </div>
              <p className="flex items-start gap-2 text-xs text-ink-500">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-brand-600" aria-hidden="true" />
                Your details are only shared with the clinic's front desk and your doctor. The consultation fee is paid at the clinic.
              </p>
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                <Button variant="outline" icon={<ArrowLeft className="size-4" />} onClick={() => setStep(3)}>
                  Back
                </Button>
                <Button size="lg" loading={submitting} icon={<Sparkles className="size-4.5" />} onClick={() => void submit()}>
                  {submitting ? 'Reserving your slot…' : 'Confirm booking'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

function SelectionSummary({ title, subtitle, doctor, onChange }: { title: string; subtitle: string; doctor: Doctor | null; onChange: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-brand-200 bg-brand-50/40 p-3">
      {doctor ? (
        <DoctorPhoto doctor={doctor} className="size-12 shrink-0 rounded-xl text-base" />
      ) : (
        <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-brand-100 text-brand-700">
          <UsersRound className="size-5" aria-hidden="true" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-ink-900">{title}</p>
        <p className="truncate text-xs text-ink-500">{subtitle}</p>
      </div>
      <button type="button" onClick={onChange} className="text-sm font-semibold text-brand-700 hover:underline">
        Change
      </button>
    </div>
  )
}

/** Free slots grouped into morning / afternoon / evening; taken slots stay visible but disabled. */
export function SlotPicker({
  slots,
  loading,
  selected,
  onSelect,
  compact = false,
}: {
  slots: MergedSlot[]
  loading: boolean
  selected: MergedSlot | null
  onSelect: (slot: MergedSlot) => void
  compact?: boolean
}) {
  if (!loading && slots.length === 0) {
    return <p className="mt-3 rounded-xl bg-ink-50 p-4 text-sm text-ink-600">No consultations on this day. Please pick another date.</p>
  }
  if (!loading && slots.every((s) => !s.available)) {
    return <p className="mt-3 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Fully booked on this day. Please pick another date.</p>
  }
  const groups = (['Morning', 'Afternoon', 'Evening'] as const)
    .map((period) => ({ period, items: slots.filter((s) => slotPeriod(s.start) === period) }))
    .filter((g) => g.items.length)
  return (
    <div className={cn('mt-3 space-y-3', loading && 'opacity-60')}>
      {groups.map(({ period, items }) => (
        <div key={period}>
          <p className="mb-1.5 text-xs font-semibold tracking-wide text-ink-500 uppercase">{period}</p>
          <div className={cn('grid gap-2', compact ? 'grid-cols-3' : 'grid-cols-3 sm:grid-cols-5 lg:grid-cols-6')}>
            {items.map((s) => (
              <button
                key={s.start}
                type="button"
                disabled={!s.available}
                onClick={() => onSelect(s)}
                aria-pressed={selected?.start === s.start}
                className={cn(
                  'rounded-lg border px-2 py-2 text-xs font-semibold transition-all sm:text-sm',
                  !s.available && 'cursor-not-allowed border-ink-100 bg-ink-50 text-ink-300 line-through',
                  s.available && selected?.start !== s.start && 'border-ink-200 bg-white text-ink-800 hover:border-brand-400 hover:bg-brand-50',
                  selected?.start === s.start && 'border-brand-600 bg-brand-600 text-white shadow-sm',
                )}
              >
                {formatTime(s.start)}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function StepNav({
  onBack,
  onNext,
  nextDisabled,
  nextLabel = 'Continue',
  submit = false,
}: {
  onBack: () => void
  onNext?: () => void
  nextDisabled?: boolean
  nextLabel?: string
  submit?: boolean
}) {
  return (
    <div className="flex flex-col-reverse gap-3 border-t border-ink-100 pt-5 sm:flex-row sm:justify-between">
      <Button type="button" variant="outline" icon={<ArrowLeft className="size-4" />} onClick={onBack}>
        Back
      </Button>
      <Button type={submit ? 'submit' : 'button'} disabled={nextDisabled} onClick={onNext}>
        {nextLabel} <ArrowRight className="size-4" aria-hidden="true" />
      </Button>
    </div>
  )
}

function ReviewItem({ label, children, onEdit }: { label: string; children: ReactNode; onEdit: () => void }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold tracking-wide text-ink-500 uppercase">{label}</p>
        <button type="button" onClick={onEdit} className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline">
          <Pencil className="size-3" aria-hidden="true" /> Edit
        </button>
      </div>
      <p className="mt-1 text-sm font-semibold text-ink-900">{children}</p>
    </div>
  )
}
