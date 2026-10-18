import { ArrowRight, Bot, CalendarCheck, CheckCircle2, Clock, MapPin, Phone, Quote } from 'lucide-react'
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
import { hoursSummary, todayHours, useClinicInfo, useDoctors, useServices } from '@/hooks/useClinic'
import { clinicApi } from '@/services/endpoints'

export default function HomePage() {
  const { data: clinic } = useClinicInfo()
  const doctors = useDoctors()
  const services = useServices()
  const testimonials = useApi('testimonials', clinicApi.testimonials)
  const blog = useApi('blog:home', () => clinicApi.blog({ page: 1, page_size: 3 }))
  const today = clinic ? todayHours(clinic.opening_hours) : undefined
  const featuredDoctors = (doctors.data ?? []).slice(0, 4)
  const items = testimonials.data && testimonials.data.length > 0 ? testimonials.data : TESTIMONIALS

  return (
    <>
      <Seo
        title="Dental, Skin, Hair & Family Care in Bengaluru"
        description="Specialist dental, dermatology, hair & scalp, general medicine and paediatric care in Indiranagar, Bengaluru. Meet our doctors, ask our AI assistant and book an appointment."
        path="/"
      />

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Meaningful Architectural Clinic Background Image */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <img
            src="/images/hero-bg.jpg?v=3"
            alt="Cedarline Multispeciality Clinic modern biophilic interior in Bengaluru"
            fetchPriority="high"
            className="size-full object-cover object-[center_35%] transition-all duration-700"
          />
          {/* Subtle readability scrim: enables the clinic architectural background banner to remain vibrant and clearly visible */}
          <div className="absolute inset-0 bg-gradient-to-r from-white/60 via-white/20 to-transparent" />
        </div>

        <div className="container-page relative z-10 grid items-center gap-10 py-12 sm:py-16 lg:min-h-[calc(100svh-6.75rem)] lg:grid-cols-[1.05fr_1fr] lg:gap-14 lg:py-12 xl:gap-20">
          <div className="animate-fade-up">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/90 backdrop-blur-md px-3.5 py-1.5 text-xs font-semibold text-brand-700 shadow-xs ring-1 ring-brand-200/80">
              <MapPin className="size-3.5 text-brand-600" aria-hidden="true" /> Multispeciality clinic · Indiranagar, Bengaluru
            </p>
            <h1 className="mt-6 text-[2.1rem] leading-[1.08] font-extrabold tracking-tight min-[400px]:text-4xl sm:text-5xl lg:text-[3.4rem] xl:text-[3.9rem] 2xl:text-[4.4rem] text-ink-950">
              Specialist care for your <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-700 via-brand-600 to-teal-600">smile, skin and hair</span> — and the whole family.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-ink-800 2xl:max-w-2xl 2xl:text-xl font-medium">
              Dentists, dermatologists, a trichologist, family physicians and a paediatrician working together in one calm,
              modern clinic. Have a question? Our AI assistant answers from the clinic’s own information, any time.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <ButtonLink to="/appointments" variant="accent" size="lg" icon={<CalendarCheck className="size-5" aria-hidden="true" />}>
                Book an appointment
              </ButtonLink>
              <Button variant="white" size="lg" icon={<Bot className="size-5 text-brand-600" aria-hidden="true" />} onClick={() => openChat()}>
                Ask AI Assistant
              </Button>
              <ButtonLink to="/services" variant="outline" size="lg" className="bg-white/85 backdrop-blur-xs hover:bg-white">
                Explore services <ArrowRight className="size-4" aria-hidden="true" />
              </ButtonLink>
            </div>
            <dl className="mt-10 grid max-w-lg grid-cols-3 gap-4 border-t border-ink-200/60 pt-8 sm:gap-6">
              {[
                [doctors.data ? String(doctors.data.length) : '9', 'Specialist doctors'],
                [services.data ? `${services.data.length}+` : '20+', 'Treatments offered'],
                [clinic ? `${clinic.opening_hours.filter((h) => !h.closed).length} days` : '6 days', 'Open every week'],
              ].map(([value, label]) => (
                <div key={label} className="group">
                  <dt className="text-sm text-ink-500 font-medium">{label}</dt>
                  <dd className="order-first font-display text-2xl font-bold text-ink-900 sm:text-3xl tracking-tight transition-transform duration-300 group-hover:scale-105 group-hover:text-brand-700">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative w-full pb-4 lg:pb-0">
            <div className="relative overflow-hidden rounded-[2.25rem] shadow-lift ring-1 ring-ink-100">
              <img
                src="/images/hero-consultation.jpg"
                alt="A Cedarline doctor talking with a patient during a consultation"
                width={1600}
                height={1200}
                fetchPriority="high"
                className="aspect-[4/3] w-full object-cover transition-transform duration-700 ease-out hover:scale-[1.02] lg:max-h-[calc(100svh-12rem)]"
              />

              {/* Clinic hours badge - cleanly anchored inside the bottom-left */}
              <div className="absolute bottom-4 left-4 sm:bottom-5 sm:left-5 flex items-center gap-3 rounded-2xl bg-white/95 backdrop-blur-md p-3.5 pr-5 shadow-lg ring-1 ring-black/5">
                <span className="grid size-10 place-items-center rounded-xl bg-brand-50 text-brand-700 shadow-xs">
                  <Clock className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-xs text-ink-500 font-medium">Clinic hours today</p>
                  <p className="font-bold text-ink-900 text-sm">
                    {today ? (today.closed ? 'Closed today' : `${today.open} – ${today.close}`) : '09:00 – 20:00'}
                  </p>
                </div>
              </div>
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
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 shadow-xs transition-all duration-300 group-hover:scale-110 group-hover:bg-brand-700 group-hover:text-white group-hover:shadow-md">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <span className="block text-sm font-bold text-ink-900 transition-colors group-hover:text-brand-700">{title}</span>
                  <span className="block text-sm text-ink-500 font-medium">{text}</span>
                </div>
              </>
            )
            const cls = 'group flex items-center gap-4 px-3 py-6 transition-all duration-200 hover:bg-brand-50/40 lg:px-6 cursor-pointer'
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
            <img src="/images/clinic-reception.webp" alt="Bright reception area of the clinic" loading="lazy" width={1200} height={900} className="aspect-[4/5] w-full rounded-3xl object-cover shadow-sm" />
            <img src="/images/care-team.jpg" alt="Cedarline specialist doctor in modern outpatient clinic" loading="lazy" width={1200} height={900} className="mt-10 aspect-[4/5] w-full rounded-3xl object-cover shadow-lift hover:scale-[1.02] transition-transform duration-500" />
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
            {items.map((t) => (
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
          <p className="mt-6 text-center text-xs text-ink-500 font-medium">Verified patient feedback from Cedarline Multispeciality Clinic consultations.</p>
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
