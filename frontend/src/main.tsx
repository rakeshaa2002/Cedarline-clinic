import '@fontsource-variable/inter'
import '@fontsource-variable/plus-jakarta-sans'
import '@fontsource-variable/fraunces/full.css'
import '@fontsource-variable/fraunces/full-italic.css'
import './index.css'
import { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { PageLoader } from '@/components/ui/Feedback'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthProvider } from '@/hooks/useAuth'
import { router } from '@/router'
import { ThemeSync } from '@/theme/ThemeSync'
import { applyStoredTheme } from '@/theme/themes'
import { initAnalytics } from '@/utils/analytics'

applyStoredTheme()
initAnalytics()

// Pre-rendered pages ship static SEO tags (marked data-seo) for crawlers and link previews.
// React manages these tags from here on, so remove the static copies to avoid duplicates.
document.querySelectorAll('[data-seo]').forEach((el) => el.remove())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <AuthProvider>
        <Suspense fallback={<PageLoader />}>
          <ThemeSync />
          <RouterProvider router={router} />
        </Suspense>
      </AuthProvider>
    </ToastProvider>
  </StrictMode>,
)
