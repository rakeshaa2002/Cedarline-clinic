import { BRAND } from '@/content/rua'

export const SITE_NAME = BRAND.name

/**
 * Canonical origin for SEO tags. Defaults to RUA's domain; set VITE_SITE_URL for another host
 * (for example a staging deploy). Values pointing at localhost are ignored so local builds
 * never publish localhost canonicals.
 */
const envUrl = (import.meta.env.VITE_SITE_URL ?? '').replace(/\/$/, '')
export const SITE_URL = envUrl && !envUrl.includes('localhost') ? envUrl : BRAND.siteUrl

/** Absolute URL for a path: structured data and Open Graph tags need full URLs. */
export function absoluteUrl(path: string): string {
  return /^https?:/.test(path) ? path : `${SITE_URL}${path}`
}
