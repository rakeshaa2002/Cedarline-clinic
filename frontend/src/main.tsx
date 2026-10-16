import '@fontsource-variable/inter'
import '@fontsource-variable/plus-jakarta-sans'
import './index.css'
import { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { PageLoader } from '@/components/ui/Feedback'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthProvider } from '@/hooks/useAuth'
import { router } from '@/router'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <AuthProvider>
        <Suspense fallback={<PageLoader />}>
          <RouterProvider router={router} />
        </Suspense>
      </AuthProvider>
    </ToastProvider>
  </StrictMode>,
)
