/**
 * Minimal analytics layer. Events go to `window.dataLayer`, so Google Tag Manager (and GA4,
 * Google Ads and Meta tags configured inside it) can pick them up. Set VITE_GTM_ID to load GTM.
 *
 * Events: page_view, click_call, click_whatsapp, booking_start, booking_step, book_appointment,
 * generate_lead — each with the page and (where known) centre, treatment and doctor.
 */

type Params = Record<string, string | number | boolean | undefined>

declare global {
  interface Window {
    dataLayer?: unknown[]
  }
}

const ATTRIBUTION_KEY = 'rua.attribution'

export function track(event: string, params: Params = {}) {
  if (typeof window === 'undefined') return
  window.dataLayer = window.dataLayer ?? []
  window.dataLayer.push({ event, page_path: window.location.pathname, ...attribution(), ...params })
}

/** Load Google Tag Manager once, if an ID is configured. */
export function initAnalytics() {
  captureAttribution()
  const id = import.meta.env.VITE_GTM_ID as string | undefined
  if (!id || document.getElementById('gtm-script')) return
  window.dataLayer = window.dataLayer ?? []
  window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' })
  const script = document.createElement('script')
  script.id = 'gtm-script'
  script.async = true
  script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(id)}`
  document.head.appendChild(script)
}

/** Track every call and WhatsApp tap on the site from one listener (links may carry data-centre). */
export function trackContactClicks(event: MouseEvent) {
  const link = (event.target as Element | null)?.closest?.('a')
  if (!link) return
  const href = link.getAttribute('href') ?? ''
  const centre = link.getAttribute('data-centre') ?? undefined
  if (href.startsWith('tel:')) track('click_call', { phone: href.slice(4), centre })
  else if (href.includes('wa.me/')) track('click_whatsapp', { centre })
}

/** First-touch campaign data for this visit (UTM, click IDs, landing page, referrer). */
function captureAttribution() {
  try {
    if (sessionStorage.getItem(ATTRIBUTION_KEY)) return
    const params = new URLSearchParams(window.location.search)
    const data: Record<string, string> = { landing_page: window.location.pathname }
    for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid']) {
      const value = params.get(key)
      if (value) data[key] = value
    }
    if (document.referrer && !document.referrer.startsWith(window.location.origin)) data.referrer = document.referrer
    sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(data))
  } catch {
    /* storage unavailable (private mode): attribution is optional */
  }
}

export function attribution(): Record<string, string> {
  try {
    return JSON.parse(sessionStorage.getItem(ATTRIBUTION_KEY) ?? '{}') as Record<string, string>
  } catch {
    return {}
  }
}
