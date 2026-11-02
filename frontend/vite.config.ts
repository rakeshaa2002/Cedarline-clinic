import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import { BRAND } from './src/content/rua/brand'
import { allPageMetas, jsonLdDocument, type PageMeta } from './src/content/rua/seo'

const SHARE_IMAGE = '/images/rua/og/rua-share.jpg'

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** <head> tags for one page — the same metadata the React <Seo /> component renders. */
function headTags(page: PageMeta, site: string): string {
  const url = `${site}${page.path}`
  const image = `${site}${/\.(jpe?g|png)$/i.test(page.image) ? page.image : SHARE_IMAGE}`
  const jsonLd = JSON.stringify(jsonLdDocument(page.graph)).replace(/</g, '\\u003c')
  return [
    `<title data-seo>${esc(page.title)}</title>`,
    `<meta data-seo name="description" content="${esc(page.description)}" />`,
    `<link data-seo rel="canonical" href="${esc(url)}" />`,
    `<meta data-seo property="og:type" content="website" />`,
    `<meta data-seo property="og:site_name" content="${esc(BRAND.name)}" />`,
    `<meta data-seo property="og:locale" content="en_IN" />`,
    `<meta data-seo property="og:title" content="${esc(page.title)}" />`,
    `<meta data-seo property="og:description" content="${esc(page.description)}" />`,
    `<meta data-seo property="og:url" content="${esc(url)}" />`,
    `<meta data-seo property="og:image" content="${esc(image)}" />`,
    `<meta data-seo name="twitter:card" content="summary_large_image" />`,
    `<script data-seo type="application/ld+json">${jsonLd}</script>`,
  ].join('\n    ')
}

/** Readable page text inside #root: what crawlers without JavaScript see (React replaces it on load). */
function bodySnapshot(page: PageMeta): string {
  const sections = page.sections
    .map((s) => `<h2>${esc(s.heading)}</h2><ul>${s.items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`)
    .join('')
  const links = page.links.length
    ? `<h2>Explore</h2><ul>${page.links.map((l) => `<li><a href="${esc(l.href)}">${esc(l.label)}</a></li>`).join('')}</ul>`
    : ''
  return `<div class="prerender" data-prerender><h1>${esc(page.h1)}</h1><p>${esc(page.intro)}</p>${sections}${links}</div>`
}

/**
 * Build-time SEO for the SPA:
 *  - sitemap.xml and robots.txt for every public page
 *  - one pre-rendered index.html per route with its own <head> tags and core text, so search
 *    engines, AI crawlers and WhatsApp/Facebook link previews get full content without JavaScript.
 */
function seoPages(site: string): Plugin {
  let outDir = 'dist'
  const pages = allPageMetas(site)
  return {
    name: 'rua-seo-pages',
    apply: 'build',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir)
    },
    generateBundle() {
      const today = new Date().toISOString().slice(0, 10)
      const urls = pages
        .map((p) => {
          const priority = p.path === '/services' ? '1.0' : p.path.split('/').length > 3 ? '0.7' : '0.8'
          return `  <url><loc>${site}${p.path}</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>${priority}</priority></url>`
        })
        .join('\n')
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
      })
      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source: `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /doctor\n\nSitemap: ${site}/sitemap.xml\n`,
      })
    },
    closeBundle() {
      const templatePath = path.join(outDir, 'index.html')
      if (!fs.existsSync(templatePath)) return
      const template = fs.readFileSync(templatePath, 'utf8')
      for (const page of pages) {
        const html = template
          .replace(/<!--seo-->[\s\S]*?<!--\/seo-->/, headTags(page, site))
          .replace('<div id="root"></div>', `<div id="root">${bodySnapshot(page)}</div>`)
        // The home page is hidden and `/` redirects to /services, so the root document carries the
        // Services snapshot (its canonical points at /services) instead of home-page content.
        if (page.path === '/services') fs.writeFileSync(templatePath, html)
        // Hosts differ: some map /path to path/index.html, others to path.html — write both.
        const dir = path.join(outDir, page.path.slice(1))
        fs.mkdirSync(dir, { recursive: true })
        fs.writeFileSync(path.join(dir, 'index.html'), html)
        fs.writeFileSync(`${dir}.html`, html)
      }
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const envSite = (env.VITE_SITE_URL ?? '').replace(/\/$/, '')
  const site = envSite && !envSite.includes('localhost') ? envSite : BRAND.siteUrl
  return {
    plugins: [react(), tailwindcss(), seoPages(site)],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    server: {
      port: 5173,
      // In development the API is proxied, so the browser talks to one origin.
      proxy: { '/api': { target: env.VITE_DEV_API_PROXY || 'http://127.0.0.1:8000', changeOrigin: true } },
    },
    build: {
      rollupOptions: {
        output: {
          // Keep heavy, rarely-needed libraries out of the main bundle.
          manualChunks(id: string) {
            if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-')) return 'charts'
            if (id.includes('node_modules/react-router')) return 'router'
          },
        },
      },
    },
  }
})
