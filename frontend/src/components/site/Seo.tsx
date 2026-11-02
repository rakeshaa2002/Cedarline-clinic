import { jsonLdDocument, type PageMeta } from '@/content/rua/seo'
import { SITE_NAME, SITE_URL, absoluteUrl } from '@/content/site'

const SHARE_IMAGE = '/images/rua/og/rua-share.jpg'

/**
 * Per-page SEO tags from the shared page metadata (content/rua/seo.ts). React 19 hoists <title>,
 * <meta> and <link> into <head>. The same metadata is written into pre-rendered HTML at build time.
 */
export function Seo({ meta, noindex }: { meta: PageMeta; noindex?: boolean }) {
  const url = `${SITE_URL}${meta.path}`
  // Link previews (WhatsApp, Facebook) are most reliable with JPEG/PNG images.
  const image = absoluteUrl(/\.(jpe?g|png)$/i.test(meta.image) ? meta.image : SHARE_IMAGE)
  return (
    <>
      <title>{meta.title}</title>
      <meta name="description" content={meta.description} />
      <link rel="canonical" href={url} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="en_IN" />
      <meta property="og:title" content={meta.title} />
      <meta property="og:description" content={meta.description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />
      <meta name="twitter:card" content="summary_large_image" />
      {(noindex || meta.noindex) && <meta name="robots" content="noindex, follow" />}
      <script type="application/ld+json">{JSON.stringify(jsonLdDocument(meta.graph))}</script>
    </>
  )
}
