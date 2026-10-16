import { CalendarCheck, CheckCircle2, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { DoctorCard, ServiceCard } from '@/components/site/Cards'
import { CtaBanner } from '@/components/site/CtaBanner'
import { DoctorProfileModal } from '@/components/site/DoctorProfileModal'
import { PageHero } from '@/components/site/PageHero'
import { Seo } from '@/components/site/Seo'
import { ButtonLink } from '@/components/ui/Button'
import { ErrorState, Skeleton } from '@/components/ui/Feedback'
import { SectionHeading } from '@/components/ui/Layout'
import { useDoctors, useServices } from '@/hooks/useClinic'
import type { Department, Doctor } from '@/types'

export interface DepartmentConfig {
  department: Department
  path: string
  seoTitle: string
  seoDescription: string
  eyebrow: string
  title: string
  description: string
  heroImage: string
  introTitle: string
  intro: string[]
  introImage: string
  highlights: string[]
  journey: { title: string; text: string }[]
  faqs: { q: string; a: string }[]
}

/** Shared template for the Dental, Skin and Hair pages: same structure, department-specific content. */
export function DepartmentPage({ config }: { config: DepartmentConfig }) {
  const services = useServices(config.department)
  const doctors = useDoctors(config.department)
  const [selected, setSelected] = useState<Doctor | null>(null)
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  return (
    <>
      <Seo title={config.seoTitle} description={config.seoDescription} path={config.path} image={config.heroImage} />
      <PageHero
        eyebrow={config.eyebrow}
        title={config.title}
        description={config.description}
        crumbs={[{ label: 'Services', to: '/services' }, { label: config.seoTitle }]}
        image={config.heroImage}
      >
        <ButtonLink to="/appointments" variant="accent" size="lg" icon={<CalendarCheck className="size-5" aria-hidden="true" />}>
          Book a consultation
        </ButtonLink>
        <ButtonLink to="/doctors" variant="white" size="lg">
          Meet the team
        </ButtonLink>
      </PageHero>

      <section className="section">
        <div className="container-page grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <div>
            <p className="eyebrow mb-3">Overview</p>
            <h2 className="text-3xl font-bold sm:text-4xl">{config.introTitle}</h2>
            <div className="mt-6 space-y-4 text-lg leading-8 text-ink-600">
              {config.intro.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {config.highlights.map((h) => (
                <li key={h} className="flex gap-2.5 text-sm font-medium text-ink-800">
                  <CheckCircle2 className="size-5 shrink-0 text-brand-600" aria-hidden="true" /> {h}
                </li>
              ))}
            </ul>
          </div>
          <img src={config.introImage} alt="" loading="lazy" width={1000} height={800} className="aspect-[5/4] w-full rounded-[2rem] object-cover shadow-lift" />
        </div>
      </section>

      <section className="section bg-ink-50/70">
        <div className="container-page">
          <SectionHeading eyebrow="Treatments" title="What we offer" description="Typical durations and indicative starting prices. Your doctor confirms the plan and cost at consultation." />
          {services.error ? (
            <ErrorState message={services.error.message} onRetry={services.reload} />
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              {services.loading
                ? Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-72" />)
                : services.data?.map((s) => <ServiceCard key={s.id} service={s} />)}
            </div>
          )}
        </div>
      </section>

      <section className="section">
        <div className="container-page">
          <SectionHeading eyebrow="Your visit" title="What to expect" align="center" />
          <ol className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {config.journey.map((step, i) => (
              <li key={step.title} className="rounded-[var(--radius-card)] border border-ink-100 bg-white p-6 shadow-card">
                <span className="grid size-10 place-items-center rounded-full bg-brand-700 font-display font-bold text-white">{i + 1}</span>
                <h3 className="mt-4 font-bold">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-ink-600">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section bg-ink-50/70">
        <div className="container-page">
          <SectionHeading eyebrow="Specialists" title="Your doctors" />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {doctors.loading
              ? Array.from({ length: 2 }, (_, i) => <Skeleton key={i} className="h-[30rem]" />)
              : doctors.data?.map((d) => <DoctorCard key={d.id} doctor={d} onViewProfile={setSelected} />)}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container-page max-w-3xl">
          <SectionHeading eyebrow="FAQ" title="Common questions" align="center" />
          <div className="divide-y divide-ink-100 rounded-[var(--radius-card)] border border-ink-100 bg-white shadow-card">
            {config.faqs.map((faq, i) => {
              const open = openFaq === i
              return (
                <div key={faq.q}>
                  <h3>
                    <button
                      type="button"
                      aria-expanded={open}
                      aria-controls={`faq-${i}`}
                      onClick={() => setOpenFaq(open ? null : i)}
                      className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left font-semibold text-ink-900 hover:text-brand-700"
                    >
                      {faq.q}
                      <ChevronDown className={`size-5 shrink-0 text-ink-400 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
                    </button>
                  </h3>
                  <div id={`faq-${i}`} hidden={!open} className="px-6 pb-5 leading-7 text-ink-600">
                    {faq.a}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <DoctorProfileModal doctor={selected} onClose={() => setSelected(null)} />
      <CtaBanner />
    </>
  )
}
