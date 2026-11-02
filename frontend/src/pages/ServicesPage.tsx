import { ArrowRight, ArrowUpRight, CalendarCheck, Check } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ConcernFinder, CtaBand, TreatmentCard } from '@/components/rua/cards'
import { BrandIcon, FaqList, PageHero, Reveal, SectionHeader } from '@/components/rua/ui'
import { Seo } from '@/components/site/Seo'
import { ButtonLink } from '@/components/ui/Button'
import { CATEGORIES, GENERAL_FAQS, TREATMENTS, categoryPath, pathForTreatment, treatmentsBySlugs } from '@/content/rua'
import { servicesMeta } from '@/content/rua/seo'
import { SITE_URL } from '@/content/site'

const POPULAR = ['fue-hair-transplant', 'laser-hair-reduction', 'hydrafacial', 'prp-hair-treatment', 'acne-scar-treatment', 'skin-boosters']

export default function ServicesPage() {
  return (
    <>
      <Seo meta={servicesMeta(SITE_URL)} />
      <PageHero
        crumbs={[{ label: 'Services' }]}
        eyebrow="Our expertise. Your confidence."
        title="Skin, Hair & Laser Treatments in Bangalore"
        lead="Explore a wide range of advanced skin, hair, and aesthetic treatments tailored to your needs — every one planned and supervised by RUA’s dermatologists."
        actions={
          <ButtonLink to="/book-appointment" size="lg" variant="accent" icon={<CalendarCheck className="size-5" aria-hidden="true" />}>
            Book a consultation
          </ButtonLink>
        }
        aside={
          <div className="rounded-[2rem] bg-cream/5 p-6 ring-1 ring-cream/15 backdrop-blur sm:p-8">
            <p className="eyebrow-light">What would you like help with?</p>
            <div className="mt-5">
              <ConcernFinder tone="light" limit={8} />
            </div>
          </div>
        }
      />

      {/* Category index */}
      <nav aria-label="Service categories" className="sticky top-[4.5rem] z-30 border-b border-ink-200/60 bg-ivory/90 backdrop-blur md:top-[7rem] lg:top-[7.5rem]">
        <ul className="container-page flex gap-2 overflow-x-auto py-3 [scrollbar-width:none]">
          {CATEGORIES.map((c) => (
            <li key={c.slug} className="shrink-0">
              <a
                href={`#${c.slug}`}
                className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-ink-700 ring-1 ring-ink-200 transition hover:bg-brand-800 hover:text-cream hover:ring-brand-800"
              >
                <BrandIcon name={c.icon} className="size-4" />
                {c.navName}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="container-page space-y-8 py-14 sm:py-20">
        {CATEGORIES.map((c, index) => (
          <Reveal key={c.slug}>
            <section id={c.slug} className="scroll-mt-48 overflow-hidden rounded-[2rem] bg-white shadow-card ring-1 ring-ink-100">
              <div className="grid lg:grid-cols-[0.9fr_1.1fr]">
                <div className={index % 2 ? 'lg:order-2' : undefined}>
                  <div className="relative h-60 lg:h-full lg:min-h-[26rem]">
                    <img src={c.image} alt={c.imageAlt} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-brand-950/85 via-brand-900/30 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-7 text-cream sm:p-9">
                      <span className="grid size-12 place-items-center rounded-full bg-cream/95 text-brand-800">
                        <BrandIcon name={c.icon} className="size-5" />
                      </span>
                      <h2 className="mt-4 text-3xl text-cream sm:text-4xl">{c.name}</h2>
                      <p className="mt-2 max-w-md text-cream/80">{c.tagline}</p>
                    </div>
                  </div>
                </div>
                <div className="p-7 sm:p-10">
                  <p className="leading-7 text-ink-600">{c.intro}</p>
                  <ul className="mt-6 grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
                    {c.items.map((item) => (
                      <li key={item.name}>
                        {item.treatment ? (
                          <Link to={pathForTreatment(item.treatment)} className="group flex items-start gap-2.5 text-[0.95rem] font-medium text-ink-800 hover:text-brand-700">
                            <Check className="mt-1 size-4 shrink-0 text-accent-500" aria-hidden="true" />
                            <span className="underline decoration-ink-200 underline-offset-4 group-hover:decoration-brand-400">{item.name}</span>
                          </Link>
                        ) : (
                          <span className="flex items-start gap-2.5 text-[0.95rem] text-ink-700">
                            <Check className="mt-1 size-4 shrink-0 text-accent-500" aria-hidden="true" />
                            {item.name}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-8 flex flex-wrap gap-3">
                    <ButtonLink to={categoryPath(c.slug)} icon={<ArrowRight className="size-4" aria-hidden="true" />}>
                      Explore {c.navName}
                    </ButtonLink>
                    <ButtonLink to={`/book-appointment?category=${c.slug}`} variant="outline">
                      Book a consultation
                    </ButtonLink>
                  </div>
                </div>
              </div>
            </section>
          </Reveal>
        ))}
      </div>

      <section className="section bg-sand/50">
        <div className="container-page">
          <SectionHeader
            eyebrow="Popular treatments"
            title="Treatment guides"
            lead={`${TREATMENTS.length} in-depth guides covering who each treatment suits, how it works at RUA, recovery, cost and FAQs.`}
          />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {treatmentsBySlugs(POPULAR).map((t) => (
              <TreatmentCard key={t.slug} treatment={t} />
            ))}
          </div>
          <div className="mt-10 rounded-[2rem] bg-white p-7 ring-1 ring-ink-100 sm:p-9">
            <p className="font-display text-xl text-ink-900">All treatment guides</p>
            <ul className="mt-5 grid gap-x-8 gap-y-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {TREATMENTS.map((t) => (
                <li key={t.slug}>
                  <Link to={pathForTreatment(t.slug)} className="group inline-flex items-center gap-1.5 text-[0.95rem] text-ink-700 hover:text-brand-700">
                    {t.name}
                    <ArrowUpRight className="size-3.5 text-ink-400 group-hover:text-brand-600" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container-page grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <SectionHeader eyebrow="Good to know" title="Frequently asked questions" lead="Everything you need before your first visit to RUA." />
          <FaqList faqs={GENERAL_FAQS} />
        </div>
      </section>

      <CtaBand />
    </>
  )
}
