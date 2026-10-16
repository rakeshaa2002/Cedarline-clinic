import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'

const PUBLIC_ROUTES = [
  '/',
  '/about',
  '/doctors',
  '/services',
  '/services/dental',
  '/services/skin',
  '/services/hair',
  '/appointments',
  '/blog',
  '/contact',
]

/** Emits sitemap.xml and robots.txt at build time using VITE_SITE_URL. */
function seoFiles(siteUrl: string): Plugin {
  const base = siteUrl.replace(/\/$/, '')
  return {
    name: 'seo-files',
    apply: 'build',
    generateBundle() {
      const urls = PUBLIC_ROUTES.map(
        (path) => `  <url><loc>${base}${path}</loc><changefreq>weekly</changefreq></url>`,
      ).join('\n')
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
      })
      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source: `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /doctor\n\nSitemap: ${base}/sitemap.xml\n`,
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), tailwindcss(), seoFiles(env.VITE_SITE_URL || 'http://localhost:5173')],
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
