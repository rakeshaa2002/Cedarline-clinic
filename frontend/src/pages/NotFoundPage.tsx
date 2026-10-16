import { Seo } from '@/components/site/Seo'
import { ButtonLink } from '@/components/ui/Button'

export default function NotFoundPage() {
  return (
    <section className="container-page flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <Seo title="Page not found" description="The page you are looking for does not exist." path="/404" noindex />
      <p className="font-display text-7xl font-extrabold text-brand-100">404</p>
      <h1 className="mt-4 text-3xl font-bold">We couldn't find that page</h1>
      <p className="mt-3 max-w-md text-ink-600">The link may be broken or the page may have moved. Try one of these instead:</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <ButtonLink to="/">Home</ButtonLink>
        <ButtonLink to="/services" variant="outline">
          Services
        </ButtonLink>
        <ButtonLink to="/appointments" variant="accent">
          Book an appointment
        </ButtonLink>
      </div>
    </section>
  )
}
