import { AlertTriangle, RotateCcw } from 'lucide-react'
import { isRouteErrorResponse, Link, useRouteError } from 'react-router-dom'

/** Friendly fallback when a page crashes or a route fails to load (e.g. after a new deploy). */
export default function RouteErrorPage() {
  const error = useRouteError()
  const notFound = isRouteErrorResponse(error) && error.status === 404
  if (import.meta.env.DEV) console.error(error)

  return (
    <main className="flex min-h-screen items-center justify-center bg-ivory px-4 py-16 text-center">
      <title>Something went wrong | RUA Skin & Hair Center</title>
      <div className="max-w-md">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-amber-50 text-amber-600 ring-1 ring-amber-200">
          <AlertTriangle className="size-7" aria-hidden="true" />
        </span>
        <h1 className="mt-6 text-2xl font-bold">{notFound ? 'Page not found' : 'Something went wrong'}</h1>
        <p className="mt-3 text-ink-600">
          {notFound
            ? 'The page you are looking for does not exist.'
            : 'This page could not be displayed. Please reload, or go back to the home page.'}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-brand-800 px-5 font-semibold text-cream hover:bg-brand-700"
          >
            <RotateCcw className="size-4" aria-hidden="true" /> Reload
          </button>
          <Link to="/services" className="inline-flex h-11 items-center rounded-full border border-ink-200 bg-white px-5 font-semibold text-ink-800 hover:bg-brand-50">
            View services
          </Link>
        </div>
      </div>
    </main>
  )
}
