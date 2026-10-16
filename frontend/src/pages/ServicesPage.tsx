import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ServiceCard } from '@/components/site/Cards'
import { CtaBanner } from '@/components/site/CtaBanner'
import { PageHero } from '@/components/site/PageHero'
import { Seo } from '@/components/site/Seo'
import { ErrorState, Skeleton } from '@/components/ui/Feedback'
import { useServices } from '@/hooks/useClinic'
import type { Department } from '@/types'
import { DEPARTMENT_LABELS } from '@/utils/format'

const ORDER: Department[] = ['dental', 'skin', 'hair', 'general', 'pediatrics']
const DEPARTMENT_PAGES: Partial<Record<Department, string>> = {
  dental: '/services/dental',
  skin: '/services/skin',
  hair: '/services/hair',
}
const INTROS: Record<Department, string> = {
  dental: 'Preventive, restorative, orthodontic and cosmetic dentistry for adults and children.',
  skin: 'Medical dermatology and doctor-led aesthetic procedures in our dedicated procedure room.',
  hair: 'Assessment and treatment of hair fall, thinning and scalp conditions.',
  general: 'Everyday illnesses, long-term conditions and preventive health check-ups.',
  pediatrics: 'Growth, development and immunisation care from newborns to teenagers.',
}

export default function ServicesPage() {
  const { data, loading, error, reload } = useServices()

  return (
    <>
      <Seo
        title="All Services"
        description="Explore every treatment at Cedarline: dental care, dermatology, hair & scalp treatments, general medicine and paediatrics, with durations and starting prices."
        path="/services"
      />
      <PageHero
        eyebrow="Services"
        title="Treatments and services"
        description="Every service lists its typical duration and an indicative starting price. Final costs are always explained by your doctor before treatment."
        crumbs={[{ label: 'All Services' }]}
        image="/images/dental-suite.webp"
      />

      <nav aria-label="Jump to department" className="sticky top-[4.5rem] z-30 border-b border-ink-100 bg-white/95 backdrop-blur md:top-[6.75rem]">
        <ul className="container-page flex gap-2 overflow-x-auto py-3">
          {ORDER.map((dept) => (
            <li key={dept}>
              <a href={`#${dept}`} className="block rounded-full bg-ink-100 px-4 py-2 text-sm font-semibold whitespace-nowrap text-ink-700 hover:bg-brand-50 hover:text-brand-700">
                {DEPARTMENT_LABELS[dept]}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="section space-y-20">
        {error && (
          <div className="container-page">
            <ErrorState message={error.message} onRetry={reload} />
          </div>
        )}
        {ORDER.map((dept) => {
          const items = data?.filter((s) => s.department === dept) ?? []
          return (
            <section key={dept} id={dept} className="container-page scroll-mt-48" aria-labelledby={`${dept}-title`}>
              <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div className="max-w-2xl">
                  <h2 id={`${dept}-title`} className="text-2xl font-bold sm:text-3xl">
                    {DEPARTMENT_LABELS[dept]}
                  </h2>
                  <p className="mt-2 text-ink-600">{INTROS[dept]}</p>
                </div>
                {DEPARTMENT_PAGES[dept] && (
                  <Link to={DEPARTMENT_PAGES[dept]!} className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-800">
                    {DEPARTMENT_LABELS[dept]} in detail <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                )}
              </div>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                {loading
                  ? Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-72" />)
                  : items.map((s) => <ServiceCard key={s.id} service={s} />)}
              </div>
            </section>
          )
        })}
      </div>

      <CtaBanner />
    </>
  )
}
