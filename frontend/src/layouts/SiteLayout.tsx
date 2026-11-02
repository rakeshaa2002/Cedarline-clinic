import { Suspense, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { ChatWidget } from '@/components/chat/ChatWidget'
import { MobileActionBar, SiteFooter, SiteHeader, WhatsAppFloat } from '@/components/rua/chrome'
import { PageLoader } from '@/components/ui/Feedback'
import { track, trackContactClicks } from '@/utils/analytics'

export function SiteLayout() {
  const { pathname, hash } = useLocation()

  // Start each new page at the top (or at #anchor), move focus to <main>, and record the page view.
  useEffect(() => {
    document.getElementById('main')?.focus({ preventScroll: true })
    track('page_view')
    if (!hash) {
      window.scrollTo(0, 0)
      return
    }
    const timer = window.setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView(), 150)
    return () => window.clearTimeout(timer)
  }, [pathname, hash])

  // Every call / WhatsApp tap on the site is tracked from one listener.
  useEffect(() => {
    document.addEventListener('click', trackContactClicks)
    return () => document.removeEventListener('click', trackContactClicks)
  }, [])

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only z-[100] rounded-full bg-brand-800 px-4 py-2 text-cream focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to main content
      </a>
      <SiteHeader />
      <main id="main" tabIndex={-1} className="w-full min-w-0 flex-1 overflow-x-clip focus:outline-none">
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>
      <SiteFooter />
      <WhatsAppFloat />
      <ChatWidget />
      <MobileActionBar />
    </div>
  )
}
