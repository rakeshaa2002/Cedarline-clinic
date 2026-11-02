import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  MapPin,
  Navigation,
  Phone,
  ShieldCheck,
  Stethoscope,
  User,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { BrandIcon, OpenStatus } from '@/components/rua/ui'
import { Seo } from '@/components/site/Seo'
import { Button } from '@/components/ui/Button'
import { Field, Input, Textarea } from '@/components/ui/Form'
import { WhatsAppIcon } from '@/components/ui/WhatsAppIcon'
import {
  BRAND,
  CATEGORIES,
  CENTRES,
  DOCTORS,
  getCategory,
  getCentre,
  getDoctor,
  getTreatment,
  treatmentsInCategory,
  type CategorySlug,
  type CentreSlug,
  type DoctorSlug,
} from '@/content/rua'
import { bookMeta } from '@/content/rua/seo'
import { SITE_URL } from '@/content/site'
import { track } from '@/utils/analytics'
import { cn } from '@/utils/format'
import { formatSlot, nowInIndia, telHref, whatsappLink } from '@/utils/rua'

type Concern = CategorySlug | 'consultation'
type DoctorChoice = DoctorSlug | 'any'

interface Draft {
  centre: CentreSlug | ''
  concern: Concern | ''
  treatment: string
  doctor: DoctorChoice | ''
  date: string
  time: string
  name: string
  phone: string
  email: string
  note: string
  consent: boolean
}

const STEPS = [
  { key: 'centre', label: 'Centre' },
  { key: 'concern', label: 'Concern' },
  { key: 'doctor', label: 'Doctor' },
  { key: 'time', label: 'Date & time' },
  { key: 'details', label: 'Your details' },
  { key: 'review', label: 'Confirm' },
] as const

const PHONE = /^(\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}$/
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const OPEN = 10 * 60
const LAST_SLOT = 19 * 60 + 30
const MIN_NOTICE = 60

const pad = (n: number) => String(n).padStart(2, '0')
const SLOTS = Array.from({ length: (LAST_SLOT - OPEN) / 30 + 1 }, (_, i) => {
  const m = OPEN + i * 30
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`
})
const slotMinutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3))

const DRAFT_KEY = 'rua_booking_draft'

function loadSavedDraft(initial: Draft): Draft {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY)
    if (raw) {
      const saved = JSON.parse(raw) as Partial<Draft>
      return {
        ...initial,
        ...saved,
        ...(initial.centre ? { centre: initial.centre } : {}),
        ...(initial.concern ? { concern: initial.concern } : {}),
        ...(initial.treatment ? { treatment: initial.treatment } : {}),
        ...(initial.doctor ? { doctor: initial.doctor } : {}),
      }
    }
  } catch {
    // Ignore storage read errors
  }
  return initial
}

/** The next 14 days in Bengaluru, as YYYY-MM-DD with display labels. */
function upcomingDays() {
  const { year, month, day } = nowInIndia()
  const start = Date.UTC(year, month - 1, day)
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date(start + i * 86_400_000)
    const value = d.toISOString().slice(0, 10)
    return {
      value,
      weekday: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-IN', { weekday: 'short', timeZone: 'UTC' }),
      day: d.getUTCDate(),
      month: d.toLocaleDateString('en-IN', { month: 'short', timeZone: 'UTC' }),
      isToday: i === 0,
    }
  })
}

function longDate(value: string) {
  if (!value) return ''
  const [y, m, d] = value.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
}

function newReference() {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  const bytes = new Uint8Array(6)
  crypto.getRandomValues(bytes)
  return `RUA-${Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('')}`
}

/** .ics file for the requested slot (IST converted to UTC). */
function calendarFile(ref: string, draft: Draft, centreName: string, address: string) {
  const [y, mo, d] = draft.date.split('-').map(Number)
  const minutes = slotMinutes(draft.time)
  const startUtc = Date.UTC(y, mo - 1, d, Math.floor(minutes / 60), minutes % 60) - 330 * 60_000
  const stamp = (ms: number) => new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//RUA Skin & Hair Center//Booking//EN',
    'BEGIN:VEVENT',
    `UID:${ref}@ruaskinandhair.com`,
    `DTSTAMP:${stamp(Date.now())}`,
    `DTSTART:${stamp(startUtc)}`,
    `DTEND:${stamp(startUtc + 30 * 60_000)}`,
    `SUMMARY:RUA consultation (requested) – ${centreName}`,
    `LOCATION:${address.replace(/,/g, '\\,')}`,
    `DESCRIPTION:Booking reference ${ref}. Requested appointment — the RUA team confirms on WhatsApp.`,
    'STATUS:TENTATIVE',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  return new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' })
}

export default function BookAppointmentPage() {
  const [params, setSearchParams] = useSearchParams()
  const days = useMemo(upcomingDays, [])

  const [draft, setDraft] = useState<Draft>(() => {
    const treatment = getTreatment(params.get('treatment') ?? undefined)
    const category = getCategory(params.get('category') ?? undefined)
    const centre = getCentre(params.get('centre') ?? undefined)
    const doctor = getDoctor(params.get('doctor') ?? undefined)
    const initial: Draft = {
      centre: centre?.slug ?? '',
      concern: treatment?.category ?? category?.slug ?? '',
      treatment: treatment?.slug ?? '',
      doctor: doctor?.slug ?? '',
      date: '',
      time: '',
      name: '',
      phone: '',
      email: '',
      note: '',
      consent: false,
    }
    return loadSavedDraft(initial)
  })

  const defaultStep = useMemo(() => {
    return draft.centre ? (draft.concern ? (draft.doctor ? 3 : 2) : 1) : 0
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const stepFromParams = (searchParams: URLSearchParams) => {
    const p = searchParams.get('step')
    if (!p) return defaultStep
    const n = Number(p) - 1
    return Number.isFinite(n) ? Math.max(0, Math.min(5, n)) : defaultStep
  }

  const [step, setStep] = useState(() => stepFromParams(params))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [reference, setReference] = useState<string | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const dateScrollRef = useRef<HTMLDivElement>(null)

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }))

  useEffect(() => {
    track('booking_start', { treatment: draft.treatment || undefined, doctor: draft.doctor || undefined, centre: draft.centre || undefined })
    // Only on first load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sync step with URL search params (enables browser Back / Forward navigation between steps)
  useEffect(() => {
    const target = stepFromParams(params)
    if (target !== step) {
      setStep(target)
      track('booking_step', { step: STEPS[target].key })
      window.requestAnimationFrame(() => panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params])

  // Persist draft across page reloads and step navigation
  useEffect(() => {
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
    } catch {
      // Ignore
    }
  }, [draft])

  const goTo = (next: number) => {
    setStep(next)
    track('booking_step', { step: STEPS[next].key })
    window.requestAnimationFrame(() => panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
    setSearchParams(
      (prev) => {
        const nextParams = new URLSearchParams(prev)
        if (next === 0 && defaultStep === 0) {
          nextParams.delete('step')
        } else {
          nextParams.set('step', String(next + 1))
        }
        return nextParams
      },
      { replace: false },
    )
  }

  const handleBack = () => {
    if (step <= 0) return
    if (params.get('step')) {
      window.history.back()
    } else {
      goTo(step - 1)
    }
  }

  const centre = getCentre(draft.centre || undefined)
  const category = draft.concern && draft.concern !== 'consultation' ? getCategory(draft.concern) : undefined
  const treatment = getTreatment(draft.treatment || undefined)
  const doctor = draft.doctor && draft.doctor !== 'any' ? getDoctor(draft.doctor) : undefined
  const nowMinutes = nowInIndia().minutes

  const slotOpen = (date: string, time: string) => {
    if (date !== days[0].value) return true
    return slotMinutes(time) >= nowMinutes + MIN_NOTICE
  }
  const dayHasSlots = (date: string) => SLOTS.some((t) => slotOpen(date, t))

  const canContinue = [
    Boolean(draft.centre),
    Boolean(draft.concern),
    Boolean(draft.doctor),
    Boolean(draft.date && draft.time && slotOpen(draft.date, draft.time)),
    true,
    true,
  ][step]

  const validateDetails = () => {
    const next: Record<string, string> = {}
    if (draft.name.trim().length < 2) next.name = 'Please enter your full name.'
    if (!PHONE.test(draft.phone.trim())) next.phone = 'Please enter a valid 10-digit Indian mobile number.'
    if (draft.email.trim() && !EMAIL.test(draft.email.trim())) next.email = 'Please check your email address.'
    if (!draft.consent) next.consent = 'Please agree so our team can contact you about this appointment.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const next = () => {
    if (step === 4 && !validateDetails()) return
    goTo(Math.min(step + 1, STEPS.length - 1))
  }

  const concernLabel =
    draft.concern === 'consultation' ? 'General consultation' : treatment ? `${category?.name} — ${treatment.name}` : category?.name ?? ''
  const doctorLabel = draft.doctor === 'any' ? 'First available dermatologist' : doctor?.name ?? ''

  const message = (ref: string) =>
    [
      `Hello ${BRAND.name}, I'd like to book an appointment.`,
      `Booking ref: ${ref}`,
      `Centre: ${centre?.name}`,
      `For: ${concernLabel}`,
      `Doctor: ${doctorLabel}`,
      `Preferred: ${longDate(draft.date)} at ${formatSlot(draft.time)}`,
      `Name: ${draft.name.trim()}`,
      `Phone: ${draft.phone.trim()}`,
      draft.email.trim() ? `Email: ${draft.email.trim()}` : '',
      draft.note.trim() ? `Note: ${draft.note.trim()}` : '',
    ]
      .filter(Boolean)
      .join('\n')

  const confirm = () => {
    try {
      sessionStorage.removeItem(DRAFT_KEY)
    } catch {
      // Ignore
    }
    const ref = reference ?? newReference()
    setReference(ref)
    track('book_appointment', {
      centre: draft.centre,
      concern: draft.concern,
      treatment: draft.treatment || undefined,
      doctor: draft.doctor,
      date: draft.date,
      time: draft.time,
    })
    window.open(whatsappLink(message(ref)), '_blank', 'noopener')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const downloadCalendar = () => {
    if (!reference || !centre) return
    const url = URL.createObjectURL(calendarFile(reference, draft, centre.name, centre.addressLines.join(', ')))
    const a = document.createElement('a')
    a.href = url
    a.download = `${reference}.ics`
    a.click()
    URL.revokeObjectURL(url)
  }

  const reset = () => {
    try {
      sessionStorage.removeItem(DRAFT_KEY)
    } catch {
      // Ignore
    }
    setReference(null)
    setDraft({
      centre: '',
      concern: '',
      treatment: '',
      doctor: '',
      date: '',
      time: '',
      name: '',
      phone: '',
      email: '',
      note: '',
      consent: false,
    })
    goTo(0)
  }

  const meta = bookMeta(SITE_URL)

  // --- Success ---------------------------------------------------------------------------------
  if (reference && centre) {
    return (
      <>
        <Seo meta={meta} noindex />
        <section className="surface-cocoa relative isolate overflow-hidden py-16 text-cream sm:py-24">
          <div className="slats absolute inset-0 -z-10 opacity-60" aria-hidden="true" />
          <div className="container-page max-w-3xl text-center">
            <span className="animate-pop mx-auto grid size-20 place-items-center rounded-full bg-accent-400 text-brand-950 shadow-glow-accent">
              <CheckCircle2 className="size-10" aria-hidden="true" />
            </span>
            <p className="eyebrow-light mt-8">Booking reference</p>
            <p className="mt-2 font-display text-5xl tracking-wide text-cream">{reference}</p>
            <h1 className="mt-6 text-3xl text-cream sm:text-4xl">Your request is ready to send</h1>
            <p className="mx-auto mt-4 max-w-xl text-lg leading-8 text-cream/75">
              WhatsApp has opened with your booking details. Tap <strong className="text-cream">send</strong> and the RUA front desk will confirm your slot
              on WhatsApp.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <a
                href={whatsappLink(message(reference))}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-13 items-center gap-2.5 rounded-full bg-[#25D366] px-7 font-semibold text-white shadow-lg"
              >
                <WhatsAppIcon className="size-5" aria-hidden="true" /> Open WhatsApp again
              </a>
              <button type="button" onClick={downloadCalendar} className="inline-flex h-13 items-center gap-2.5 rounded-full border border-cream/35 px-7 font-semibold text-cream hover:bg-cream/10">
                <Download className="size-5" aria-hidden="true" /> Add to calendar
              </button>
            </div>
          </div>
        </section>
        <section className="container-page max-w-3xl py-12">
          <div className="rounded-[2rem] bg-white p-7 shadow-card ring-1 ring-ink-100 sm:p-9">
            <p className="font-display text-2xl text-ink-900">Appointment request</p>
            <dl className="mt-6 grid gap-5 sm:grid-cols-2">
              {[
                ['Centre', centre.name],
                ['For', concernLabel],
                ['Doctor', doctorLabel],
                ['Preferred time', `${longDate(draft.date)}, ${formatSlot(draft.time)}`],
                ['Name', draft.name],
                ['Phone', draft.phone],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-sm text-ink-500">{k}</dt>
                  <dd className="mt-0.5 font-semibold text-ink-900">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-8 flex flex-wrap gap-3 border-t border-ink-100 pt-6">
              <a href={centre.mapsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center gap-2 rounded-full bg-brand-800 px-5 text-sm font-semibold text-cream">
                <Navigation className="size-4" aria-hidden="true" /> Directions to {centre.area}
              </a>
              <a href={telHref(centre.phone)} data-centre={centre.slug} className="inline-flex h-11 items-center gap-2 rounded-full border border-ink-200 px-5 text-sm font-semibold text-ink-800">
                <Phone className="size-4" aria-hidden="true" /> {centre.phoneDisplay}
              </a>
              <button type="button" onClick={reset} className="inline-flex h-11 items-center gap-2 px-3 text-sm font-semibold text-brand-700 hover:underline">
                Book another appointment
              </button>
            </div>
          </div>
          <p className="mt-6 text-center text-sm text-ink-500">
            Prefer to talk? Call {centre.area} on {centre.phoneDisplay} — open {BRAND.hours.days}, {BRAND.hours.label}.
          </p>
        </section>
      </>
    )
  }

  // --- Wizard ------------------------------------------------------------------------------------
  return (
    <>
      <Seo meta={meta} />
      <div className="container-page w-full max-w-full overflow-x-clip pt-4 pb-10 sm:pt-6 sm:pb-14">
        {/* Header and Stepper */}
        <div className="mb-6 space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="eyebrow mb-1">Book online · under a minute</p>
              <h1 className="text-2xl font-bold text-ink-900 sm:text-3xl">Book a consultation</h1>
            </div>
            <OpenStatus tone="dark" />
          </div>

          {/* Stepper */}
          <ol className="grid grid-cols-6 gap-2">
            {STEPS.map((s, i) => {
              const done = i < step
              return (
                <li key={s.key}>
                  <button
                    type="button"
                    disabled={i > step}
                    onClick={() => i < step && goTo(i)}
                    className="group flex w-full flex-col gap-1.5 text-left disabled:cursor-default"
                    aria-current={i === step ? 'step' : undefined}
                  >
                    <span className={cn('h-1.5 rounded-full transition-colors', i <= step ? 'bg-brand-800' : 'bg-ink-200')} />
                    <span
                      className={cn(
                        'hidden items-center gap-1 text-xs font-semibold sm:flex',
                        i === step ? 'text-brand-900' : done ? 'text-ink-700 group-hover:text-brand-800' : 'text-ink-400',
                      )}
                    >
                      {done && <Check className="size-3 text-brand-700" aria-hidden="true" />}
                      {s.label}
                    </span>
                  </button>
                </li>
              )
            })}
          </ol>
        </div>

        {/* minmax(0,1fr) + min-w-0: the long date row scrolls inside the panel instead of widening it
            and pushing the "Your appointment" summary off-screen. */}
        <div className="grid w-full min-w-0 max-w-full gap-8 lg:grid-cols-[minmax(0,1fr)_19rem] xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div ref={panelRef} className="w-full min-w-0 max-w-full scroll-mt-24 rounded-[2rem] bg-white p-6 shadow-card ring-1 ring-ink-100 sm:p-8">
          <p className="text-sm font-semibold text-accent-600">
            Step {step + 1} of {STEPS.length}
          </p>

          {step === 0 && (
            <StepShell title="Which centre would you like to visit?" lead={`Both centres are open ${BRAND.hours.days}, ${BRAND.hours.label}.`}>
              <div className="grid gap-4 sm:grid-cols-2">
                {CENTRES.map((c) => (
                  <ChoiceCard
                    key={c.slug}
                    selected={draft.centre === c.slug}
                    onSelect={() => {
                      set('centre', c.slug)
                      window.setTimeout(() => goTo(1), 220)
                    }}
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span className="font-display text-2xl text-ink-900">{c.area}</span>
                      {c.isNew && <span className="rounded-full bg-accent-100 px-2.5 py-0.5 text-xs font-bold text-accent-700">New</span>}
                    </span>
                    <span className="mt-3 flex gap-2 text-sm leading-6 text-ink-600">
                      <MapPin className="mt-1 size-4 shrink-0 text-brand-600" aria-hidden="true" />
                      {c.addressLines.join(', ')}
                    </span>
                    <span className="mt-2 flex items-center gap-2 text-sm text-ink-600">
                      <Phone className="size-4 text-brand-600" aria-hidden="true" /> {c.phoneDisplay}
                    </span>
                  </ChoiceCard>
                ))}
              </div>
            </StepShell>
          )}

          {step === 1 && (
            <StepShell title="What would you like help with?" lead="Choose a speciality — or a general consultation if you’re not sure. You can add a specific treatment.">
              <div className="grid gap-3 sm:grid-cols-2">
                {CATEGORIES.map((c) => (
                  <ChoiceCard
                    key={c.slug}
                    compact
                    selected={draft.concern === c.slug}
                    onSelect={() => setDraft((d) => ({ ...d, concern: c.slug, treatment: d.concern === c.slug ? d.treatment : '' }))}
                  >
                    <span className="flex items-center gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-700 ring-1 ring-brand-100">
                        <BrandIcon name={c.icon} className="size-4.5" />
                      </span>
                      <span className="font-semibold text-ink-900">{c.name}</span>
                    </span>
                  </ChoiceCard>
                ))}
                <ChoiceCard compact selected={draft.concern === 'consultation'} onSelect={() => setDraft((d) => ({ ...d, concern: 'consultation', treatment: '' }))}>
                  <span className="flex items-center gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent-100 text-accent-700">
                      <Stethoscope className="size-4.5" aria-hidden="true" />
                    </span>
                    <span className="font-semibold text-ink-900">Not sure — general consultation</span>
                  </span>
                </ChoiceCard>
              </div>
              {category && treatmentsInCategory(category.slug).length > 0 && (
                <div className="mt-7">
                  <p className="text-sm font-semibold text-ink-800">Specific treatment (optional)</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {treatmentsInCategory(category.slug).map((t) => (
                      <button
                        key={t.slug}
                        type="button"
                        onClick={() => set('treatment', draft.treatment === t.slug ? '' : t.slug)}
                        aria-pressed={draft.treatment === t.slug}
                        className={cn(
                          'rounded-full px-4 py-2 text-sm font-medium ring-1 transition',
                          draft.treatment === t.slug ? 'bg-brand-800 text-cream ring-brand-800' : 'bg-white text-ink-700 ring-ink-200 hover:ring-brand-300',
                        )}
                      >
                        {t.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </StepShell>
          )}

          {step === 2 && (
            <StepShell title="Choose your dermatologist" lead="All three are MD (DVL) dermatologists. We’ve highlighted the best fit for your concern.">
              <div className="grid gap-3">
                {DOCTORS.map((d) => {
                  const recommended =
                    (treatment && d.treatments.includes(treatment.slug)) || (category && d.categories.includes(category.slug)) || false
                  return (
                    <ChoiceCard
                      key={d.slug}
                      compact
                      selected={draft.doctor === d.slug}
                      onSelect={() => {
                        set('doctor', d.slug)
                        window.setTimeout(() => goTo(3), 220)
                      }}
                    >
                      <span className="flex items-center gap-4">
                        <img src={d.photo} alt="" className="size-16 shrink-0 rounded-2xl bg-brand-800 object-cover object-top" />
                        <span className="flex-1">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="font-display text-xl text-ink-900">{d.name}</span>
                            {recommended && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 ring-1 ring-emerald-100">
                                <BadgeCheck className="size-3.5" aria-hidden="true" /> Recommended
                              </span>
                            )}
                          </span>
                          <span className="mt-0.5 block text-sm text-ink-600">
                            {d.qualifications} · {d.role}
                          </span>
                          <span className="mt-0.5 block text-xs text-ink-500">{d.fellowship}</span>
                        </span>
                      </span>
                    </ChoiceCard>
                  )
                })}
                <ChoiceCard
                  compact
                  selected={draft.doctor === 'any'}
                  onSelect={() => {
                    set('doctor', 'any')
                    window.setTimeout(() => goTo(3), 220)
                  }}
                >
                  <span className="flex items-center gap-4">
                    <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-cream text-brand-700">
                      <User className="size-7" aria-hidden="true" />
                    </span>
                    <span>
                      <span className="font-display text-xl text-ink-900">First available dermatologist</span>
                      <span className="mt-0.5 block text-sm text-ink-600">The quickest slot with any RUA doctor</span>
                    </span>
                  </span>
                </ChoiceCard>
              </div>
            </StepShell>
          )}

          {step === 3 && (
            <StepShell title="Pick a preferred date & time" lead="Times are in Bengaluru time. Our team confirms availability on WhatsApp.">
              <div className="relative w-full min-w-0 max-w-full">
                <div className="mb-2.5 flex items-center justify-between text-xs text-ink-500">
                  <span>Available dates (next 14 days)</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => dateScrollRef.current?.scrollBy({ left: -240, behavior: 'smooth' })}
                      aria-label="Scroll dates left"
                      className="grid size-7 cursor-pointer place-items-center rounded-lg border border-ink-200 bg-white text-ink-700 shadow-xs transition hover:bg-brand-50 hover:text-brand-800"
                    >
                      <ChevronLeft className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => dateScrollRef.current?.scrollBy({ left: 240, behavior: 'smooth' })}
                      aria-label="Scroll dates right"
                      className="grid size-7 cursor-pointer place-items-center rounded-lg border border-ink-200 bg-white text-ink-700 shadow-xs transition hover:bg-brand-50 hover:text-brand-800"
                    >
                      <ChevronRight className="size-4" />
                    </button>
                  </div>
                </div>
                <div
                  ref={dateScrollRef}
                  className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2 [scrollbar-width:thin] scroll-smooth overscroll-x-contain"
                >
                  {days.map((d) => {
                    const available = dayHasSlots(d.value)
                    const selected = draft.date === d.value
                    return (
                      <button
                        key={d.value}
                        type="button"
                        disabled={!available}
                        onClick={() => setDraft((x) => ({ ...x, date: d.value, time: x.date === d.value ? x.time : '' }))}
                        className={cn(
                          'flex w-20 shrink-0 flex-col items-center rounded-2xl py-3 ring-1 transition disabled:cursor-not-allowed disabled:opacity-40',
                          selected ? 'bg-brand-800 text-cream ring-brand-800 shadow-lg' : 'bg-white text-ink-800 ring-ink-200 hover:ring-brand-300',
                        )}
                      >
                        <span className={cn('text-xs font-semibold', selected ? 'text-accent-200' : 'text-ink-500')}>{d.weekday}</span>
                        <span className="mt-1 font-display text-2xl">{d.day}</span>
                        <span className="text-xs">{d.month}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
              {draft.date ? (
                <div className="mt-6 space-y-5">
                  {[
                    ['Morning', SLOTS.filter((t) => slotMinutes(t) < 12 * 60)],
                    ['Afternoon', SLOTS.filter((t) => slotMinutes(t) >= 12 * 60 && slotMinutes(t) < 16 * 60)],
                    ['Evening', SLOTS.filter((t) => slotMinutes(t) >= 16 * 60)],
                  ].map(([label, times]) => (
                    <div key={label as string}>
                      <p className="text-sm font-semibold text-ink-700">{label as string}</p>
                      <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5">
                        {(times as string[]).map((t) => {
                          const ok = slotOpen(draft.date, t)
                          return (
                            <button
                              key={t}
                              type="button"
                              disabled={!ok}
                              onClick={() => set('time', t)}
                              className={cn(
                                'h-11 rounded-xl text-sm font-semibold ring-1 transition disabled:cursor-not-allowed disabled:opacity-35 disabled:line-through',
                                draft.time === t ? 'bg-accent-400 text-brand-950 ring-accent-400' : 'bg-white text-ink-800 ring-ink-200 hover:ring-brand-300',
                              )}
                            >
                              {formatSlot(t)}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-6 flex items-center gap-2 rounded-2xl bg-sand/60 p-4 text-sm text-ink-600">
                  <CalendarDays className="size-4 text-brand-600" aria-hidden="true" /> Choose a date to see available times.
                </p>
              )}
            </StepShell>
          )}

          {step === 4 && (
            <StepShell title="Your details" lead="So our front desk can confirm your appointment on WhatsApp or by phone.">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Full name" required error={errors.name}>
                  {(p) => <Input {...p} value={draft.name} onChange={(e) => set('name', e.target.value)} autoComplete="name" className="h-12" />}
                </Field>
                <Field label="Mobile (WhatsApp)" required error={errors.phone}>
                  {(p) => (
                    <Input {...p} value={draft.phone} onChange={(e) => set('phone', e.target.value)} type="tel" inputMode="tel" autoComplete="tel" placeholder="98xxx xxxxx" className="h-12" />
                  )}
                </Field>
                <Field label="Email" error={errors.email} className="sm:col-span-2">
                  {(p) => <Input {...p} value={draft.email} onChange={(e) => set('email', e.target.value)} type="email" autoComplete="email" className="h-12" />}
                </Field>
                <Field label="Anything we should know?" className="sm:col-span-2" hint="E.g. your main concern or questions for the doctor.">
                  {(p) => <Textarea {...p} rows={3} maxLength={500} value={draft.note} onChange={(e) => set('note', e.target.value)} />}
                </Field>
              </div>
              <label className={cn('mt-6 flex items-start gap-3 rounded-2xl p-4 ring-1', errors.consent ? 'bg-red-50 ring-red-200' : 'bg-cream/60 ring-brand-100')}>
                <input type="checkbox" checked={draft.consent} onChange={(e) => set('consent', e.target.checked)} className="mt-1 size-4 accent-brand-800" />
                <span className="text-sm leading-6 text-ink-700">
                  I agree to be contacted by RUA Skin &amp; Hair Center on WhatsApp or phone about this appointment.
                  {errors.consent && <span className="mt-1 block text-red-600">{errors.consent}</span>}
                </span>
              </label>
            </StepShell>
          )}

          {step === 5 && (
            <StepShell title="Review & confirm" lead="Check your details. Confirming opens WhatsApp with your booking ready to send to RUA.">
              <dl className="divide-y divide-ink-100 overflow-hidden rounded-2xl ring-1 ring-ink-100">
                {(
                  [
                    ['Centre', centre?.name ?? '', 0],
                    ['For', concernLabel, 1],
                    ['Doctor', doctorLabel, 2],
                    ['Date & time', `${longDate(draft.date)}, ${formatSlot(draft.time)}`, 3],
                    ['Your details', `${draft.name} · ${draft.phone}${draft.email ? ` · ${draft.email}` : ''}`, 4],
                  ] as const
                ).map(([k, v, s]) => (
                  <div key={k} className="flex items-center justify-between gap-4 bg-white px-5 py-4">
                    <div>
                      <dt className="text-sm text-ink-500">{k}</dt>
                      <dd className="mt-0.5 font-semibold text-ink-900">{v}</dd>
                    </div>
                    <button type="button" onClick={() => goTo(s)} className="text-sm font-semibold text-brand-700 hover:underline">
                      Edit
                    </button>
                  </div>
                ))}
              </dl>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Button size="lg" onClick={confirm} icon={<WhatsAppIcon className="size-5" aria-hidden="true" />}>
                  Confirm on WhatsApp
                </Button>
                {centre && (
                  <a href={telHref(centre.phone)} data-centre={centre.slug} className="inline-flex h-13 items-center gap-2 px-4 font-semibold text-brand-700">
                    <Phone className="size-4" aria-hidden="true" /> Or call {centre.phoneDisplay}
                  </a>
                )}
              </div>
            </StepShell>
          )}

          {step < 5 && (
            <div className="mt-9 flex items-center justify-between gap-3 border-t border-ink-100 pt-6">
              <Button variant="ghost" onClick={handleBack} disabled={step === 0} icon={<ArrowLeft className="size-4" aria-hidden="true" />}>
                Back
              </Button>
              <Button onClick={next} disabled={!canContinue} size="lg">
                Continue <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
            </div>
          )}
          {step === 5 && (
            <div className="mt-6">
              <Button variant="ghost" onClick={handleBack} icon={<ArrowLeft className="size-4" aria-hidden="true" />}>
                Back
              </Button>
            </div>
          )}
        </div>

        {/* Live summary */}
        <aside className="w-full min-w-0 space-y-5 lg:sticky lg:top-36 lg:self-start">
          <div className="surface-cocoa relative isolate overflow-hidden rounded-[2rem] p-7 text-cream shadow-lift">
            <div className="slats absolute inset-0 -z-10 opacity-60" aria-hidden="true" />
            <p className="eyebrow-light">Your appointment</p>
            <ul className="mt-5 space-y-4">
              <SummaryRow icon={<MapPin className="size-4" aria-hidden="true" />} label="Centre" value={centre?.name} />
              <SummaryRow icon={<Stethoscope className="size-4" aria-hidden="true" />} label="For" value={concernLabel} />
              <SummaryRow icon={<User className="size-4" aria-hidden="true" />} label="Doctor" value={doctorLabel} />
              <SummaryRow
                icon={<Clock className="size-4" aria-hidden="true" />}
                label="Time"
                value={draft.date && draft.time ? `${longDate(draft.date)}, ${formatSlot(draft.time)}` : draft.date ? longDate(draft.date) : undefined}
              />
            </ul>
          </div>
          <div className="rounded-[2rem] bg-white p-6 ring-1 ring-ink-100">
            <ul className="space-y-3 text-sm text-ink-700">
              {[
                'Consultation with an MD (DVL) dermatologist',
                'Confirmation from our front desk on WhatsApp',
                'Flexible payment & EMI for treatment packages',
              ].map((t) => (
                <li key={t} className="flex items-start gap-2.5">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0 text-accent-600" aria-hidden="true" /> {t}
                </li>
              ))}
            </ul>
            <div className="mt-5 border-t border-ink-100 pt-4 text-sm text-ink-600">
              Prefer to call?
              {CENTRES.map((c) => (
                <a key={c.slug} href={telHref(c.phone)} data-centre={c.slug} className="mt-1.5 flex justify-between font-semibold text-ink-900 hover:text-brand-700">
                  <span>{c.area}</span> <span>{c.phoneDisplay}</span>
                </a>
              ))}
            </div>
          </div>
          <Link to="/services" className="block text-center text-sm font-semibold text-brand-700 hover:underline">
            Not sure? Explore treatments first
          </Link>
        </aside>
      </div>
    </div>
  </>
  )
}

function StepShell({ title, lead, children }: { title: string; lead?: string; children: ReactNode }) {
  return (
    <div className="animate-fade-up w-full min-w-0 max-w-full">
      <h2 className="mt-2 text-3xl leading-tight sm:text-4xl">{title}</h2>
      {lead && <p className="mt-2 text-ink-600">{lead}</p>}
      <div className="mt-7 w-full min-w-0 max-w-full">{children}</div>
    </div>
  )
}

function ChoiceCard({
  selected,
  onSelect,
  compact,
  children,
}: {
  selected: boolean
  onSelect: () => void
  compact?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        'relative flex w-full flex-col rounded-2xl text-left ring-1 transition-all duration-200',
        compact ? 'p-4' : 'p-6',
        selected ? 'bg-brand-50 ring-2 ring-brand-700 shadow-glow' : 'bg-white ring-ink-200 hover:-translate-y-0.5 hover:ring-brand-300 hover:shadow-card',
      )}
    >
      {selected && (
        <span className="absolute top-3 right-3 grid size-6 place-items-center rounded-full bg-brand-800 text-cream">
          <Check className="size-3.5" aria-hidden="true" />
        </span>
      )}
      {children}
    </button>
  )
}

function SummaryRow({ icon, label, value }: { icon: ReactNode; label: string; value?: string }) {
  return (
    <li className="flex gap-3">
      <span className={cn('mt-0.5 grid size-8 shrink-0 place-items-center rounded-full', value ? 'bg-accent-400 text-brand-950' : 'bg-cream/10 text-cream/50')}>{icon}</span>
      <span>
        <span className="block text-xs tracking-wide text-cream/55 uppercase">{label}</span>
        <span className={cn('block text-sm', value ? 'font-semibold text-cream' : 'text-cream/45')}>{value || 'Not selected yet'}</span>
      </span>
    </li>
  )
}

