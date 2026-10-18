import { Search, UserRoundSearch } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { DoctorCard } from '@/components/site/Cards'
import { CtaBanner } from '@/components/site/CtaBanner'
import { DoctorProfileModal } from '@/components/site/DoctorProfileModal'
import { PageHero } from '@/components/site/PageHero'
import { Seo } from '@/components/site/Seo'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback'
import { Input } from '@/components/ui/Form'
import { SITE_URL } from '@/content/site'
import { useDoctors } from '@/hooks/useClinic'
import type { Department, Doctor } from '@/types'
import { DEPARTMENT_LABELS, cn } from '@/utils/format'

const FILTERS: (Department | 'all')[] = ['all', 'general', 'dental', 'skin', 'hair', 'pediatrics']

export default function DoctorsPage() {
  const { data, loading, error, reload } = useDoctors()
  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Doctor | null>(null)
  const department = (params.get('department') as Department | null) ?? 'all'

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (data ?? []).filter(
      (d) =>
        (department === 'all' || d.department === department) &&
        (!q || `${d.full_name} ${d.specialization} ${d.languages.join(' ')}`.toLowerCase().includes(q)),
    )
  }, [data, department, query])

  const doctorsSchema = useMemo(() => {
    if (!data || data.length === 0) return undefined
    return {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      itemListElement: data.map((doc, idx) => ({
        '@type': 'ListItem',
        position: idx + 1,
        item: {
          '@type': 'Physician',
          name: doc.full_name,
          jobTitle: doc.specialization,
          description: doc.bio,
          knowsAbout: doc.qualifications,
          knowsLanguage: doc.languages,
          image: doc.photo_url ? (doc.photo_url.startsWith('http') ? doc.photo_url : `${SITE_URL}${doc.photo_url}`) : undefined,
          worksFor: {
            '@type': 'MedicalClinic',
            name: 'Cedarline Multispeciality Clinic',
            url: SITE_URL,
          },
        },
      })),
    }
  }, [data])

  return (
    <>
      <Seo
        title="Our Doctors"
        description="Meet Cedarline's dentists, dermatologists, trichologist, family physicians and paediatrician. See consultation days and book an appointment."
        path="/doctors"
        schema={doctorsSchema}
      />
      <PageHero
        eyebrow="Our doctors"
        title="Meet the specialists"
        description="Experienced consultants across five departments. See when each doctor consults and book directly with the one you prefer."
        crumbs={[{ label: 'Our Doctors' }]}
        image="/images/care-team.jpg"
      />

      <section className="section">
        <div className="container-page">
          <div className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div role="group" aria-label="Filter doctors by department" className="flex flex-wrap gap-2">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  type="button"
                  aria-pressed={department === f}
                  onClick={() => setParams(f === 'all' ? {} : { department: f }, { replace: true })}
                  className={cn(
                    'rounded-full px-4 py-2 text-sm font-semibold transition-colors',
                    department === f ? 'bg-brand-700 text-white' : 'bg-ink-100 text-ink-700 hover:bg-ink-200',
                  )}
                >
                  {f === 'all' ? 'All doctors' : DEPARTMENT_LABELS[f]}
                </button>
              ))}
            </div>
            <div className="relative w-full lg:w-72">
              <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-400" aria-hidden="true" />
              <label htmlFor="doctor-search" className="sr-only">
                Search doctors
              </label>
              <Input
                id="doctor-search"
                type="search"
                placeholder="Search by name, specialty, language"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {error ? (
            <ErrorState message={error.message} onRetry={reload} />
          ) : loading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {Array.from({ length: 8 }, (_, i) => (
                <Skeleton key={i} className="h-[30rem]" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<UserRoundSearch className="size-6" aria-hidden="true" />}
              title="No doctors match your search"
              description="Try a different name or department."
            />
          ) : (
            <>
              <p className="mb-5 text-sm text-ink-500" aria-live="polite">
                Showing {filtered.length} doctor{filtered.length === 1 ? '' : 's'}
              </p>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                {filtered.map((d) => (
                  <DoctorCard key={d.id} doctor={d} onViewProfile={setSelected} />
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      <DoctorProfileModal doctor={selected} onClose={() => setSelected(null)} />
      <CtaBanner title="Not sure which doctor to see?" description="Book a general consultation and our family physicians will guide you to the right specialist." />
    </>
  )
}
