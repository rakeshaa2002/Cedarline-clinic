import { ConcernFinder } from '@/components/rua/cards'
import { Seo } from '@/components/site/Seo'
import { ButtonLink } from '@/components/ui/Button'

const META = {
  path: '/404',
  title: 'Page not found | RUA Skin & Hair Center',
  description: 'The page you are looking for does not exist.',
  image: '/images/rua/og/rua-share.jpg',
  noindex: true,
  graph: [],
  h1: 'Page not found',
  intro: '',
  sections: [],
  links: [],
}

export default function NotFoundPage() {
  return (
    <section className="container-page flex min-h-[65vh] flex-col items-center justify-center py-20 text-center">
      <Seo meta={META} />
      <img src="/images/rua/brand/rua-mark-gold.png" alt="" className="h-14 w-auto" />
      <p className="mt-6 font-display text-8xl text-brand-100">404</p>
      <h1 className="mt-2 text-3xl sm:text-4xl">We couldn’t find that page</h1>
      <p className="mt-3 max-w-md text-ink-600">The link may be broken or the page may have moved. These might help:</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <ButtonLink to="/services">All services</ButtonLink>
        <ButtonLink to="/book-appointment" variant="accent">
          Book an appointment
        </ButtonLink>
      </div>
      <div className="mt-12 flex max-w-3xl justify-center">
        <ConcernFinder limit={6} />
      </div>
    </section>
  )
}
