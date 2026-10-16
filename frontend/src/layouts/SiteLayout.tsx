import { Suspense, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { ChatWidget } from '@/components/chat/ChatWidget'
import { Footer } from '@/components/site/Footer'
import { Navbar } from '@/components/site/Navbar'
import { PageLoader } from '@/components/ui/Feedback'

export function SiteLayout() {
  const { pathname, hash } = useLocation()

  // Start each new page at the top (or at #anchor) and move focus to the main region for screen readers.
  useEffect(() => {
    document.getElementById('main')?.focus({ preventScroll: true })
    if (!hash) {
      // Don't `return window.scrollTo(...)`: an effect may only return a cleanup function.
      window.scrollTo(0, 0)
      return
    }
    // Lazy pages render after navigation, so wait briefly for the anchor to exist.
    const timer = window.setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView(), 150)
    return () => window.clearTimeout(timer)
  }, [pathname, hash])

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only z-[100] rounded-lg bg-brand-700 px-4 py-2 text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to main content
      </a>
      <Navbar />
      <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
      <ChatWidget />
    </div>
  )
}
