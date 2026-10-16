const SITE_NAME = 'Cedarline Multispeciality Clinic'
const SITE_URL = (import.meta.env.VITE_SITE_URL ?? '').replace(/\/$/, '')

interface SeoProps {
  title: string
  description: string
  path: string
  image?: string
  noindex?: boolean
}

/**
 * Per-page SEO tags. React 19 hoists <title>, <meta> and <link> rendered anywhere
 * in the tree into <head>, so no helmet library is needed.
 */
export function Seo({ title, description, path, image = '/images/hero-consultation.jpg', noindex }: SeoProps) {
  const fullTitle = path === '/' ? `${SITE_NAME} | ${title}` : `${title} | ${SITE_NAME}`
  const url = `${SITE_URL}${path}`
  return (
    <>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {SITE_URL && <link rel="canonical" href={url} />}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={`${SITE_URL}${image}`} />
      <meta name="twitter:card" content="summary_large_image" />
      {noindex && <meta name="robots" content="noindex, nofollow" />}
    </>
  )
}
