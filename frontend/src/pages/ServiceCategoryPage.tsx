import { ArrowRight, CalendarCheck, Check } from 'lucide-react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { CentreCard, CtaBand, DoctorCard, EquipmentGrid, TreatmentCard } from '@/components/rua/cards'
import { BrandIcon, FaqList, PageHero, Reveal, SectionHeader } from '@/components/rua/ui'
import { Seo } from '@/components/site/Seo'
import { ButtonLink } from '@/components/ui/Button'
import { WhatsAppIcon } from '@/components/ui/WhatsAppIcon'
import { CATEGORIES, CENTRES, categoryPath, doctorsBySlugs, getCategory, pathForTreatment, treatmentsInCategory } from '@/content/rua'
import { categoryMeta } from '@/content/rua/seo'
import { SITE_URL } from '@/content/site'
import { whatsappLink } from '@/utils/rua'

export default function ServiceCategoryPage() {
  const { category: slug } = useParams()
  const category = getCategory(slug)
  if (!category) return <Navigate to="/services" replace />

  const treatments = treatmentsInCategory(category.slug)
  const doctors = doctorsBySlugs(category.doctors)
  const others = CATEGORIES.filter((c) => c.slug !== category.slug)

  return (
    <>
      <Seo meta={categoryMeta(SITE_URL, category)} />
      <PageHero
        crumbs={[{ label: 'Services', to: '/services' }, { label: category.name }]}
        eyebrow={category.name}
        title={category.seo.h1}
        lead={category.tagline}
        actions={
          <>
            <ButtonLink to={`/book-appointment?category=${category.slug}`} size="lg" variant="accent" icon={<CalendarCheck className="size-5" aria-hidden="true" />}>
              Book a consultation
            </ButtonLink>
            <a
              href={whatsappLink(`Hello RUA, I'd like to know more about ${category.name}.`)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-13 items-center gap-2.5 rounded-full border border-cream/35 px-7 font-semibold text-cream transition hover:bg-cream/10"
            >
              <WhatsAppIcon className="size-5" aria-hidden="true" /> Ask on WhatsApp
            </a>
          </>
        }
        aside={
          <div className="arch relative h-80 overflow-hidden shadow-lift ring-1 ring-accent-300/30 lg:h-[26rem]">
            <img src={category.image} alt={category.imageAlt} className="animate-slow-zoom h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-brand-950/70 to-transparent" />
            <span className="absolute bottom-6 left-1/2 grid size-14 -translate-x-1/2 place-items-center rounded-full bg-cream text-brand-800 shadow-lg">
              <BrandIcon name={category.icon} className="size-6" />
            </span>
          </div>
        }
      />

      <section className="section">
        <div className="container-page grid gap-12 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <SectionHeader eyebrow={`${category.navName} at RUA`} title="What we treat" lead={category.intro} className="mb-6" />
            <div className="rounded-3xl bg-cream/70 p-6 ring-1 ring-brand-100">
              <p className="text-sm font-semibold text-brand-800">Led by</p>
              <div className="mt-3 flex flex-wrap gap-3">
                {doctors.map((d) => (
                  <Link key={d.slug} to={`/doctors/${d.slug}`} className="flex items-center gap-2.5 rounded-full bg-white py-1.5 pr-4 pl-1.5 ring-1 ring-ink-100 hover:ring-brand-300">
                    <img src={d.photo} alt="" className="size-9 rounded-full bg-brand-800 object-cover object-top" />
                    <span className="text-sm font-semibold text-ink-900">{d.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
          <Reveal>
            <ul className="grid gap-3 sm:grid-cols-2">
              {category.items.map((item) => {
                const inner = (
                  <>
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-700 ring-1 ring-brand-100">
                      <Check className="size-4" aria-hidden="true" />
                    </span>
                    <span className="flex-1 text-[0.95rem] leading-6 font-medium text-ink-800">{item.name}</span>
                    {item.treatment && <ArrowRight className="mt-1 size-4 shrink-0 text-brand-500" aria-hidden="true" />}
                  </>
                )
                return (
                  <li key={item.name}>
                    {item.treatment ? (
                      <Link
                        to={pathForTreatment(item.treatment)}
                        className="flex h-full items-start gap-3 rounded-2xl bg-white p-4 shadow-card ring-1 ring-ink-100 transition hover:-translate-y-0.5 hover:ring-brand-300"
                      >
                        {inner}
                      </Link>
                    ) : (
                      <div className="flex h-full items-start gap-3 rounded-2xl bg-white/70 p-4 ring-1 ring-ink-100">{inner}</div>
                    )}
                  </li>
                )
              })}
            </ul>
          </Reveal>
        </div>
      </section>

      {treatments.length > 0 && (
        <section className="section bg-sand/50">
          <div className="container-page">
            <SectionHeader eyebrow="Treatment guides" title={`Explore ${category.navName.toLowerCase()} treatments`} />
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {treatments.map((t, i) => (
                <Reveal key={t.slug} delay={(i % 3) * 90} className="h-full">
                  <TreatmentCard treatment={t} />
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="section">
        <div className="container-page">
          <SectionHeader eyebrow="Your doctors" title={`${category.navName} specialists at RUA`} />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {doctors.map((d) => (
              <DoctorCard key={d.slug} doctor={d} />
            ))}
          </div>
        </div>
      </section>

      {category.equipment.length > 0 && (
        <section className="section bg-cream">
          <div className="container-page">
            <SectionHeader eyebrow="Technology" title="Equipment we use" />
            <EquipmentGrid ids={category.equipment} compact />
          </div>
        </section>
      )}

      <section className="section">
        <div className="container-page grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <SectionHeader eyebrow="FAQs" title={`${category.name}: your questions answered`} />
          <FaqList faqs={category.faqs} />
        </div>
      </section>

      <section className="section bg-sand/50">
        <div className="container-page">
          <SectionHeader eyebrow="Available at both centres" title="Visit RUA in Bengaluru" />
          <div className="grid gap-6 lg:grid-cols-2">
            {CENTRES.map((c) => (
              <CentreCard key={c.slug} centre={c} />
            ))}
          </div>
          <div className="mt-14">
            <p className="eyebrow">Other specialities</p>
            <div className="mt-4 flex flex-wrap gap-2.5">
              {others.map((c) => (
                <Link
                  key={c.slug}
                  to={categoryPath(c.slug)}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-ink-700 ring-1 ring-ink-200 hover:bg-brand-800 hover:text-cream"
                >
                  <BrandIcon name={c.icon} className="size-4" />
                  {c.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <CtaBand bookTo={`/book-appointment?category=${category.slug}`} />
    </>
  )
}
