import { Award, CalendarCheck, CheckCircle2, GraduationCap, MapPin, Stethoscope } from 'lucide-react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { CtaBand, DoctorCard, DoctorPortrait, ResearchList, TestimonialGrid, TreatmentCard } from '@/components/rua/cards'
import { OpenStatus, PageHero, Reveal, SectionHeader } from '@/components/rua/ui'
import { Seo } from '@/components/site/Seo'
import { ButtonLink } from '@/components/ui/Button'
import { WhatsAppIcon } from '@/components/ui/WhatsAppIcon'
import { BRAND, CENTRES, DOCTORS, RESEARCH, TESTIMONIALS, centrePath, getCategory, getDoctor, treatmentsBySlugs } from '@/content/rua'
import { doctorMeta } from '@/content/rua/seo'
import { SITE_URL } from '@/content/site'
import { whatsappLink } from '@/utils/rua'

export default function DoctorPage() {
  const { slug } = useParams()
  const doctor = getDoctor(slug)
  if (!doctor) return <Navigate to="/doctors" replace />

  const treatments = treatmentsBySlugs(doctor.treatments)
  const papers = RESEARCH.filter((r) => r.doctors?.includes(doctor.slug))
  const stories = TESTIMONIALS.filter((t) => t.doctor === doctor.slug)
  const colleagues = DOCTORS.filter((d) => d.slug !== doctor.slug)

  return (
    <>
      <Seo meta={doctorMeta(SITE_URL, doctor)} />
      <PageHero
        crumbs={[{ label: 'Doctors', to: '/doctors' }, { label: doctor.name }]}
        eyebrow={`Meet ${doctor.persona.toLowerCase()}`}
        title={doctor.name}
        lead={
          <>
            <p className="text-xl text-cream">{doctor.role}</p>
            <p className="mt-3 font-display text-lg text-accent-200 italic">“{doctor.personaLine}”</p>
          </>
        }
        actions={
          <>
            <ButtonLink to={`/book-appointment?doctor=${doctor.slug}`} size="lg" variant="accent" icon={<CalendarCheck className="size-5" aria-hidden="true" />}>
              Book with {doctor.shortName}
            </ButtonLink>
            <a
              href={whatsappLink(`Hello RUA, I'd like to book a consultation with ${doctor.name}.`)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-13 items-center gap-2.5 rounded-full border border-cream/35 px-7 font-semibold text-cream transition hover:bg-cream/10"
            >
              <WhatsAppIcon className="size-5" aria-hidden="true" /> WhatsApp
            </a>
          </>
        }
        aside={<DoctorPortrait doctor={doctor} eager className="mx-auto h-[26rem] w-full max-w-md lg:h-[32rem]" />}
      >
        <div className="mt-8 flex flex-wrap gap-2.5">
          <span className="inline-flex items-center gap-2 rounded-full bg-cream/10 px-4 py-2 text-sm font-semibold text-cream ring-1 ring-cream/20">
            <GraduationCap className="size-4 text-accent-300" aria-hidden="true" /> {doctor.qualifications}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-cream/10 px-4 py-2 text-sm font-semibold text-cream ring-1 ring-cream/20">
            <Award className="size-4 text-accent-300" aria-hidden="true" /> {doctor.fellowship}
          </span>
        </div>
      </PageHero>

      <section className="section">
        <div className="container-page grid gap-12 lg:grid-cols-[1.2fr_0.8fr]">
          <Reveal>
            <p className="eyebrow">About</p>
            <h2 className="mt-3 text-3xl sm:text-4xl">About {doctor.name}</h2>
            <div className="mt-6 space-y-4 text-lg leading-8 text-ink-700">
              <p>{doctor.personaLine}</p>
              {doctor.bio.map((p) => (
                <p key={p.slice(0, 24)}>{p}</p>
              ))}
            </div>
            <h3 className="mt-10 text-2xl">Areas of focus</h3>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {doctor.focus.map((f) => (
                <li key={f} className="flex items-start gap-3 rounded-2xl bg-white p-4 shadow-card ring-1 ring-ink-100">
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-accent-500" aria-hidden="true" />
                  <span className="text-[0.95rem] text-ink-800">{f}</span>
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={120}>
            <div className="space-y-5">
              <div className="rounded-[1.75rem] bg-white p-6 shadow-card ring-1 ring-ink-100">
                <p className="flex items-center gap-2 font-display text-xl text-ink-900">
                  <Stethoscope className="size-5 text-brand-600" aria-hidden="true" /> Credentials
                </p>
                <dl className="mt-4 space-y-3 text-sm">
                  <div>
                    <dt className="text-ink-500">Qualifications</dt>
                    <dd className="font-semibold text-ink-900">{doctor.qualifications}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-500">Fellowship</dt>
                    <dd className="font-semibold text-ink-900">{doctor.fellowship}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-500">Specialities</dt>
                    <dd className="font-semibold text-ink-900">{doctor.categories.map((c) => getCategory(c)?.name).filter(Boolean).join(' · ')}</dd>
                  </div>
                </dl>
              </div>
              <div className="rounded-[1.75rem] bg-cream p-6 ring-1 ring-brand-100">
                <p className="flex items-center gap-2 font-display text-xl text-ink-900">
                  <MapPin className="size-5 text-brand-600" aria-hidden="true" /> Consults at
                </p>
                <ul className="mt-4 space-y-3">
                  {CENTRES.map((c) => (
                    <li key={c.slug}>
                      <Link to={centrePath(c.slug)} className="block rounded-2xl bg-white p-4 ring-1 ring-ink-100 hover:ring-brand-300">
                        <span className="block font-semibold text-ink-900">{c.name}</span>
                        <span className="mt-0.5 block text-sm text-ink-600">{c.addressLines[0]}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-sm text-ink-600">
                  {BRAND.hours.days}, {BRAND.hours.label}
                </p>
                <OpenStatus className="mt-2" />
                <p className="mt-3 text-xs leading-5 text-ink-500">Our front desk confirms which centre and day your doctor is available when you book.</p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {treatments.length > 0 && (
        <section className="section bg-sand/50">
          <div className="container-page">
            <SectionHeader eyebrow="Treatments" title={`Treatments with ${doctor.shortName}`} />
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {treatments.map((t, i) => (
                <Reveal key={t.slug} delay={(i % 3) * 80} className="h-full">
                  <TreatmentCard treatment={t} />
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {(papers.length > 0 || stories.length > 0) && (
        <section className="section">
          <div className="container-page grid gap-14 lg:grid-cols-2">
            {papers.length > 0 && (
              <div>
                <SectionHeader eyebrow="Research" title="Published work" className="mb-8" />
                <ResearchList doctor={doctor.slug} />
              </div>
            )}
            {stories.length > 0 && (
              <div className={papers.length ? undefined : 'lg:col-span-2'}>
                <SectionHeader eyebrow="Patient stories" title="What patients say" className="mb-8" />
                <TestimonialGrid doctor={doctor.slug} />
              </div>
            )}
          </div>
        </section>
      )}

      <section className="section bg-cream">
        <div className="container-page">
          <SectionHeader eyebrow="The RUA team" title="Meet the rest of the team" />
          <div className="grid gap-6 md:grid-cols-2">
            {colleagues.map((d) => (
              <DoctorCard key={d.slug} doctor={d} />
            ))}
          </div>
        </div>
      </section>

      <CtaBand
        title={`Book a consultation with ${doctor.name}`}
        lead="Choose your centre and a preferred time — our team confirms your appointment on WhatsApp."
        bookTo={`/book-appointment?doctor=${doctor.slug}`}
        whatsappText={`Hello RUA, I'd like to book a consultation with ${doctor.name}.`}
      />
    </>
  )
}
