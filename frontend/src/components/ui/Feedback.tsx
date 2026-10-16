import { AlertTriangle, CheckCircle2, Info, RefreshCw, SearchX, XCircle } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/utils/format'

export function Spinner({ className, label }: { className?: string; label?: string }) {
  return (
    <span role={label ? 'status' : undefined} className="inline-flex items-center gap-2">
      <svg className={cn('size-5 animate-spin text-current', className)} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
        <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
      {label && <span className="text-sm text-ink-500">{label}</span>}
    </span>
  )
}

export function PageLoader({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-brand-600">
      <Spinner className="size-7" label={label} />
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-xl bg-ink-100', className)} aria-hidden="true" />
}

type Tone = 'info' | 'success' | 'warning' | 'error'
const TONES: Record<Tone, { box: string; icon: ReactNode }> = {
  info: { box: 'border-brand-200 bg-brand-50 text-brand-900', icon: <Info className="size-5 text-brand-600" /> },
  success: { box: 'border-emerald-200 bg-emerald-50 text-emerald-900', icon: <CheckCircle2 className="size-5 text-emerald-600" /> },
  warning: { box: 'border-amber-200 bg-amber-50 text-amber-900', icon: <AlertTriangle className="size-5 text-amber-600" /> },
  error: { box: 'border-red-200 bg-red-50 text-red-900', icon: <XCircle className="size-5 text-red-600" /> },
}

export function Alert({
  tone = 'info',
  title,
  children,
  className,
  action,
}: {
  tone?: Tone
  title?: string
  children?: ReactNode
  className?: string
  action?: ReactNode
}) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn('flex gap-3 rounded-2xl border p-4 text-sm leading-6', TONES[tone].box, className)}
    >
      <span className="mt-0.5 shrink-0" aria-hidden="true">
        {TONES[tone].icon}
      </span>
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cn(title && 'mt-0.5')}>{children}</div>}
        {action && <div className="mt-3">{action}</div>}
      </div>
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Alert
      tone="error"
      title="We couldn't load this content"
      action={
        onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-50"
          >
            <RefreshCw className="size-4" aria-hidden="true" /> Try again
          </button>
        )
      }
    >
      {message}
    </Alert>
  )
}

export function EmptyState({
  title,
  description,
  icon,
  action,
}: {
  title: string
  description?: string
  icon?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-ink-200 bg-ink-50/50 px-6 py-14 text-center">
      <span className="mb-4 grid size-12 place-items-center rounded-2xl bg-white text-ink-400 shadow-sm ring-1 ring-ink-100">
        {icon ?? <SearchX className="size-6" aria-hidden="true" />}
      </span>
      <h3 className="text-lg font-semibold">{title}</h3>
      {description && <p className="mt-1 max-w-md text-sm text-ink-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
