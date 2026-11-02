import { ArrowRight, CalendarCheck, Check, IndianRupee, Info, Phone, ShieldCheck, Sparkles } from 'lucide-react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { CentreCard, CtaBand, DoctorPortrait, EquipmentGrid, TestimonialGrid, TreatmentCard } from '@/components/rua/cards'
import { FaqList, PageHero, Reveal, SectionHeader } from '@/components/rua/ui'
import { Seo } from '@/components/site/Seo'
import { ButtonLink } from '@/components/ui/Button'
import { WhatsAppIcon } from '@/components/ui/WhatsAppIcon'
import {
  BRAND,
  CENTRES,
  TESTIMONIALS,
  categoryPath,
  doctorPath,
  doctorsBySlugs,
  getCategory,
  getTreatment,
  treatmentPath,
  treatmentsBySlugs,
} from '@/content/rua'
import { treatmentMeta } from '@/content/rua/seo'
import { SITE_URL } from '@/content/site'
import { telHref, whatsappLink } from '@/utils/rua'

export default function TreatmentPage() {
  const { category: categorySlug, treatment: slug } = useParams()
  const treatment = getTreatment(slug)
  if (!treatment) return <Navigate to={categorySlug ? `/services/${categorySlug}` : '/services'} replace />
  // One canonical URL per treatment: fix a wrong category segment.
  if (treatment.category !== categorySlug) return <Navigate to={treatmentPath(treatment)} replace />

  const category = getCategory(treatment.category)!
  const doctors = doctorsBySlugs(treatment.doctors)
  const related = treatmentsBySlugs(treatment.related)
  const bookTo = `/book-appointment?treatment=${treatment.slug}`
  const waText = `Hello RUA Skin & Hair Center, I'd like to know more about ${treatment.name}.`
  const hasTestimonial = treatment.slug === 'vitiligo-surgery' && TESTIMONIALS.some((t) => t.context.startsWith('Vitiligo'))

  return (
    <>
      <Seo meta={treatmentMeta(SITE_URL, treatment)} />
      <PageHero
        crumbs={[
          { label: 'Services', to: '/services' },
          { label: category.name, to: categoryPath(category.slug) },
          { label: treatment.name },
        ]}
        eyebrow={category.name}
        title={treatment.h1}
        lead={<p>{treatment.summary}</p>}
        actions={
          <>
            <ButtonLink to={bookTo} size="lg" variant="accent" icon={<CalendarCheck className="size-5" aria-hidden="true" />}>
              Book a consultation
            </ButtonLink>
            <a
              href={whatsappLink(waText)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-13 items-center gap-2.5 rounded-full border border-cream/35 px-7 font-semibold text-cream transition hover:bg-cream/10"
            >
              <WhatsAppIcon className="size-5" aria-hidden="true" /> Ask on WhatsApp
            </a>
          </>
        }
        aside={
          <div className="rounded-[2rem] bg-cream p-6 text-ink-800 shadow-lift sm:p-8">
            <p className="eyebrow">Key facts</p>
            <dl className="mt-4 divide-y divide-ink-200/70">
              {treatment.facts.map((f) => (
                <div key={f.label} className="grid grid-cols-[0.9fr_1.1fr] gap-4 py-3">
                  <dt className="text-sm text-ink-500">{f.label}</dt>
                  <dd className="text-sm font-semibold text-ink-900">{f.value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-ink-500">
              <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" /> Typical figures — your dermatologist confirms your plan at consultation.
            </p>
          </div>
        }
      >
        <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-cream/75">
          {['MD (DVL) dermatologists', 'Both Bengaluru centres', 'Open 7 days', 'EMI options'].map((t) => (
            <li key={t} className="flex items-center gap-2">
              <Check className="size-4 text-accent-300" aria-hidden="true" /> {t}
            </li>
          ))}
        </ul>
      </PageHero>

      <div className="container-page grid gap-12 py-14 sm:py-20 lg:grid-cols-[1fr_22rem] xl:gap-16">
        <article className="min-w-0 space-y-16">
          {/* Who it's for */}
          <Reveal>
            <section aria-labelledby="who">
              <p className="eyebrow">{treatment.whoForTitle ? 'Pricing' : 'Is it right for me?'}</p>
              <h2 id="who" className="mt-3 text-3xl sm:text-4xl">
                {treatment.whoForTitle ?? `Who ${treatment.name} is for`}
              </h2>
              <ul className="mt-7 grid gap-3 sm:grid-cols-2">
                {treatment.whoFor.map((w) => (
                  <li key={w} className="flex items-start gap-3 rounded-2xl bg-white p-4 shadow-card ring-1 ring-ink-100">
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand-800 text-accent-200">
                      <Check className="size-3.5" aria-hidden="true" />
                    </span>
                    <span className="text-[0.95rem] leading-6 text-ink-800">{w}</span>
                  </li>
                ))}
              </ul>
            </section>
          </Reveal>

          {/* Steps */}
          <Reveal>
            <section aria-labelledby="steps">
              <p className="eyebrow">The RUA approach</p>
              <h2 id="steps" className="mt-3 text-3xl sm:text-4xl">
                {treatment.stepsTitle ?? 'How it works at RUA'}
              </h2>
              <ol className="relative mt-8 space-y-5 before:absolute before:top-2 before:bottom-2 before:left-6 before:w-px before:bg-gradient-to-b before:from-accent-400 before:to-brand-200">
                {treatment.steps.map((s, i) => (
                  <li key={s.title} className="relative flex gap-5">
                    <span className="relative z-10 grid size-12 shrink-0 place-items-center rounded-full bg-brand-800 font-display text-lg text-accent-200 ring-4 ring-ivory">
                      {i + 1}
                    </span>
                    <div className="flex-1 rounded-2xl bg-white p-5 shadow-card ring-1 ring-ink-100">
                      <h3 className="text-xl">{s.title}</h3>
                      <p className="mt-1.5 leading-7 text-ink-600">{s.text}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          </Reveal>

          {/* Results + cost */}
          <Reveal>
            <section className="grid gap-5 md:grid-cols-2" aria-label="Results and cost">
              <div className="rounded-[1.75rem] bg-cream p-7 ring-1 ring-brand-100">
                <span className="grid size-11 place-items-center rounded-full bg-brand-800 text-accent-200">
                  <Sparkles className="size-5" aria-hidden="true" />
                </span>
                <h2 className="mt-4 text-2xl">Results &amp; recovery</h2>
                <p className="mt-3 leading-7 text-ink-700">{treatment.results}</p>
              </div>
              <div className="rounded-[1.75rem] bg-white p-7 shadow-card ring-1 ring-ink-100">
                <span className="grid size-11 place-items-center rounded-full bg-accent-100 text-accent-700">
                  <IndianRupee className="size-5" aria-hidden="true" />
                </span>
                <h2 className="mt-4 text-2xl">Cost &amp; payment</h2>
                <p className="mt-3 leading-7 text-ink-700">{treatment.cost}</p>
                <a href={whatsappLink(`Hello RUA, could you share the cost of ${treatment.name}?`)} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-brand-700 hover:underline">
                  <WhatsAppIcon className="size-4" aria-hidden="true" /> Ask for a personalised quote
                </a>
              </div>
            </section>
          </Reveal>

          {/* Doctors */}
          <Reveal>
            <section aria-labelledby="doctors">
              <p className="eyebrow">Who treats you</p>
              <h2 id="doctors" className="mt-3 text-3xl sm:text-4xl">
                Your doctors for {treatment.name}
              </h2>
              <div className="mt-7 grid gap-5 sm:grid-cols-2">
                {doctors.map((d) => (
                  <Link key={d.slug} to={doctorPath(d.slug)} className="group flex items-center gap-5 rounded-[1.75rem] bg-white p-4 shadow-card ring-1 ring-ink-100 transition hover:ring-brand-300">
                    <DoctorPortrait doctor={d} className="h-32 w-28 shrink-0" />
                    <span>
                      <span className="eyebrow">{d.persona}</span>
                      <span className="mt-1 block font-display text-xl text-ink-900 group-hover:text-brand-700">{d.name}</span>
                      <span className="mt-0.5 block text-sm font-semibold text-brand-700">{d.qualifications}</span>
                      <span className="mt-1 block text-sm text-ink-600">{d.fellowship}</span>
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          </Reveal>

          {treatment.equipment && treatment.equipment.length > 0 && (
            <section aria-labelledby="tech">
              <p className="eyebrow">Technology</p>
              <h2 id="tech" className="mt-3 mb-7 text-3xl sm:text-4xl">
                Equipment used
              </h2>
              <EquipmentGrid ids={treatment.equipment} compact />
            </section>
          )}

          {hasTestimonial && (
            <section aria-labelledby="stories">
              <p className="eyebrow">Patient story</p>
              <h2 id="stories" className="mt-3 mb-7 text-3xl sm:text-4xl">
                In our patients’ words
              </h2>
              <TestimonialGrid doctor="dr-eshritha-c" />
            </section>
          )}

          {/* FAQs */}
          <section aria-labelledby="faqs">
            <p className="eyebrow">FAQs</p>
            <h2 id="faqs" className="mt-3 mb-7 text-3xl sm:text-4xl">
              {treatment.name}: common questions
            </h2>
            <FaqList faqs={treatment.faqs} />
          </section>

          <p className="flex items-start gap-3 rounded-2xl bg-sand/60 p-5 text-sm leading-6 text-ink-600">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-brand-600" aria-hidden="true" />
            This page is general information, not medical advice. Your dermatologist will recommend what suits you after a consultation, and results vary from person to person.
          </p>
        </article>

        {/* Sticky booking card */}
        <aside className="lg:sticky lg:top-36 lg:self-start">
          <div className="surface-cocoa relative isolate overflow-hidden rounded-[2rem] p-7 text-cream shadow-lift">
            <div className="slats absolute inset-0 -z-10 opacity-60" aria-hidden="true" />
            <p className="eyebrow-light">Book {treatment.name}</p>
            <p className="mt-3 font-display text-2xl leading-snug">Start with a consultation</p>
            <p className="mt-2 text-sm leading-6 text-cream/70">Choose your centre, doctor and a time that suits you — it takes under a minute.</p>
            <ButtonLink to={bookTo} variant="accent" className="mt-6 w-full" icon={<CalendarCheck className="size-4" aria-hidden="true" />}>
              Book appointment
            </ButtonLink>
            <a
              href={whatsappLink(waText)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-full border border-cream/30 text-sm font-semibold transition hover:bg-cream/10"
            >
              <WhatsAppIcon className="size-4" aria-hidden="true" /> WhatsApp {BRAND.whatsappDisplay}
            </a>
            <div className="mt-6 space-y-2 border-t border-cream/15 pt-5">
              {CENTRES.map((c) => (
                <a key={c.slug} href={telHref(c.phone)} data-centre={c.slug} className="flex items-center justify-between text-sm text-cream/80 hover:text-cream">
                  <span className="flex items-center gap-2">
                    <Phone className="size-3.5 text-accent-300" aria-hidden="true" /> {c.area}
                  </span>
                  <span className="font-semibold">{c.phoneDisplay}</span>
                </a>
              ))}
            </div>
          </div>
          {related.length > 0 && (
            <div className="mt-6 rounded-[2rem] bg-white p-6 ring-1 ring-ink-100">
              <p className="text-sm font-semibold text-ink-900">Related treatments</p>
              <ul className="mt-3 space-y-1">
                {related.map((r) => (
                  <li key={r.slug}>
                    <Link to={treatmentPath(r)} className="group flex items-center justify-between rounded-xl px-3 py-2.5 text-sm text-ink-700 hover:bg-brand-50 hover:text-brand-700">
                      {r.name}
                      <ArrowRight className="size-4 text-ink-400 group-hover:text-brand-600" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
                <li>
                  <Link to={categoryPath(category.slug)} className="block rounded-xl px-3 py-2.5 text-sm font-semibold text-brand-700 hover:bg-brand-50">
                    All {category.navName} →
                  </Link>
                </li>
              </ul>
            </div>
          )}
        </aside>
      </div>

      {related.length > 0 && (
        <section className="section bg-sand/50">
          <div className="container-page">
            <SectionHeader eyebrow="Keep exploring" title="You may also be interested in" />
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((r) => (
                <TreatmentCard key={r.slug} treatment={r} />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="section">
        <div className="container-page">
          <SectionHeader eyebrow="Where" title={`${treatment.name} in Bengaluru`} lead="Available at both RUA centres, open every day from 10am to 8pm." />
          <div className="grid gap-6 lg:grid-cols-2">
            {CENTRES.map((c) => (
              <CentreCard key={c.slug} centre={c} />
            ))}
          </div>
        </div>
      </section>

      <CtaBand bookTo={bookTo} whatsappText={waText} />
    </>
  )
}
