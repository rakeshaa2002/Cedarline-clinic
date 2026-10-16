import { CalendarCheck, Phone } from 'lucide-react'
import { ButtonLink } from '@/components/ui/Button'
import { useClinicInfo } from '@/hooks/useClinic'

export function CtaBanner({
  title = 'Ready to see a specialist?',
  description = 'Call or email our front desk and we’ll find a time with the right doctor. Not sure who to see? Ask our AI assistant.',
}: {
  title?: string
  description?: string
}) {
  const { data: clinic } = useClinicInfo()
  return (
    <section className="section pt-0" aria-labelledby="cta-title">
      <div className="container-page">
        <div className="relative overflow-hidden rounded-[2rem] bg-brand-800 px-6 py-12 sm:px-12 sm:py-14 lg:px-16">
          <svg className="absolute -top-24 -right-24 size-80 text-brand-700" viewBox="0 0 200 200" aria-hidden="true">
            <circle cx="100" cy="100" r="100" fill="currentColor" />
          </svg>
          <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl">
              <h2 id="cta-title" className="text-3xl font-bold text-white sm:text-4xl">
                {title}
              </h2>
              <p className="mt-4 text-lg leading-8 text-brand-100">{description}</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <ButtonLink to="/appointments" variant="accent" size="lg" icon={<CalendarCheck className="size-5" aria-hidden="true" />}>
                Book an appointment
              </ButtonLink>
              {clinic && (
                <a
                  href={`tel:${clinic.phone.replace(/\s/g, '')}`}
                  className="inline-flex h-13 items-center justify-center gap-2 rounded-xl border border-white/25 px-7 font-semibold text-white hover:bg-white/10"
                >
                  <Phone className="size-5" aria-hidden="true" /> {clinic.phone}
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
