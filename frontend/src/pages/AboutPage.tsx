import { CalendarCheck } from 'lucide-react'
import { CtaBand, DoctorCard, EquipmentGrid, ProofStrip, ResearchList } from '@/components/rua/cards'
import { PageHero, Reveal, SectionHeader } from '@/components/rua/ui'
import { Seo } from '@/components/site/Seo'
import { ButtonLink } from '@/components/ui/Button'
import { BRAND, DOCTORS, LOOKING_AHEAD, PHILOSOPHY, STORY } from '@/content/rua'
import { aboutMeta } from '@/content/rua/seo'
import { SITE_URL } from '@/content/site'

export default function AboutPage() {
  return (
    <>
      <Seo meta={aboutMeta(SITE_URL)} />
      <PageHero
        crumbs={[{ label: 'About us' }]}
        eyebrow="About RUA Skin & Hair Center"
        title={PHILOSOPHY.heading}
        lead={PHILOSOPHY.lead}
        actions={
          <ButtonLink to="/book-appointment" size="lg" variant="accent" icon={<CalendarCheck className="size-5" aria-hidden="true" />}>
            Book a consultation
          </ButtonLink>
        }
        aside={
          <div className="arch overflow-hidden shadow-lift ring-1 ring-accent-300/30">
            <img src="/images/rua/team/rua-founders-team.webp" alt="The three founders of RUA Skin & Hair Center" className="h-[28rem] w-full object-cover object-top" />
          </div>
        }
      >
        <div className="mt-10">
          <ProofStrip />
        </div>
      </PageHero>

      <section className="section">
        <div className="container-page grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <SectionHeader eyebrow="Our philosophy" title={<>Care as a relationship, <span className="display-italic text-brand-700">not a transaction</span></>} />
          <div className="space-y-5 text-lg leading-8 text-ink-700">
            {PHILOSOPHY.paragraphs.map((p) => (
              <Reveal key={p.slice(0, 24)}>
                <p>{p}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="surface-cocoa relative isolate overflow-hidden py-20 text-cream sm:py-24">
        <div className="slats absolute inset-0 -z-10 opacity-60" aria-hidden="true" />
        <div className="container-page grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="eyebrow-light">{STORY.eyebrow}</p>
            <h2 className="mt-4 text-4xl text-cream sm:text-5xl">
              {STORY.heading} — <span className="text-gold-gradient display-italic">welcome to RUA</span>
            </h2>
          </div>
          <div className="space-y-5 text-lg leading-8 text-cream/80">
            {STORY.paragraphs.map((p) => (
              <p key={p.slice(0, 24)}>{p}</p>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container-page">
          <SectionHeader eyebrow="Meet our founders" title="The people behind RUA" align="center" />
          <div className="grid gap-6 md:grid-cols-3">
            {DOCTORS.map((d, i) => (
              <Reveal key={d.slug} delay={i * 100} className="h-full">
                <DoctorCard doctor={d} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section bg-cream">
        <div className="container-page">
          <SectionHeader eyebrow="Specialised machines used at RUA" title="Technology chosen for evidence and safety" />
          <EquipmentGrid />
        </div>
      </section>

      <section className="section">
        <div className="container-page grid gap-12 lg:grid-cols-2">
          <div>
            <SectionHeader eyebrow="Looking ahead" title={LOOKING_AHEAD.heading} className="mb-6" />
            <div className="space-y-5 text-lg leading-8 text-ink-700">
              {LOOKING_AHEAD.paragraphs.map((p) => (
                <p key={p.slice(0, 24)}>{p}</p>
              ))}
            </div>
            <p className="mt-8 font-display text-3xl text-brand-800 italic">{BRAND.tagline}</p>
          </div>
          <div>
            <SectionHeader eyebrow="Research papers" title="Are you a medicine buff? Find papers we have authored." className="mb-6" />
            <ResearchList />
          </div>
        </div>
      </section>

      <CtaBand />
    </>
  )
}
