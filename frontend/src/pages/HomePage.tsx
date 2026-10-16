import { ArrowRight, Bot, CalendarCheck, CheckCircle2, Clock, MapPin, Phone, Quote, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { openChat } from '@/components/chat/openChat'
import { BlogCard, DoctorCard } from '@/components/site/Cards'
import { CtaBanner } from '@/components/site/CtaBanner'
import { Seo } from '@/components/site/Seo'
import { Button, ButtonLink } from '@/components/ui/Button'
import { ErrorState, Skeleton } from '@/components/ui/Feedback'
import { SectionHeading } from '@/components/ui/Layout'
import { BOOKING_STEPS, DEPARTMENTS, TESTIMONIALS, WHY_CHOOSE } from '@/content/site'
import { useApi } from '@/hooks/useApi'
import { hoursSummary, todayHours, useClinicInfo, useDoctors } from '@/hooks/useClinic'
import { clinicApi } from '@/services/endpoints'

export default function HomePage() {
  const { data: clinic } = useClinicInfo()
  const doctors = useDoctors()
  const blog = useApi('blog:home', () => clinicApi.blog({ page: 1, page_size: 3 }))
  const today = clinic ? todayHours(clinic.opening_hours) : undefined
  const featuredDoctors = doctors.data
    ? ['meera-iyer', 'naomi-fernandes', 'sara-thomas', 'ananya-rao']
        .map((slug) => doctors.data!.find((d) => d.slug === slug))
        .filter((d) => d !== undefined)
    : []

  return (
    <>
      <Seo
        title="Dental, Skin, Hair & Family Care in Bengaluru"
        description="Specialist dental, dermatology, hair & scalp, general medicine and paediatric care in Indiranagar, Bengaluru. Meet our doctors, ask our AI assistant and book an appointment."
        path="/"
      />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-50/70 to-white">
        <div className="container-page grid items-center gap-10 py-12 sm:py-16 lg:min-h-[calc(100svh-6.75rem)] lg:grid-cols-[1.05fr_1fr] lg:gap-14 lg:py-12 xl:gap-20">
          <div className="animate-fade-up">
            <p className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-brand-700 shadow-sm ring-1 ring-brand-100">
              <MapPin className="size-3.5" aria-hidden="true" /> Multispeciality clinic · Indiranagar, Bengaluru
            </p>
            <h1 className="mt-6 text-[2.1rem] leading-[1.08] font-extrabold min-[400px]:text-4xl sm:text-5xl lg:text-[3.4rem] xl:text-[3.9rem] 2xl:text-[4.4rem]">
              Specialist care for your <span className="text-brand-700">smile, skin and hair</span> — and the whole family.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-ink-600 2xl:max-w-2xl 2xl:text-xl">
              Dentists, dermatologists, a trichologist, family physicians and a paediatrician working together in one calm,
              modern clinic. Have a question? Our AI assistant answers from the clinic’s own information, any time.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <ButtonLink to="/appointments" variant="accent" size="lg" icon={<CalendarCheck className="size-5" aria-hidden="true" />}>
                Book an appointment
              </ButtonLink>
              <ButtonLink to="/services" variant="outline" size="lg">
                Explore services <ArrowRight className="size-4" aria-hidden="true" />
              </ButtonLink>
            </div>
            <dl className="mt-10 grid max-w-lg grid-cols-3 gap-4 border-t border-ink-100 pt-8 sm:gap-6">
              {[
                ['9', 'Specialist doctors'],
                ['20+', 'Treatments offered'],
                ['6 days', 'Open every week'],
              ].map(([value, label]) => (
                <div key={label}>
                  <dt className="text-sm text-ink-500">{label}</dt>
                  <dd className="order-first font-display text-2xl font-bold text-ink-900 sm:text-3xl">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative w-full">
            <div className="overflow-hidden rounded-[2rem] shadow-lift">
              <img
                src="/images/hero-consultation.webp"
                alt="A Cedarline doctor talking with a patient during a consultation"
                width={1600}
                height={1200}
                fetchPriority="high"
                className="aspect-[4/3] w-full object-cover lg:max-h-[calc(100svh-12rem)]"
              />
            </div>
            <div className="absolute -bottom-6 left-4 flex items-center gap-3 rounded-2xl bg-white p-4 pr-6 shadow-lift sm:-left-6">
              <span className="grid size-11 place-items-center rounded-xl bg-brand-50 text-brand-700">
                <Clock className="size-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs text-ink-500">Clinic hours today</p>
                <p className="font-semibold text-ink-900">
                  {today ? (today.closed ? 'Closed today' : `${today.open} – ${today.close}`) : '—'}
                </p>
              </div>
            </div>
            <div className="absolute -top-5 right-4 hidden items-center gap-2.5 rounded-2xl bg-white px-4 py-3 shadow-lift sm:flex">
              <ShieldCheck className="size-5 text-brand-600" aria-hidden="true" />
              <p className="text-sm font-semibold text-ink-800">AI assistant, answers any time</p>
            </div>
          </div>
        </div>
      </section>

      {/* Quick info strip */}
      <section aria-label="Clinic quick information" className="border-y border-ink-100 bg-white">
        <div className="container-page grid divide-ink-100 sm:grid-cols-2 lg:grid-cols-4 lg:divide-x">
          {[
            { icon: Clock, title: 'Opening hours', text: clinic ? hoursSummary(clinic.opening_hours) : '—', to: '/contact' },
            { icon: MapPin, title: 'Location', text: clinic ? `${clinic.address_line.split(',').slice(-1)[0].trim()}, ${clinic.city}` : 'Indiranagar, Bengaluru', to: '/contact' },
            { icon: Phone, title: 'Call the front desk', text: clinic?.phone ?? '—', href: clinic ? `tel:${clinic.phone.replace(/\s/g, '')}` : undefined },
            { icon: CalendarCheck, title: 'Book an appointment', text: 'By phone, email or at reception', to: '/appointments' },
          ].map(({ icon: Icon, title, text, to, href }) => {
            const inner = (
              <>
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 transition-colors group-hover:bg-brand-700 group-hover:text-white">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-ink-900">{title}</span>
                  <span className="block text-sm text-ink-500">{text}</span>
                </span>
              </>
            )
            const cls = 'group flex items-center gap-4 px-2 py-6 lg:px-6'
            return href ? (
              <a key={title} href={href} className={cls}>
                {inner}
              </a>
            ) : (
              <Link key={title} to={to!} className={cls}>
                {inner}
              </Link>
            )
          })}
        </div>
      </section>

      {/* Introduction */}
      <section className="section">
        <div className="container-page grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <div className="grid grid-cols-2 gap-4">
            <img src="/images/clinic-reception.webp" alt="Bright reception area of the clinic" loading="lazy" width={1200} height={900} className="aspect-[4/5] w-full rounded-3xl object-cover" />
            <img src="/images/care-team.webp" alt="Two clinicians reviewing a scan together" loading="lazy" width={1200} height={900} className="mt-10 aspect-[4/5] w-full rounded-3xl object-cover" />
          </div>
          <div>
            <p className="eyebrow mb-3">Welcome to Cedarline</p>
            <h2 className="text-3xl font-bold sm:text-4xl">One clinic for the specialists your family sees most</h2>
            <p className="mt-5 text-lg leading-8 text-ink-600">
              Cedarline brings dental care, dermatology, hair & scalp care, family medicine and paediatrics together on
              one floor. Your doctors share notes and refer to each other, so care stays joined-up and you spend less
              time travelling between appointments.
            </p>
            <ul className="mt-7 space-y-3">
              {['Consultants with 8–18 years of experience', 'Published starting prices for every service', 'Evening and Saturday appointments'].map((item) => (
                <li key={item} className="flex items-center gap-3 text-ink-700">
                  <CheckCircle2 className="size-5 text-brand-600" aria-hidden="true" /> {item}
                </li>
              ))}
            </ul>
            <ButtonLink to="/about" variant="outline" className="mt-9">
              About the clinic <ArrowRight className="size-4" aria-hidden="true" />
            </ButtonLink>
          </div>
        </div>
      </section>

      {/* Featured services */}
      <section className="section bg-ink-50/70">
        <div className="container-page">
          <SectionHeading
            eyebrow="Our specialities"
            title="Care across five departments"
            description="From routine check-ups to specialist procedures, every treatment starts with an unhurried consultation."
            action={
              <ButtonLink to="/services" variant="outline">
                View all services <ArrowRight className="size-4" aria-hidden="true" />
              </ButtonLink>
            }
          />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {DEPARTMENTS.map((d) => (
              <Link
                key={d.key}
                to={d.to}
                className="group flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-ink-100 bg-white shadow-card transition-shadow hover:shadow-lift"
              >
                <div className="aspect-[4/3] overflow-hidden">
                  <img src={d.image} alt="" loading="lazy" width={1000} height={800} className="size-full object-cover transition-transform duration-500 group-hover:scale-105" />
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <h3 className="text-lg font-bold">{d.title}</h3>
                  <p className="mt-2 flex-1 text-sm leading-6 text-ink-600">{d.summary}</p>
                  <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700">
                    Learn more <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Doctors */}
      <section className="section">
        <div className="container-page">
          <SectionHeading
            eyebrow="Meet the team"
            title="Experienced doctors who take time to explain"
            action={
              <ButtonLink to="/doctors" variant="outline">
                All doctors <ArrowRight className="size-4" aria-hidden="true" />
              </ButtonLink>
            }
          />
          {doctors.error ? (
            <ErrorState message={doctors.error.message} onRetry={doctors.reload} />
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {doctors.loading
                ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[30rem]" />)
                : featuredDoctors.map((d) => <DoctorCard key={d.id} doctor={d} />)}
            </div>
          )}
        </div>
      </section>

      {/* Why choose us */}
      <section className="section bg-brand-900 text-white">
        <div className="container-page">
          <div className="mb-12 max-w-2xl">
            <p className="mb-3 text-xs font-semibold tracking-[0.14em] text-brand-200 uppercase">Why Cedarline</p>
            <h2 className="text-3xl font-bold text-white sm:text-4xl">Thoughtful care, from booking to follow-up</h2>
          </div>
          <div className="grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {WHY_CHOOSE.map(({ icon: Icon, title, text }) => (
              <div key={title} className="flex gap-4">
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white/10 text-brand-200 ring-1 ring-white/10">
                  <Icon className="size-6" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="text-lg font-semibold text-white">{title}</h3>
                  <p className="mt-1.5 text-sm leading-6 text-brand-100/80">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How booking works */}
      <section className="section">
        <div className="container-page">
          <SectionHeading eyebrow="Booking made simple" title="Book an appointment in three steps" align="center" />
          <ol className="grid gap-6 md:grid-cols-3">
            {BOOKING_STEPS.map((step, i) => (
              <li key={step.title} className="relative rounded-[var(--radius-card)] border border-ink-100 bg-white p-7 shadow-card">
                <span className="font-display text-5xl font-extrabold text-brand-100" aria-hidden="true">
                  0{i + 1}
                </span>
                <h3 className="mt-3 text-lg font-bold">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-ink-600">{step.text}</p>
              </li>
            ))}
          </ol>
          <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
            <ButtonLink to="/appointments" variant="accent" size="lg">
              How to book
            </ButtonLink>
            <Button variant="outline" size="lg" icon={<Bot className="size-5" aria-hidden="true" />} onClick={() => openChat()}>
              Ask the AI assistant
            </Button>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="section bg-ink-50/70" aria-labelledby="testimonials-title">
        <div className="container-page">
          <SectionHeading eyebrow="Patient stories" title={<span id="testimonials-title">What our patients say</span>} align="center" />
          <div className="grid gap-6 md:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <figure key={t.name} className="flex flex-col rounded-[var(--radius-card)] border border-ink-100 bg-white p-7 shadow-card">
                <Quote className="size-8 text-accent-400" aria-hidden="true" />
                <blockquote className="mt-4 flex-1 leading-7 text-ink-700">“{t.quote}”</blockquote>
                <figcaption className="mt-6 border-t border-ink-100 pt-4 text-sm">
                  <span className="font-semibold text-ink-900">{t.name}</span>
                  <span className="text-ink-500"> · {t.detail}</span>
                </figcaption>
              </figure>
            ))}
          </div>
          <p className="mt-6 text-center text-xs text-ink-400">Testimonials are fictional examples for this demo website.</p>
        </div>
      </section>

      {/* Blog */}
      <section className="section">
        <div className="container-page">
          <SectionHeading
            eyebrow="Patient education"
            title="Helpful reading from our doctors"
            action={
              <ButtonLink to="/blog" variant="outline">
                All articles <ArrowRight className="size-4" aria-hidden="true" />
              </ButtonLink>
            }
          />
          {blog.error ? (
            <ErrorState message={blog.error.message} onRetry={blog.reload} />
          ) : (
            <div className="grid gap-6 md:grid-cols-3">
              {blog.loading || !blog.data
                ? Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-96" />)
                : blog.data.items.map((post) => <BlogCard key={post.id} post={post} />)}
            </div>
          )}
        </div>
      </section>

      <CtaBanner />
    </>
  )
}
