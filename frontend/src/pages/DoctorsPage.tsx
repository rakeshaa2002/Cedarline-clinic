import { ArrowRight, Award, CalendarCheck, GraduationCap } from 'lucide-react'
import { Link } from 'react-router-dom'
import { CtaBand, DoctorPortrait, ResearchList } from '@/components/rua/cards'
import { PageHero, Reveal, SectionHeader } from '@/components/rua/ui'
import { Seo } from '@/components/site/Seo'
import { ButtonLink } from '@/components/ui/Button'
import { DOCTORS, STORY, doctorPath, treatmentPath, treatmentsBySlugs } from '@/content/rua'
import { doctorsMeta } from '@/content/rua/seo'
import { SITE_URL } from '@/content/site'
import { cn } from '@/utils/format'

export default function DoctorsPage() {
  return (
    <>
      <Seo meta={doctorsMeta(SITE_URL)} />
      <PageHero
        crumbs={[{ label: 'Doctors' }]}
        eyebrow="Our founders"
        title="Meet RUA’s dermatologists"
        lead="Three colleagues with different strengths in dermatology — hair restoration and dermatosurgery, lasers and aesthetics, and clinical and longevity medicine — who came together to create one circle of care."
        actions={
          <ButtonLink to="/book-appointment" size="lg" variant="accent" icon={<CalendarCheck className="size-5" aria-hidden="true" />}>
            Book a consultation
          </ButtonLink>
        }
        aside={
          <div className="arch overflow-hidden shadow-lift ring-1 ring-accent-300/30">
            <img
              src="/images/rua/team/rua-founders-team.webp"
              alt="Dr. Jatin K Reddy, Dr. Eshritha C and Dr. Jeevith C Reddy — founders of RUA Skin & Hair Center"
              className="h-[26rem] w-full object-cover object-top lg:h-[30rem]"
            />
          </div>
        }
      />

      <section className="section">
        <div className="container-page grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <SectionHeader eyebrow={STORY.eyebrow} title={STORY.heading} />
          <div className="space-y-5 text-lg leading-8 text-ink-700">
            {STORY.paragraphs.map((p) => (
              <p key={p.slice(0, 24)}>{p}</p>
            ))}
          </div>
        </div>
      </section>

      <div className="space-y-6 pb-8">
        {DOCTORS.map((d, i) => (
          <section key={d.slug} className={cn('py-12 sm:py-16', i % 2 === 0 && 'bg-cream')}>
            <div className="container-page grid gap-10 lg:grid-cols-[0.75fr_1.25fr] lg:items-center">
              <Reveal className={i % 2 ? 'lg:order-2' : undefined}>
                <Link to={doctorPath(d.slug)} className="group block" aria-label={`${d.name} — full profile`}>
                  <DoctorPortrait doctor={d} className="mx-auto h-[28rem] max-w-md" />
                </Link>
              </Reveal>
              <Reveal delay={120}>
                <p className="eyebrow">Meet {d.persona.toLowerCase()}</p>
                <h2 className="mt-3 text-4xl sm:text-5xl">
                  <Link to={doctorPath(d.slug)} className="hover:text-brand-700">
                    {d.name}
                  </Link>
                </h2>
                <p className="mt-3 text-lg text-ink-700">{d.role}</p>
                <div className="mt-5 flex flex-wrap gap-2.5">
                  <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-brand-800 ring-1 ring-brand-100">
                    <GraduationCap className="size-4 text-accent-600" aria-hidden="true" /> {d.qualifications}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-brand-800 ring-1 ring-brand-100">
                    <Award className="size-4 text-accent-600" aria-hidden="true" /> {d.fellowship}
                  </span>
                </div>
                <p className="mt-6 font-display text-xl leading-snug text-ink-900 italic">“{d.personaLine}”</p>
                {d.bio.map((p) => (
                  <p key={p.slice(0, 24)} className="mt-4 leading-8 text-ink-700">
                    {p}
                  </p>
                ))}
                <div className="mt-6 flex flex-wrap gap-2">
                  {treatmentsBySlugs(d.treatments)
                    .slice(0, 6)
                    .map((t) => (
                      <Link
                        key={t.slug}
                        to={treatmentPath(t)}
                        className="rounded-full bg-white px-3.5 py-1.5 text-sm text-ink-700 ring-1 ring-ink-200 transition hover:bg-brand-800 hover:text-cream hover:ring-brand-800"
                      >
                        {t.name}
                      </Link>
                    ))}
                </div>
                <div className="mt-8 flex flex-wrap gap-3">
                  <ButtonLink to={`/book-appointment?doctor=${d.slug}`} icon={<CalendarCheck className="size-4" aria-hidden="true" />}>
                    Book with {d.shortName}
                  </ButtonLink>
                  <ButtonLink to={doctorPath(d.slug)} variant="outline" icon={<ArrowRight className="size-4" aria-hidden="true" />}>
                    Full profile
                  </ButtonLink>
                </div>
              </Reveal>
            </div>
          </section>
        ))}
      </div>

      <section className="section">
        <div className="container-page grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <SectionHeader
            eyebrow="Research papers"
            title="Published by our team"
            lead="Peer-reviewed work by RUA’s dermatologists in Indian and international dermatology journals."
          />
          <ResearchList />
        </div>
      </section>

      <CtaBand />
    </>
  )
}
