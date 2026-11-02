import { ArrowRight, BadgeCheck, CalendarCheck, Clock, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  CategoryCard,
  CentreCard,
  ConcernFinder,
  CtaBand,
  DoctorCard,
  EquipmentGrid,
  InstagramGrid,
  ProofStrip,
  ResearchList,
  TestimonialGrid,
  TreatmentCard,
} from '@/components/rua/cards'
import { BrandIcon, OpenStatus, Reveal, SectionHeader } from '@/components/rua/ui'
import { Seo } from '@/components/site/Seo'
import { ButtonLink } from '@/components/ui/Button'
import { WhatsAppIcon } from '@/components/ui/WhatsAppIcon'
import {
  BRAND,
  CATEGORIES,
  CENTRES,
  DOCTORS,
  PHILOSOPHY,
  STORY,
  WHY_RUA,
  getCategory,
  getDoctor,
  treatmentsBySlugs,
} from '@/content/rua'
import { homeMeta } from '@/content/rua/seo'
import { SITE_URL } from '@/content/site'
import { whatsappLink } from '@/utils/rua'

const FEATURED = [
  'fue-hair-transplant',
  'laser-hair-reduction',
  'hydrafacial',
  'prp-hair-treatment',
  'acne-scar-treatment',
  'pigmentation-melasma-treatment',
]

function HeroDoctors() {
  const [eshritha, jeevith, jatin] = [getDoctor('dr-eshritha-c')!, getDoctor('dr-jeevith-c-reddy')!, getDoctor('dr-jatin-k-reddy')!]
  return (
    <div className="relative mx-auto h-[26rem] w-full max-w-[36rem] sm:h-[32rem] lg:h-[37rem]">
      {/* Arch from the RUA mark, with a brushed-gold outline. */}
      <div className="arch absolute inset-x-[6%] top-[4%] bottom-0 bg-gradient-to-b from-brand-600/70 via-brand-700/60 to-brand-900/40" aria-hidden="true" />
      <div className="arch absolute inset-x-[2%] top-0 bottom-0 border border-accent-300/45" aria-hidden="true" />
      <img src="/images/rua/brand/rua-mark-gold.png" alt="" aria-hidden="true" className="absolute top-[9%] left-1/2 w-24 -translate-x-1/2 opacity-80" />
      <img
        src={eshritha.photo}
        alt={`${eshritha.name}, consultant dermatologist`}
        className="absolute bottom-0 -left-[7%] h-[68%] w-auto max-w-none drop-shadow-[0_24px_30px_rgba(0,0,0,0.35)]"
        fetchPriority="high"
      />
      <img
        src={jatin.photo}
        alt={`${jatin.name}, hair transplant surgeon`}
        className="absolute -right-[6%] bottom-0 h-[70%] w-auto max-w-none drop-shadow-[0_24px_30px_rgba(0,0,0,0.35)]"
        fetchPriority="high"
      />
      <img
        src={jeevith.photo}
        alt={`${jeevith.name}, senior consultant dermatologist`}
        className="absolute bottom-0 left-1/2 h-[78%] w-auto max-w-none -translate-x-1/2 drop-shadow-[0_28px_36px_rgba(0,0,0,0.4)]"
        fetchPriority="high"
      />
      <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-brand-900 via-brand-900/70 to-transparent" aria-hidden="true" />

      <div className="animate-float absolute top-[22%] -left-2 hidden rounded-2xl bg-cream/95 px-4 py-3 text-brand-900 shadow-lift backdrop-blur sm:block lg:-left-10">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <BadgeCheck className="size-4 text-accent-600" aria-hidden="true" /> 3 MD (DVL) dermatologists
        </p>
        <p className="mt-0.5 text-xs text-ink-600">Fellowship-trained founders</p>
      </div>
      <div className="animate-float absolute top-[46%] -right-2 hidden rounded-2xl bg-cream/95 px-4 py-3 text-brand-900 shadow-lift backdrop-blur [animation-delay:1.2s] sm:block lg:-right-8">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Clock className="size-4 text-accent-600" aria-hidden="true" /> Open 7 days
        </p>
        <p className="mt-0.5 text-xs text-ink-600">10am – 8pm · 2 centres</p>
      </div>
    </div>
  )
}

export default function HomePage() {
  const meta = homeMeta(SITE_URL)
  const clinical = CATEGORIES.filter((c) => c.slug !== 'premium-packages')
  const packages = getCategory('premium-packages')!

  return (
    <>
      <Seo meta={meta} />

      {/* Hero */}
      <section className="surface-cocoa relative isolate overflow-hidden text-cream">
        <div className="slats absolute inset-0 -z-10 opacity-70" aria-hidden="true" />
        <img
          src="/images/rua/brand/texture-linen.webp"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 -z-10 h-full w-full object-cover opacity-[0.07] mix-blend-screen"
        />
        <div className="container-page grid items-end gap-10 pt-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-6 lg:pt-16">
          <div className="animate-fade-up pb-6 lg:pb-24">
            <OpenStatus tone="light" className="mb-7 md:hidden" />
            <p className="font-display text-2xl text-accent-200 display-italic sm:text-3xl">{BRAND.tagline}</p>
            <h1 className="mt-4 text-[2.6rem] leading-[1.04] text-cream sm:text-6xl xl:text-7xl">
              Doctor-led skin <span className="text-gold-gradient">&amp;</span> hair care in Bangalore
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-cream/80">{BRAND.promise}</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <ButtonLink to="/book-appointment" size="lg" variant="accent" icon={<CalendarCheck className="size-5" aria-hidden="true" />}>
                Book a consultation
              </ButtonLink>
              <a
                href={whatsappLink('Hello RUA Skin & Hair Center, I would like to book a consultation.')}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-13 items-center gap-2.5 rounded-full border border-cream/35 px-8 font-semibold text-cream transition hover:border-cream/60 hover:bg-cream/10"
              >
                <WhatsAppIcon className="size-5" aria-hidden="true" /> WhatsApp us
              </a>
            </div>
            <p className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-cream/65">
              {BRAND.specialities.map((s, i) => (
                <span key={s} className="flex items-center gap-4">
                  {i > 0 && <span className="size-1 rounded-full bg-accent-300" aria-hidden="true" />}
                  {s}
                </span>
              ))}
            </p>
          </div>
          <div className="animate-fade-up [animation-delay:150ms]">
            <HeroDoctors />
          </div>
        </div>
        <div className="container-page relative pb-14">
          <ProofStrip />
        </div>
      </section>

      {/* Concern finder */}
      <section className="container-page relative -mt-px py-14 sm:py-16">
        <Reveal>
          <div className="grid gap-8 rounded-[2rem] bg-white p-7 shadow-card ring-1 ring-ink-100 sm:p-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <div>
              <p className="eyebrow">Start here</p>
              <h2 className="mt-3 text-3xl sm:text-4xl">What would you like help with?</h2>
              <p className="mt-3 leading-7 text-ink-600">
                Choose a concern to see how RUA’s dermatologists treat it — or{' '}
                <Link to="/book-appointment" className="font-semibold text-brand-700 underline underline-offset-4">
                  book a consultation
                </Link>{' '}
                and we’ll guide you.
              </p>
            </div>
            <ConcernFinder />
          </div>
        </Reveal>
      </section>

      {/* Services */}
      <section className="section pt-4">
        <div className="container-page">
          <SectionHeader
            eyebrow="Our expertise. Your confidence."
            title={
              <>
                Advanced skin, hair &amp; aesthetic care — <span className="display-italic text-brand-700">under one roof</span>
              </>
            }
            lead="Six specialities, one team of dermatologists. Every plan starts with a diagnosis and is tailored to you."
            action={
              <ButtonLink to="/services" variant="outline" icon={<ArrowRight className="size-4" aria-hidden="true" />}>
                All services
              </ButtonLink>
            }
          />
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {clinical.map((c, i) => (
              <CategoryCard key={c.slug} category={c} index={i} />
            ))}
          </div>
          <Reveal className="mt-6">
            <Link
              to={`/services/${packages.slug}`}
              className="group relative isolate grid overflow-hidden rounded-[2rem] text-cream shadow-card md:grid-cols-[1.1fr_0.9fr]"
            >
              <div className="surface-cocoa relative p-8 sm:p-10">
                <div className="slats absolute inset-0 -z-10 opacity-60" aria-hidden="true" />
                <p className="eyebrow-light flex items-center gap-2">
                  <Sparkles className="size-3.5" aria-hidden="true" /> {packages.name}
                </p>
                <h3 className="mt-3 text-3xl text-cream sm:text-4xl">Bridal glow, RUA Signature Glow Therapy &amp; lifetime laser packages</h3>
                <p className="mt-4 max-w-xl leading-7 text-cream/75">{packages.tagline} Flexible payment and EMI options.</p>
                <span className="mt-7 inline-flex items-center gap-2 font-semibold text-accent-200 transition-all group-hover:gap-3">
                  Explore packages <ArrowRight className="size-4" aria-hidden="true" />
                </span>
              </div>
              <div className="relative hidden min-h-64 overflow-hidden md:block">
                <img src={packages.image} alt={packages.imageAlt} loading="lazy" className="h-full w-full object-cover transition-transform duration-[1.4s] group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-r from-brand-800 to-transparent" />
              </div>
            </Link>
          </Reveal>
        </div>
      </section>

      {/* Doctors */}
      <section className="section relative bg-cream">
        <div className="slats-soft absolute inset-0" aria-hidden="true" />
        <div className="container-page relative">
          <SectionHeader
            eyebrow="Meet the dream team"
            title={
              <>
                Three dermatologists. <span className="display-italic text-brand-700">One circle of care.</span>
              </>
            }
            lead={STORY.paragraphs[1]}
            action={
              <ButtonLink to="/doctors" variant="outline" icon={<ArrowRight className="size-4" aria-hidden="true" />}>
                About our doctors
              </ButtonLink>
            }
          />
          <div className="grid gap-6 md:grid-cols-3">
            {DOCTORS.map((d, i) => (
              <Reveal key={d.slug} delay={i * 110} className="h-full">
                <DoctorCard doctor={d} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Why RUA */}
      <section className="section">
        <div className="container-page grid gap-12 lg:grid-cols-2 lg:items-center">
          <Reveal>
            <div className="relative">
              <div className="arch overflow-hidden bg-brand-800 shadow-lift">
                <img
                  src="/images/rua/team/rua-founders.webp"
                  alt="Dr. Jatin K Reddy, Dr. Eshritha C and Dr. Jeevith C Reddy, founders of RUA Skin & Hair Center"
                  loading="lazy"
                  className="h-[34rem] w-full object-cover object-top"
                />
              </div>
              <figure className="absolute -bottom-8 left-6 right-6 rounded-3xl bg-white p-6 shadow-lift ring-1 ring-ink-100 sm:left-auto sm:max-w-sm">
                <blockquote className="font-display text-lg leading-snug text-ink-900 italic">“{PHILOSOPHY.lead}”</blockquote>
                <figcaption className="mt-3 text-sm text-ink-500">The RUA founders</figcaption>
              </figure>
            </div>
          </Reveal>
          <div className="pt-6 lg:pt-0">
            <SectionHeader
              eyebrow="Why choose RUA"
              title="Expert skincare, made effective and accessible"
              lead={PHILOSOPHY.paragraphs[0]}
              className="mb-8 sm:mb-10"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              {WHY_RUA.map((w, i) => (
                <Reveal key={w.title} delay={i * 90} className="h-full">
                  <div className="h-full rounded-3xl bg-white p-6 shadow-card ring-1 ring-ink-100">
                    <span className="grid size-11 place-items-center rounded-full bg-brand-800 text-accent-200">
                      <BrandIcon name={w.icon} className="size-5" />
                    </span>
                    <h3 className="mt-4 text-xl">{w.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-ink-600">{w.text}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Featured treatments */}
      <section className="section bg-sand/50">
        <div className="container-page">
          <SectionHeader
            eyebrow="Most-requested treatments"
            title="What Bangalore comes to RUA for"
            lead="From hair restoration to lasers and medi-facials — each treatment has its own page with who it suits, how it works, recovery and FAQs."
          />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {treatmentsBySlugs(FEATURED).map((t, i) => (
              <Reveal key={t.slug} delay={(i % 3) * 90} className="h-full">
                <TreatmentCard treatment={t} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Technology */}
      <section className="section">
        <div className="container-page">
          <SectionHeader
            eyebrow="Specialised machines used at RUA"
            title="Medical-grade technology, in expert hands"
            lead="Every device is chosen for evidence, safety and Indian skin — and operated under dermatologist supervision."
          />
          <EquipmentGrid />
        </div>
      </section>

      {/* Testimonials */}
      <section className="section relative bg-cream">
        <div className="slats-soft absolute inset-0" aria-hidden="true" />
        <div className="container-page relative">
          <SectionHeader eyebrow="What our clients say" title="Care that patients talk about" align="center" />
          <TestimonialGrid />
        </div>
      </section>

      {/* Centres */}
      <section className="section">
        <div className="container-page">
          <SectionHeader
            eyebrow="Our centres"
            title={
              <>
                Your neighbourhood, <span className="display-italic text-brand-700">your RUA.</span>
              </>
            }
            lead={`Two centres in Bengaluru, open ${BRAND.hours.days}, ${BRAND.hours.label}.`}
            action={
              <ButtonLink to="/centers" variant="outline" icon={<ArrowRight className="size-4" aria-hidden="true" />}>
                Compare centres
              </ButtonLink>
            }
          />
          <div className="grid gap-6 lg:grid-cols-2">
            {CENTRES.map((c, i) => (
              <Reveal key={c.slug} delay={i * 120} className="h-full">
                <CentreCard centre={c} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Research + Instagram */}
      <section className="section bg-sand/50">
        <div className="container-page grid gap-14 xl:grid-cols-[1fr_1fr]">
          <div>
            <SectionHeader
              eyebrow="Research papers"
              title="Dermatologists who publish"
              lead="Our doctors contribute to peer-reviewed dermatology research — the same evidence-first thinking goes into every treatment plan."
              className="mb-8"
            />
            <ResearchList />
          </div>
          <div>
            <SectionHeader
              eyebrow="Skin & Hair, Unfiltered"
              title="Doctor-led education on Instagram"
              lead={
                <>
                  Follow{' '}
                  <a href={BRAND.social[0].url} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-700 underline underline-offset-4">
                    {BRAND.social[0].handle}
                  </a>{' '}
                  for myth-busting, procedures and skincare explained by our dermatologists.
                </>
              }
              className="mb-8"
            />
            <InstagramGrid />
          </div>
        </div>
      </section>

      <CtaBand />
    </>
  )
}
