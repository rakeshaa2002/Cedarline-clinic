import { CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/utils/format'

type ToastTone = 'success' | 'error' | 'info'
interface ToastItem {
  id: number
  tone: ToastTone
  title: string
  description?: string
}

interface ToastApi {
  success: (title: string, description?: string) => void
  error: (title: string, description?: string) => void
  info: (title: string, description?: string) => void
}

const ToastContext = createContext<ToastApi | null>(null)

const ICONS: Record<ToastTone, ReactNode> = {
  success: <CheckCircle2 className="size-5 text-emerald-600" aria-hidden="true" />,
  error: <XCircle className="size-5 text-red-600" aria-hidden="true" />,
  info: <Info className="size-5 text-brand-600" aria-hidden="true" />,
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const nextId = useRef(1)

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), [])
  const push = useCallback(
    (tone: ToastTone, title: string, description?: string) => {
      const id = nextId.current++
      setToasts((t) => [...t.slice(-3), { id, tone, title, description }])
      window.setTimeout(() => dismiss(id), tone === 'error' ? 7000 : 4500)
    },
    [dismiss],
  )
  const api = useMemo<ToastApi>(
    () => ({
      success: (t, d) => push('success', t, d),
      error: (t, d) => push('error', t, d),
      info: (t, d) => push('info', t, d),
    }),
    [push],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-4 z-[80] flex flex-col items-center gap-2 px-4 sm:top-auto sm:right-6 sm:bottom-6 sm:left-auto sm:items-end"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.tone === 'error' ? 'alert' : 'status'}
            className={cn(
              'pointer-events-auto flex w-full max-w-sm animate-pop items-start gap-3 rounded-2xl border bg-white p-4 shadow-lift',
              t.tone === 'error' ? 'border-red-100' : 'border-ink-100',
            )}
          >
            {ICONS[t.tone]}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink-900">{t.title}</p>
              {t.description && <p className="mt-0.5 text-sm text-ink-600">{t.description}</p>}
            </div>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="-m-1 rounded-md p-1 text-ink-400 hover:text-ink-700"
              aria-label="Dismiss notification"
            >
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

// oxlint-disable-next-line react/only-export-components
export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}
