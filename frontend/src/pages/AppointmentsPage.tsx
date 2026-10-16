import { Bot, Building2, CheckCircle2, Clock, Mail, MessageCircleQuestion, Phone, Siren } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { openChat } from '@/components/chat/openChat'
import { DoctorPhoto } from '@/components/site/Cards'
import { PageHero } from '@/components/site/PageHero'
import { Seo } from '@/components/site/Seo'
import { Button, buttonClasses } from '@/components/ui/Button'
import { ErrorState, Skeleton } from '@/components/ui/Feedback'
import { Card, SectionHeading } from '@/components/ui/Layout'
import { hoursSummary, todayHours, useClinicInfo, useDoctors } from '@/hooks/useClinic'
import type { Department, Doctor } from '@/types'
import { DEPARTMENT_LABELS, WEEKDAYS, WEEKDAYS_SHORT, cn, formatTime } from '@/utils/format'

const DEPT_ORDER: Department[] = ['dental', 'skin', 'hair', 'general', 'pediatrics']

const ASK_EXAMPLES = [
  'Which doctor does braces and clear aligners?',
  'Which days does the dermatologist consult?',
  'Is a paediatrician available on Saturday?',
  'What should I bring to my first appointment?',
]

const EMAIL_BODY = [
  'Hello Cedarline front desk,',
  '',
  'I would like to book an appointment.',
  '',
  'Full name:',
  'Phone number:',
  'Doctor or service:',
  'Preferred dates and times:',
  '',
  'Thank you.',
].join('\n')

export default function AppointmentsPage() {
  const { data: clinic } = useClinicInfo()
  const doctors = useDoctors()
  const [department, setDepartment] = useState<Department | 'all'>('all')
  // "Book" on a doctor card links here with ?doctor=<slug>: highlight that doctor's schedule.
  const focusSlug = useSearchParams()[0].get('doctor')
  const focusLoaded = Boolean(focusSlug && doctors.data?.some((d) => d.slug === focusSlug))
  useEffect(() => {
    if (focusLoaded) document.getElementById(`doctor-${focusSlug}`)?.scrollIntoView({ block: 'center' })
  }, [focusLoaded, focusSlug])
  const today = clinic ? todayHours(clinic.opening_hours) : undefined
  const tel = clinic ? `tel:${clinic.phone.replace(/\s/g, '')}` : undefined
  const mailto = clinic
    ? `mailto:${clinic.email}?subject=${encodeURIComponent('Appointment request')}&body=${encodeURIComponent(EMAIL_BODY)}`
    : undefined

  const listed = (doctors.data ?? [])
    .filter((d) => department === 'all' || d.department === department)
    .sort((a, b) => DEPT_ORDER.indexOf(a.department) - DEPT_ORDER.indexOf(b.department))

  return (
    <>
      <Seo
        title="How to Book an Appointment"
        description="Book a consultation at Cedarline Multispeciality Clinic by phone, email or at the front desk. See every doctor's consultation days, or ask our AI assistant which specialist to see."
        path="/appointments"
      />
      <PageHero
        eyebrow="Appointments"
        title="Book an appointment"
        description="Call, email or visit our front desk and the team will find a time with the right doctor. Not sure who to see? Our AI assistant can help you choose a department and check consultation days."
        crumbs={[{ label: 'Appointments' }]}
        image="/images/clinic-reception.webp"
      >
        {clinic && (
          <a href={tel} className={buttonClasses('accent', 'lg')}>
            <Phone className="size-5" aria-hidden="true" /> Call {clinic.phone}
          </a>
        )}
        <Button variant="white" size="lg" icon={<Bot className="size-5" aria-hidden="true" />} onClick={() => openChat()}>
          Ask the AI assistant
        </Button>
      </PageHero>

      {/* Ways to book */}
      <section className="section">
        <div className="container-page">
          <SectionHeading eyebrow="Three ways to book" title="Choose what's easiest for you" />
          <div className="grid gap-6 md:grid-cols-3">
            <WayToBook
              icon={<Phone className="size-6" />}
              title="Call the front desk"
              text="The quickest way. We'll check each doctor's diary and confirm a time while you're on the phone."
            >
              {clinic ? (
                <>
                  <a href={tel} className="text-lg font-bold text-ink-900 hover:text-brand-700">
                    {clinic.phone}
                  </a>
                  <p className="text-sm text-ink-500">
                    {today ? (today.closed ? 'Closed today' : `Open today ${today.open} – ${today.close}`) : null}
                  </p>
                </>
              ) : (
                <Skeleton className="h-12" />
              )}
            </WayToBook>
            <WayToBook
              icon={<Mail className="size-6" />}
              title="Email us"
              text="Tell us the doctor or service you need and two or three preferred dates. We reply within one working day to confirm."
            >
              {clinic ? (
                <>
                  <a href={mailto} className="font-bold break-all text-ink-900 hover:text-brand-700">
                    {clinic.email}
                  </a>
                  <p className="text-sm text-ink-500">Opens a ready-to-fill email</p>
                </>
              ) : (
                <Skeleton className="h-12" />
              )}
            </WayToBook>
            <WayToBook
              icon={<Building2 className="size-6" />}
              title="Visit reception"
              text="Book in person at the front desk. Walk-in patients are seen only when a doctor is free, so booking ahead is best."
            >
              {clinic ? (
                <>
                  <p className="font-bold text-ink-900">{clinic.address_line.split(',').slice(-2).join(',').trim()}</p>
                  <p className="text-sm text-ink-500">{hoursSummary(clinic.opening_hours)}</p>
                </>
              ) : (
                <Skeleton className="h-12" />
              )}
            </WayToBook>
          </div>
        </div>
      </section>

      {/* Consultation days */}
      <section className="section bg-ink-50/70" aria-labelledby="schedule-title">
        <div className="container-page">
          <SectionHeading
            eyebrow="Before you call"
            title={<span id="schedule-title">Which doctor, which day?</span>}
            description="Each doctor consults on set days. Have a doctor and a couple of days in mind when you call and booking takes a minute."
          />
          <div role="group" aria-label="Filter doctors by department" className="mb-6 flex flex-wrap gap-2">
            {(['all', ...DEPT_ORDER] as const).map((d) => (
              <button
                key={d}
                type="button"
                aria-pressed={department === d}
                onClick={() => setDepartment(d)}
                className={cn(
                  'rounded-full px-4 py-2 text-sm font-semibold transition-colors',
                  department === d ? 'bg-brand-700 text-white' : 'bg-white text-ink-700 ring-1 ring-ink-200 hover:bg-ink-100',
                )}
              >
                {d === 'all' ? 'All departments' : DEPARTMENT_LABELS[d]}
              </button>
            ))}
          </div>

          {doctors.error ? (
            <ErrorState message={doctors.error.message} onRetry={doctors.reload} />
          ) : (
            <Card className="overflow-hidden">
              <ul className="divide-y divide-ink-100">
                {doctors.loading
                  ? Array.from({ length: 4 }, (_, i) => (
                      <li key={i} className="p-5">
                        <Skeleton className="h-14" />
                      </li>
                    ))
                  : listed.map((doctor) => <ScheduleRow key={doctor.id} doctor={doctor} highlighted={doctor.slug === focusSlug} />)}
              </ul>
            </Card>
          )}
        </div>
      </section>

      {/* AI assistant */}
      <section className="section">
        <div className="container-page grid items-center gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
          <div>
            <p className="eyebrow mb-3">AI assistant</p>
            <h2 className="text-3xl font-bold sm:text-4xl">Not sure who to see?</h2>
            <p className="mt-4 text-lg leading-8 text-ink-600">
              Our assistant answers from the clinic's own approved information: services, doctors, consultation days,
              timings and prices. It can't diagnose or recommend treatment. For that, please book a consultation.
            </p>
            <Button className="mt-6" size="lg" icon={<Bot className="size-5" aria-hidden="true" />} onClick={() => openChat()}>
              Open the assistant
            </Button>
          </div>
          <Card className="p-6">
            <p className="flex items-center gap-2 text-sm font-semibold text-ink-700">
              <MessageCircleQuestion className="size-5 text-brand-600" aria-hidden="true" /> Try asking
            </p>
            <ul className="mt-4 space-y-2">
              {ASK_EXAMPLES.map((q) => (
                <li key={q}>
                  <button
                    type="button"
                    onClick={() => openChat(q)}
                    className="w-full rounded-xl border border-ink-100 bg-ink-50/60 px-4 py-3 text-left text-[0.9375rem] font-medium text-ink-800 transition-colors hover:border-brand-200 hover:bg-brand-50 hover:text-brand-800"
                  >
                    “{q}”
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </section>

      {/* Before your visit */}
      <section className="section bg-ink-50/70">
        <div className="container-page grid gap-6 lg:grid-cols-2">
          <Card className="p-6 sm:p-8">
            <h2 className="text-xl font-bold">Before your visit</h2>
            <ul className="mt-5 space-y-3">
              {[
                'Arrive about 10 minutes early to complete registration.',
                'Bring a photo ID, previous reports or prescriptions, and a list of medicines you take.',
                'Patients under 18 must be accompanied by a parent or guardian.',
                'Need to reschedule or cancel? Please give us at least 24 hours’ notice by phone or email.',
              ].map((item) => (
                <li key={item} className="flex gap-3 text-ink-700">
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-brand-600" aria-hidden="true" /> {item}
                </li>
              ))}
            </ul>
          </Card>
          <Card className="border-red-100 bg-red-50/60 p-6 sm:p-8">
            <h2 className="flex items-center gap-2 text-xl font-bold text-red-900">
              <Siren className="size-5" aria-hidden="true" /> In an emergency
            </h2>
            <p className="mt-4 leading-7 text-red-900/80">
              {clinic?.emergency_note ??
                'Cedarline is an outpatient clinic. For a medical emergency, call 112 or go to the nearest hospital emergency department.'}
            </p>
            <p className="mt-4 flex items-center gap-2 text-sm text-red-900/70">
              <Clock className="size-4" aria-hidden="true" /> Don't wait for an appointment or a reply to an email.
            </p>
          </Card>
        </div>
      </section>
    </>
  )
}

function WayToBook({ icon, title, text, children }: { icon: ReactNode; title: string; text: string; children: ReactNode }) {
  return (
    <Card className="flex flex-col p-6">
      <span className="grid size-12 place-items-center rounded-2xl bg-brand-50 text-brand-700" aria-hidden="true">
        {icon}
      </span>
      <h3 className="mt-5 text-lg font-bold">{title}</h3>
      <p className="mt-2 flex-1 text-[0.9375rem] leading-7 text-ink-600">{text}</p>
      <div className="mt-5 border-t border-ink-100 pt-4">{children}</div>
    </Card>
  )
}

function ScheduleRow({ doctor, highlighted }: { doctor: Doctor; highlighted?: boolean }) {
  const days = doctor.consultation_days.map((d) => WEEKDAYS[d]).join(', ')
  return (
    <li
      id={`doctor-${doctor.slug}`}
      className={cn(
        'grid scroll-mt-48 gap-4 p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center lg:grid-cols-[minmax(0,1.2fr)_auto_minmax(9rem,auto)]',
        highlighted && 'bg-brand-50 ring-2 ring-brand-300 ring-inset',
      )}
    >
      <div className="flex min-w-0 items-center gap-4">
        <DoctorPhoto doctor={doctor} className="size-14 shrink-0 rounded-2xl" />
        <div className="min-w-0">
          <p className="font-bold text-ink-900">{doctor.full_name}</p>
          <p className="truncate text-sm text-ink-500">
            {doctor.specialization} · {DEPARTMENT_LABELS[doctor.department]}
          </p>
        </div>
      </div>
      <div>
        <p className="sr-only">Consults on {days}</p>
        <div className="grid grid-cols-7 gap-1" aria-hidden="true">
          {WEEKDAYS_SHORT.map((label, i) => (
            <span
              key={label}
              className={cn(
                'grid h-8 place-items-center rounded-lg text-xs font-semibold sm:w-10',
                doctor.consultation_days.includes(i) ? 'bg-brand-700 text-white' : 'bg-ink-100 text-ink-400',
              )}
            >
              {label}
            </span>
          ))}
        </div>
      </div>
      <p className="text-sm text-ink-600 tabular-nums sm:col-span-2 lg:col-span-1 lg:text-right">
        {formatTime(doctor.start_time)} – {formatTime(doctor.end_time)}
      </p>
    </li>
  )
}
