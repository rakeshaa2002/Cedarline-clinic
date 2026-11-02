import { CalendarCheck } from 'lucide-react'
import { CentreCard, CtaBand } from '@/components/rua/cards'
import { MapEmbed, OpenStatus, PageHero, Reveal, SectionHeader } from '@/components/rua/ui'
import { Seo } from '@/components/site/Seo'
import { ButtonLink } from '@/components/ui/Button'
import { BRAND, CENTRES } from '@/content/rua'
import { centresMeta } from '@/content/rua/seo'
import { SITE_URL } from '@/content/site'

export default function CentresPage() {
  return (
    <>
      <Seo meta={centresMeta(SITE_URL)} />
      <PageHero
        crumbs={[{ label: 'Centres' }]}
        eyebrow="Your neighbourhood, your RUA."
        title="Skin & hair clinics in Bangalore"
        lead={`Two RUA centres — Ramamurthy Nagar and Indiranagar — with the same dermatologists, the same standards of hygiene and safety, and the same hours: ${BRAND.hours.days}, ${BRAND.hours.label}.`}
        actions={
          <ButtonLink to="/book-appointment" size="lg" variant="accent" icon={<CalendarCheck className="size-5" aria-hidden="true" />}>
            Book at either centre
          </ButtonLink>
        }
      >
        <OpenStatus tone="light" className="mt-8" />
      </PageHero>

      <section className="section">
        <div className="container-page space-y-16">
          {CENTRES.map((c, i) => (
            <Reveal key={c.slug}>
              <div className="grid gap-6 lg:grid-cols-2 lg:items-stretch">
                <div className={i % 2 ? 'lg:order-2' : undefined}>
                  <CentreCard centre={c} />
                </div>
                <MapEmbed src={c.mapEmbedUrl} title={`Map showing ${c.name}`} className="min-h-80" />
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="section bg-cream">
        <div className="container-page">
          <SectionHeader eyebrow="Same care, both centres" title="What you’ll find at every RUA centre" align="center" />
          <div className="grid gap-5 md:grid-cols-3">
            {[
              ['Dermatologist-led care', 'All consultations and procedures are planned by MD (DVL) dermatologists.'],
              ['Safe & sterile', 'Uncompromised quality, hygiene and safety in every procedure room.'],
              ['Open every day', `${BRAND.hours.days}, ${BRAND.hours.label}. Call or WhatsApp to confirm your doctor’s availability.`],
            ].map(([title, text], i) => (
              <Reveal key={title} delay={i * 90}>
                <div className="h-full rounded-3xl bg-white p-7 text-center shadow-card ring-1 ring-ink-100">
                  <img src="/images/rua/brand/rua-mark-gold.png" alt="" className="mx-auto h-7 w-auto" />
                  <h3 className="mt-4 text-xl">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-ink-600">{text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <CtaBand />
    </>
  )
}
