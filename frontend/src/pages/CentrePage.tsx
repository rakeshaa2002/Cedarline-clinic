import { CalendarCheck, Clock, MapPin, Navigation, Phone } from 'lucide-react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { CategoryCard, CtaBand, DoctorCard, TestimonialGrid } from '@/components/rua/cards'
import { MapEmbed, OpenStatus, PageHero, Reveal, SectionHeader } from '@/components/rua/ui'
import { Seo } from '@/components/site/Seo'
import { ButtonLink } from '@/components/ui/Button'
import { WhatsAppIcon } from '@/components/ui/WhatsAppIcon'
import { BRAND, CATEGORIES, CENTRES, DOCTORS, centrePath, getCentre } from '@/content/rua'
import { centreMeta } from '@/content/rua/seo'
import { SITE_URL } from '@/content/site'
import { telHref, whatsappLink } from '@/utils/rua'

export default function CentrePage() {
  const { slug } = useParams()
  const centre = getCentre(slug)
  if (!centre) return <Navigate to="/centers" replace />
  const other = CENTRES.find((c) => c.slug !== centre.slug)!

  return (
    <>
      <Seo meta={centreMeta(SITE_URL, centre)} />
      <PageHero
        crumbs={[{ label: 'Centres', to: '/centers' }, { label: centre.area }]}
        eyebrow={centre.isNew ? `${centre.name} · Now open` : centre.name}
        title={centre.seo.h1}
        lead={centre.intro}
        actions={
          <>
            <ButtonLink to={`/book-appointment?centre=${centre.slug}`} size="lg" variant="accent" icon={<CalendarCheck className="size-5" aria-hidden="true" />}>
              Book at {centre.area}
            </ButtonLink>
            <a
              href={telHref(centre.phone)}
              data-centre={centre.slug}
              className="inline-flex h-13 items-center gap-2.5 rounded-full border border-cream/35 px-7 font-semibold text-cream transition hover:bg-cream/10"
            >
              <Phone className="size-5" aria-hidden="true" /> {centre.phoneDisplay}
            </a>
          </>
        }
        aside={
          <div className="rounded-[2rem] bg-cream p-6 text-ink-800 shadow-lift sm:p-8">
            <p className="eyebrow">Visit us</p>
            <address className="mt-4 flex gap-3 leading-7 not-italic">
              <MapPin className="mt-1.5 size-4 shrink-0 text-brand-600" aria-hidden="true" />
              <span>
                {centre.addressLines.map((l) => (
                  <span key={l} className="block">
                    {l}
                  </span>
                ))}
              </span>
            </address>
            <div className="mt-4 flex gap-3">
              <Clock className="mt-1 size-4 shrink-0 text-brand-600" aria-hidden="true" />
              <div>
                <p>
                  {BRAND.hours.days} · {BRAND.hours.label}
                </p>
                <OpenStatus className="mt-1" />
              </div>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-2.5">
              <a
                href={centre.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-brand-800 text-sm font-semibold text-cream hover:bg-brand-700"
              >
                <Navigation className="size-4" aria-hidden="true" /> Directions
              </a>
              <a
                href={whatsappLink(`Hello RUA ${centre.area}, I'd like to book a consultation.`)}
                target="_blank"
                rel="noopener noreferrer"
                data-centre={centre.slug}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#25D366] text-sm font-semibold text-white"
              >
                <WhatsAppIcon className="size-4" aria-hidden="true" /> WhatsApp
              </a>
            </div>
          </div>
        }
      />

      <section className="section">
        <div className="container-page grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
          <Reveal>
            <MapEmbed src={centre.mapEmbedUrl} title={`Map showing ${centre.name}`} className="h-[26rem]" />
          </Reveal>
          <Reveal delay={120}>
            <p className="eyebrow">Getting here</p>
            <h2 className="mt-3 text-3xl">How to find {centre.name}</h2>
            <p className="mt-3 text-ink-600">Landmark: {centre.landmark}.</p>
            <ol className="mt-6 space-y-4">
              {centre.directions.map((d, i) => (
                <li key={d} className="flex gap-4">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-800 font-display text-accent-200">{i + 1}</span>
                  <span className="pt-1.5 leading-7 text-ink-700">{d}</span>
                </li>
              ))}
            </ol>
          </Reveal>
        </div>
      </section>

      <section className="section bg-cream">
        <div className="container-page">
          <SectionHeader
            eyebrow={`Dermatologists at RUA ${centre.area}`}
            title="Your doctors"
            lead="RUA’s founding dermatologists consult across both centres — our front desk will confirm your doctor’s day at this centre when you book."
          />
          <div className="grid gap-6 md:grid-cols-3">
            {DOCTORS.map((d) => (
              <DoctorCard key={d.slug} doctor={d} />
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container-page">
          <SectionHeader eyebrow={`Treatments at ${centre.area}`} title="Everything RUA offers, here" />
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {CATEGORIES.map((c, i) => (
              <CategoryCard key={c.slug} category={c} index={i} />
            ))}
          </div>
        </div>
      </section>

      <section className="section bg-sand/50">
        <div className="container-page">
          <SectionHeader eyebrow="What our clients say" title="Patient stories" />
          <TestimonialGrid />
          <p className="mt-10 text-center text-ink-600">
            Closer to {other.area}?{' '}
            <Link to={centrePath(other.slug)} className="font-semibold text-brand-700 underline underline-offset-4">
              Visit {other.name}
            </Link>
          </p>
        </div>
      </section>

      <CtaBand title={`Visit RUA ${centre.area}`} bookTo={`/book-appointment?centre=${centre.slug}`} />
    </>
  )
}
