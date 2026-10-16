import { CheckCircle2 } from 'lucide-react'
import { DoctorCard } from '@/components/site/Cards'
import { CtaBanner } from '@/components/site/CtaBanner'
import { PageHero } from '@/components/site/PageHero'
import { Seo } from '@/components/site/Seo'
import { ButtonLink } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Feedback'
import { SectionHeading } from '@/components/ui/Layout'
import { FACILITIES, VALUES } from '@/content/site'
import { useApi } from '@/hooks/useApi'
import { useClinicInfo, useDoctors } from '@/hooks/useClinic'
import { clinicApi } from '@/services/endpoints'

export default function AboutPage() {
  const { data: clinic } = useClinicInfo()
  const doctors = useDoctors()
  const highlights = useApi('clinic:highlights', clinicApi.highlights)
  const leads = (doctors.data ?? []).slice(0, 3)
  const valuesList = highlights.data?.values ? highlights.data.values.map(v => {
    const orig = VALUES.find(o => o.title === v.title)
    return { icon: orig?.icon ?? VALUES[0].icon, title: v.title, text: v.text }
  }) : VALUES
  const facilitiesList = highlights.data?.facilities ?? FACILITIES

  return (
    <>
      <Seo
        title="About the Clinic"
        description="Learn about Cedarline Multispeciality Clinic in Indiranagar, Bengaluru: our approach to care, our facilities and the specialists behind it."
        path="/about"
      />
      <PageHero
        eyebrow="About us"
        title="Joined-up specialist care, close to home"
        description="Cedarline was set up so families could see the specialists they need most — dentists, dermatologists, hair specialists, physicians and a paediatrician — in one place."
        crumbs={[{ label: 'About the Clinic' }]}
        image="/images/clinic-reception.webp"
      />

      <section className="section">
        <div className="container-page grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <div>
            <p className="eyebrow mb-3">Our story</p>
            <h2 className="text-3xl font-bold sm:text-4xl">Built around how families actually use healthcare</h2>
            <div className="mt-6 space-y-5 text-lg leading-8 text-ink-600">
              <p>{clinic?.about ?? 'Cedarline Multispeciality Clinic is an outpatient clinic offering general medicine, paediatrics, dental care, dermatology and hair & scalp care.'}</p>
              <p>
                Instead of a large hospital, we chose a calm outpatient setting with specialist rooms, so appointments
                run on time and every visit feels personal. When you need care we don't provide, we refer you to trusted
                hospitals nearby.
              </p>
            </div>
          </div>
          <img
            src="/images/care-team.jpg"
            alt="Cedarline specialist doctor and clinical care team in modern outpatient clinic"
            loading="lazy"
            width={1200}
            height={900}
            className="aspect-[4/3] w-full rounded-[2rem] object-cover shadow-lift hover:scale-[1.01] transition-transform duration-500"
          />
        </div>
      </section>

      <section className="section bg-ink-50/70">
        <div className="container-page">
          <SectionHeading eyebrow="What we believe" title="Our approach to care" align="center" />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {valuesList.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-[var(--radius-card)] border border-ink-100 bg-white p-7 shadow-card">
                <span className="grid size-12 place-items-center rounded-2xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">
                  <Icon className="size-6" aria-hidden="true" />
                </span>
                <h3 className="mt-5 text-lg font-bold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-ink-600">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container-page grid items-center gap-12 lg:grid-cols-[1fr_1.1fr] lg:gap-20">
          <img
            src="/images/dental-suite.webp"
            alt="A modern dental treatment room"
            loading="lazy"
            width={1600}
            height={1000}
            className="order-last aspect-[4/3] w-full rounded-[2rem] object-cover lg:order-first"
          />
          <div>
            <p className="eyebrow mb-3">Facilities</p>
            <h2 className="text-3xl font-bold sm:text-4xl">Modern rooms and equipment for everyday specialist care</h2>
            <ul className="mt-8 grid gap-4 sm:grid-cols-2">
              {facilitiesList.map((f) => (
                <li key={f} className="flex gap-3 rounded-2xl border border-ink-100 bg-white p-4 text-sm font-medium text-ink-800">
                  <CheckCircle2 className="size-5 shrink-0 text-brand-600" aria-hidden="true" /> {f}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="section bg-ink-50/70">
        <div className="container-page">
          <SectionHeading
            eyebrow="Leadership"
            title="Department leads"
            description="Each department is led by a senior consultant responsible for clinical standards."
            action={<ButtonLink to="/doctors" variant="outline">Meet all doctors</ButtonLink>}
          />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {doctors.loading
              ? Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-[30rem]" />)
              : leads.map((d) => <DoctorCard key={d.id} doctor={d} />)}
          </div>
        </div>
      </section>

      <CtaBanner />
    </>
  )
}
