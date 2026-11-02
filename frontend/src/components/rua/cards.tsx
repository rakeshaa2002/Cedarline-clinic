import { ArrowRight, ArrowUpRight, Award, CalendarCheck, Clock, MapPin, Navigation, Phone, Quote } from 'lucide-react'
import { Link } from 'react-router-dom'
import { BrandIcon, OpenStatus, Reveal, SocialIcon } from '@/components/rua/ui'
import { ButtonLink } from '@/components/ui/Button'
import { WhatsAppIcon } from '@/components/ui/WhatsAppIcon'
import {
  BRAND,
  CONCERNS,
  EQUIPMENT,
  INSTAGRAM_HIGHLIGHTS,
  INSTAGRAM_POSTS,
  PROOF_POINTS,
  RESEARCH,
  TESTIMONIALS,
  categoryPath,
  centrePath,
  doctorPath,
  getDoctor,
  pathForTreatment,
  treatmentPath,
  treatmentsInCategory,
  type Category,
  type Centre,
  type Doctor,
  type EquipmentId,
  type Treatment,
} from '@/content/rua'
import { cn } from '@/utils/format'
import { telHref, whatsappLink } from '@/utils/rua'

// --- Doctors -------------------------------------------------------------------------------------

export function DoctorPortrait({ doctor, className, eager }: { doctor: Doctor; className?: string; eager?: boolean }) {
  return (
    <div className={cn('surface-cocoa arch relative isolate overflow-hidden', className)}>
      <div className="slats absolute inset-0 -z-10 opacity-80" aria-hidden="true" />
      <div className="absolute inset-x-[12%] top-[8%] bottom-0 -z-10 rounded-t-full border border-accent-300/35" aria-hidden="true" />
      <div className="absolute inset-x-[22%] top-[18%] bottom-0 -z-10 rounded-t-full bg-brand-600/35 blur-2xl" aria-hidden="true" />
      {/* The cutouts fade out below the hands (the desk), so that strip sits below the frame and is
          clipped: the portrait fills the arch to the bottom edge. */}
      <img
        src={doctor.photo}
        alt={`${doctor.name}, ${doctor.role} at RUA Skin & Hair Center`}
        loading={eager ? 'eager' : 'lazy'}
        className="absolute -bottom-[17%] left-1/2 h-[110%] w-auto max-w-none -translate-x-1/2 object-contain drop-shadow-[0_20px_30px_rgba(0,0,0,0.35)] transition-transform duration-700 group-hover:scale-[1.03]"
      />
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-brand-900 via-brand-900/60 to-transparent" aria-hidden="true" />
    </div>
  )
}

export function DoctorCard({ doctor }: { doctor: Doctor }) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[2rem] bg-white shadow-card ring-1 ring-ink-100 transition-all duration-500 hover:-translate-y-1.5 hover:shadow-lift">
      <Link to={doctorPath(doctor.slug)} className="block p-4 pb-0" aria-label={`${doctor.name} — view profile`}>
        <DoctorPortrait doctor={doctor} className="h-80" />
      </Link>
      <div className="flex flex-1 flex-col px-6 pt-6 pb-7">
        <p className="eyebrow">{doctor.persona}</p>
        <h3 className="mt-2 text-2xl">
          <Link to={doctorPath(doctor.slug)} className="hover:text-brand-700">
            {doctor.name}
          </Link>
        </h3>
        <p className="mt-1 text-sm font-semibold text-brand-700">{doctor.qualifications}</p>
        <p className="mt-0.5 text-sm text-ink-600">{doctor.role}</p>
        <p className="mt-4 flex gap-2 text-sm leading-6 text-ink-600">
          <Award className="mt-0.5 size-4 shrink-0 text-accent-500" aria-hidden="true" />
          {doctor.fellowship}
        </p>
        <div className="mt-auto flex flex-wrap items-center gap-3 pt-6">
          <ButtonLink to={`/book-appointment?doctor=${doctor.slug}`} size="sm" icon={<CalendarCheck className="size-4" aria-hidden="true" />}>
            Book
          </ButtonLink>
          <Link to={doctorPath(doctor.slug)} className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:gap-2 transition-all">
            View profile <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  )
}

// --- Centres -------------------------------------------------------------------------------------

export function CentreCard({ centre, showLink = true }: { centre: Centre; showLink?: boolean }) {
  return (
    <article className="relative flex h-full flex-col overflow-hidden rounded-[2rem] bg-white p-7 shadow-card ring-1 ring-ink-100 sm:p-8">
      <div className="slats-soft absolute inset-0" aria-hidden="true" />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">RUA Bengaluru</p>
          <h3 className="mt-2 text-2xl sm:text-3xl">{centre.area}</h3>
        </div>
        {centre.isNew && (
          <span className="rounded-full bg-accent-100 px-3 py-1 text-xs font-bold tracking-wide text-accent-700 ring-1 ring-accent-200">New</span>
        )}
      </div>
      <address className="relative mt-5 flex gap-3 text-[0.95rem] leading-7 text-ink-700 not-italic">
        <MapPin className="mt-1.5 size-4 shrink-0 text-brand-600" aria-hidden="true" />
        <span>
          {centre.addressLines.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </span>
      </address>
      <div className="relative mt-4 flex gap-3 text-[0.95rem] text-ink-700">
        <Clock className="mt-1 size-4 shrink-0 text-brand-600" aria-hidden="true" />
        <div>
          <p>
            {BRAND.hours.days} · {BRAND.hours.label}
          </p>
          <OpenStatus className="mt-1" />
        </div>
      </div>
      <a
        href={telHref(centre.phone)}
        data-centre={centre.slug}
        className="relative mt-4 inline-flex items-center gap-3 font-semibold text-ink-900 hover:text-brand-700"
      >
        <Phone className="size-4 text-brand-600" aria-hidden="true" />
        {centre.phoneDisplay}
      </a>
      <div className="relative mt-7 flex flex-wrap gap-2.5 pt-1">
        <ButtonLink to={`/book-appointment?centre=${centre.slug}`} size="sm" variant="accent" icon={<CalendarCheck className="size-4" aria-hidden="true" />}>
          Book here
        </ButtonLink>
        <a
          href={centre.mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-9 items-center gap-1.5 rounded-full border border-ink-200 bg-white px-4 text-sm font-semibold text-ink-800 transition hover:border-brand-300 hover:bg-brand-50"
        >
          <Navigation className="size-4" aria-hidden="true" /> Directions
        </a>
        {showLink && (
          <Link
            to={centrePath(centre.slug)}
            className="inline-flex h-9 items-center gap-1 px-2 text-sm font-semibold text-brand-700 hover:gap-2 transition-all"
          >
            Centre details <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        )}
      </div>
    </article>
  )
}

// --- Services ------------------------------------------------------------------------------------

export function CategoryCard({ category, index = 0 }: { category: Category; index?: number }) {
  const featured = treatmentsInCategory(category.slug).slice(0, 3)
  return (
    <Reveal delay={(index % 3) * 90} className="h-full">
      <article className="group flex h-full flex-col overflow-hidden rounded-[2rem] bg-white shadow-card ring-1 ring-ink-100 transition-all duration-500 hover:-translate-y-1.5 hover:shadow-lift">
        <Link to={categoryPath(category.slug)} className="relative block h-56 overflow-hidden" tabIndex={-1} aria-hidden="true">
          <img
            src={category.image}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-[1.2s] group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-brand-950/80 via-brand-900/20 to-transparent" />
          <span className="absolute top-4 left-4 grid size-11 place-items-center rounded-full bg-cream/95 text-brand-800 shadow-md">
            <BrandIcon name={category.icon} className="size-5" />
          </span>
        </Link>
        <div className="flex flex-1 flex-col p-6 sm:p-7">
          <h3 className="text-2xl">
            <Link to={categoryPath(category.slug)} className="hover:text-brand-700">
              {category.name}
            </Link>
          </h3>
          <p className="mt-3 text-[0.95rem] leading-7 text-ink-600">{category.tagline}</p>
          {featured.length > 0 && (
            <ul className="mt-5 space-y-2 border-t border-ink-100 pt-5">
              {featured.map((t) => (
                <li key={t.slug}>
                  <Link to={treatmentPath(t)} className="group/item flex items-center justify-between gap-3 text-sm font-medium text-ink-800 hover:text-brand-700">
                    {t.name}
                    <ArrowUpRight className="size-4 text-ink-400 transition group-hover/item:text-brand-600" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link
            to={categoryPath(category.slug)}
            className="mt-auto inline-flex items-center gap-1.5 pt-6 text-sm font-semibold text-brand-700 transition-all hover:gap-2.5"
          >
            Explore {category.navName} <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </article>
    </Reveal>
  )
}

export function TreatmentCard({ treatment }: { treatment: Treatment }) {
  return (
    <Link
      to={treatmentPath(treatment)}
      className="group relative flex h-full flex-col overflow-hidden rounded-[1.75rem] bg-white p-6 shadow-card ring-1 ring-ink-100 transition-all duration-300 hover:-translate-y-1 hover:shadow-lift hover:ring-brand-200"
    >
      <div className="flex items-start justify-between gap-4">
        <h3 className="text-xl leading-snug text-ink-900 group-hover:text-brand-700">{treatment.name}</h3>
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-700 ring-1 ring-brand-100 transition group-hover:bg-brand-800 group-hover:text-cream">
          <ArrowUpRight className="size-4" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-3 line-clamp-3 text-sm leading-6 text-ink-600">{treatment.summary}</p>
      <p className="mt-auto pt-4 text-xs font-semibold tracking-wide text-accent-600 uppercase">{treatment.facts[0]?.value}</p>
    </Link>
  )
}

// --- Concern finder ------------------------------------------------------------------------------------

export function ConcernFinder({ tone = 'dark', limit }: { tone?: 'dark' | 'light'; limit?: number }) {
  const items = limit ? CONCERNS.slice(0, limit) : CONCERNS
  return (
    <ul className="flex flex-wrap gap-2.5">
      {items.map((c) => (
        <li key={c.label}>
          <Link
            to={pathForTreatment(c.treatment)}
            className={cn(
              'group inline-flex items-center gap-2.5 rounded-full py-2 pr-4 pl-2 text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5',
              tone === 'light'
                ? 'bg-cream/10 text-cream ring-1 ring-cream/20 hover:bg-cream hover:text-brand-800'
                : 'bg-white text-ink-800 shadow-sm ring-1 ring-ink-200/80 hover:bg-brand-800 hover:text-cream hover:ring-brand-800',
            )}
          >
            <span
              className={cn(
                'grid size-7 place-items-center rounded-full transition-colors',
                tone === 'light' ? 'bg-accent-400/20 text-accent-200 group-hover:bg-brand-800 group-hover:text-cream' : 'bg-brand-50 text-brand-700 group-hover:bg-cream/15 group-hover:text-cream',
              )}
            >
              <BrandIcon name={c.icon} className="size-3.5" />
            </span>
            {c.label}
          </Link>
        </li>
      ))}
    </ul>
  )
}

// --- Proof -----------------------------------------------------------------------------------------------

export function ProofStrip({ tone = 'light' }: { tone?: 'dark' | 'light' }) {
  return (
    <dl className={cn('grid grid-cols-2 gap-px overflow-hidden rounded-[1.75rem] lg:grid-cols-4', tone === 'light' ? 'bg-cream/15' : 'bg-ink-200/70')}>
      {PROOF_POINTS.map((p) => (
        <div key={p.label} className={cn('px-6 py-6 sm:px-8', tone === 'light' ? 'bg-brand-900/60 backdrop-blur' : 'bg-white')}>
          <dt className={cn('text-sm', tone === 'light' ? 'text-cream/70' : 'text-ink-600')}>{p.label}</dt>
          <dd className={cn('mt-1 font-display text-4xl', tone === 'light' ? 'text-gold-gradient' : 'text-brand-800')}>{p.value}</dd>
          <dd className={cn('mt-1 text-xs', tone === 'light' ? 'text-cream/55' : 'text-ink-500')}>{p.detail}</dd>
        </div>
      ))}
    </dl>
  )
}

// --- Testimonials --------------------------------------------------------------------------------------------

export function TestimonialGrid({ doctor }: { doctor?: string }) {
  const items = doctor ? TESTIMONIALS.filter((t) => t.doctor === doctor) : TESTIMONIALS
  return (
    <div className={cn('grid gap-6', items.length > 1 && 'md:grid-cols-2 xl:grid-cols-3')}>
      {items.map((t, i) => {
        const doc = getDoctor(t.doctor)
        return (
          <Reveal key={t.context} delay={i * 100} className="h-full">
            <figure className="relative flex h-full flex-col rounded-[2rem] bg-white p-7 shadow-card ring-1 ring-ink-100 sm:p-8">
              <Quote className="size-9 text-accent-400" aria-hidden="true" />
              <blockquote className="mt-4 flex-1 text-[1.0625rem] leading-8 text-ink-700">“{t.quote}”</blockquote>
              <figcaption className="mt-6 flex items-center gap-3 border-t border-ink-100 pt-5">
                {doc && <img src={doc.photo} alt="" className="size-11 rounded-full bg-brand-800 object-cover object-top" loading="lazy" />}
                <div>
                  <p className="text-sm font-semibold text-ink-900">RUA patient</p>
                  <p className="text-sm text-ink-500">{t.context}</p>
                </div>
              </figcaption>
            </figure>
          </Reveal>
        )
      })}
    </div>
  )
}

// --- Equipment ----------------------------------------------------------------------------------------------------

export function EquipmentGrid({ ids, compact }: { ids?: EquipmentId[]; compact?: boolean }) {
  const items = ids ? EQUIPMENT.filter((e) => ids.includes(e.id)) : EQUIPMENT
  return (
    <div className={cn('grid gap-5 sm:grid-cols-2', compact ? 'lg:grid-cols-3' : 'lg:grid-cols-4')}>
      {items.map((e, i) => (
        <Reveal key={e.id} delay={(i % 4) * 80} className="h-full">
          <article className="group flex h-full flex-col overflow-hidden rounded-[1.75rem] bg-white shadow-card ring-1 ring-ink-100">
            <div className="relative aspect-[4/3] overflow-hidden bg-sand">
              <img src={e.image} alt={e.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
            </div>
            <div className="flex flex-1 flex-col p-5">
              <h3 className="text-lg leading-snug">{e.name}</h3>
              <p className="mt-2 text-sm leading-6 text-ink-600">{e.use}</p>
            </div>
          </article>
        </Reveal>
      ))}
    </div>
  )
}

// --- Research ----------------------------------------------------------------------------------------------------------

export function ResearchList({ doctor }: { doctor?: string }) {
  const items = doctor ? RESEARCH.filter((r) => r.doctors?.includes(doctor as never)) : RESEARCH
  return (
    <ol className="divide-y divide-ink-200/70 overflow-hidden rounded-[1.75rem] border border-ink-200/70 bg-white shadow-card">
      {items.map((r) => (
        <li key={r.url}>
          <a href={r.url} target="_blank" rel="noopener noreferrer" className="group flex gap-5 px-6 py-5 transition hover:bg-brand-50/60 sm:px-8">
            <span className="mt-1 font-display text-2xl text-accent-500">{r.year ?? '—'}</span>
            <span className="flex-1">
              <span className="block font-display text-lg leading-snug text-ink-900 group-hover:text-brand-700">{r.title}</span>
              <span className="mt-1 block text-sm text-ink-500 italic">{r.journal}</span>
              {r.doctors && (
                <span className="mt-2 flex flex-wrap gap-1.5">
                  {r.doctors.map((d) => (
                    <span key={d} className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700 ring-1 ring-brand-100">
                      {getDoctor(d)?.name}
                    </span>
                  ))}
                </span>
              )}
            </span>
            <ArrowUpRight className="mt-1 size-5 shrink-0 text-ink-400 group-hover:text-brand-600" aria-hidden="true" />
          </a>
        </li>
      ))}
    </ol>
  )
}

// --- Instagram -------------------------------------------------------------------------------------------------------------

const TONES: Record<string, string> = {
  cocoa: 'surface-cocoa text-cream',
  greige: 'bg-[#8a7a6d] text-cream',
  cream: 'bg-cream text-brand-800',
}

export function InstagramGrid() {
  const instagram = BRAND.social.find((s) => s.id === 'instagram')!
  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        {INSTAGRAM_POSTS.map((p, i) => (
          <Reveal key={p.title} delay={(i % 6) * 70}>
            <a
              href={instagram.url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                'group relative flex aspect-square flex-col justify-between overflow-hidden rounded-3xl p-4 transition-transform duration-300 hover:-translate-y-1 sm:p-5',
                TONES[p.tone],
              )}
            >
              <img
                src={p.tone === 'cream' ? '/images/rua/brand/rua-mark-cocoa.png' : '/images/rua/brand/rua-mark-gold.png'}
                alt=""
                className="h-5 w-auto self-start opacity-90"
              />
              <span>
                <span className={cn('block font-label text-[0.65rem] font-semibold tracking-[0.16em] uppercase', p.tone === 'cream' ? 'text-brand-600' : 'text-cream/70')}>
                  {p.kicker}
                </span>
                <span
                  className={cn(
                    'mt-1.5 block font-label text-sm leading-tight font-extrabold uppercase sm:text-base',
                    p.tone === 'cream' ? 'text-brand-800' : 'text-accent-300',
                  )}
                >
                  {p.title}
                </span>
              </span>
              <SocialIcon id="instagram" className="absolute top-4 right-4 size-4 opacity-0 transition-opacity group-hover:opacity-80" />
            </a>
          </Reveal>
        ))}
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <span className="text-sm text-ink-500">Highlights:</span>
        {INSTAGRAM_HIGHLIGHTS.map((h) => (
          <a
            key={h}
            href={instagram.url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-white px-3.5 py-1.5 text-sm font-medium text-ink-700 ring-1 ring-ink-200 transition hover:bg-brand-800 hover:text-cream hover:ring-brand-800"
          >
            {h}
          </a>
        ))}
      </div>
    </div>
  )
}

// --- Closing call to action -----------------------------------------------------------------------------------------------------

export function CtaBand({
  title = 'Discover the RUA difference.',
  lead = 'Book a consultation with our expert dermatologists and start your journey to healthier skin.',
  bookTo = '/book-appointment',
  whatsappText = 'Hello RUA Skin & Hair Center, I would like to book a consultation.',
}: {
  title?: string
  lead?: string
  bookTo?: string
  whatsappText?: string
}) {
  return (
    <section className="container-page py-16 sm:py-20">
      <Reveal>
        <div className="surface-cocoa relative isolate overflow-hidden rounded-[2.5rem] px-6 py-14 text-center text-cream sm:px-12 sm:py-20">
          <div className="slats absolute inset-0 -z-10 opacity-70" aria-hidden="true" />
          <img src="/images/rua/brand/rua-mark-gold.png" alt="" aria-hidden="true" className="mx-auto h-12 w-auto opacity-90" />
          <h2 className="mx-auto mt-6 max-w-3xl text-4xl text-cream sm:text-5xl">{title}</h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-cream/75">{lead}</p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <ButtonLink to={bookTo} size="lg" variant="accent" icon={<CalendarCheck className="size-5" aria-hidden="true" />}>
              Book a consultation
            </ButtonLink>
            <a
              href={whatsappLink(whatsappText)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-13 items-center gap-2.5 rounded-full border border-cream/35 px-8 font-semibold text-cream transition hover:border-cream/60 hover:bg-cream/10"
            >
              <WhatsAppIcon className="size-5" aria-hidden="true" /> WhatsApp us
            </a>
          </div>
        </div>
      </Reveal>
    </section>
  )
}
