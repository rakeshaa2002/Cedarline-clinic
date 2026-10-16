import { ChevronLeft, ChevronRight, ChevronRight as Chevron } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/utils/format'

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'left',
  action,
  as: Tag = 'h2',
}: {
  eyebrow?: string
  title: ReactNode
  description?: ReactNode
  align?: 'left' | 'center'
  action?: ReactNode
  as?: 'h1' | 'h2'
}) {
  return (
    <div
      className={cn(
        'mb-10 flex flex-col gap-6 sm:mb-12',
        align === 'center' ? 'items-center text-center' : 'md:flex-row md:items-end md:justify-between',
      )}
    >
      <div className={cn(align === 'center' ? 'max-w-2xl' : 'max-w-2xl')}>
        {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
        <Tag className="text-3xl font-bold sm:text-4xl">{title}</Tag>
        {description && <p className="mt-4 text-lg leading-8 text-ink-600">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

export interface Crumb {
  label: string
  to?: string
}

export function Breadcrumbs({ items, tone = 'dark' }: { items: Crumb[]; tone?: 'dark' | 'light' }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className={cn('flex flex-wrap items-center gap-1.5 text-sm', tone === 'light' ? 'text-white/70' : 'text-ink-500')}>
        {items.map((item, i) => (
          <li key={item.label} className="flex items-center gap-1.5">
            {i > 0 && <Chevron className="size-3.5 opacity-60" aria-hidden="true" />}
            {item.to ? (
              <Link to={item.to} className={cn('hover:underline', tone === 'light' ? 'hover:text-white' : 'hover:text-brand-700')}>
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className={cn('font-medium', tone === 'light' ? 'text-white' : 'text-ink-800')}>
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}

export function Card({ className, children, as: Tag = 'div' }: { className?: string; children: ReactNode; as?: 'div' | 'article' | 'section' | 'li' }) {
  return <Tag className={cn('rounded-[var(--radius-card)] border border-ink-100 bg-white shadow-card', className)}>{children}</Tag>
}

type BadgeTone = 'neutral' | 'brand' | 'accent' | 'success' | 'warning' | 'danger' | 'info'
const BADGE: Record<BadgeTone, string> = {
  neutral: 'bg-ink-100 text-ink-700',
  brand: 'bg-brand-50 text-brand-700 ring-1 ring-brand-100',
  accent: 'bg-accent-50 text-accent-700 ring-1 ring-accent-100',
  success: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100',
  warning: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200',
  danger: 'bg-red-50 text-red-700 ring-1 ring-red-100',
  info: 'bg-sky-50 text-sky-700 ring-1 ring-sky-100',
}

export function Badge({ tone = 'neutral', children, className }: { tone?: BadgeTone; children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold', BADGE[tone], className)}>
      {children}
    </span>
  )
}

export function Pagination({ page, pages, onChange }: { page: number; pages: number; onChange: (page: number) => void }) {
  if (pages <= 1) return null
  const numbers = Array.from({ length: pages }, (_, i) => i + 1).filter(
    (n) => n === 1 || n === pages || Math.abs(n - page) <= 1,
  )
  const btn = 'grid h-10 min-w-10 place-items-center rounded-xl px-3 text-sm font-semibold transition-colors'
  return (
    <nav aria-label="Pagination" className="mt-12 flex items-center justify-center gap-1.5">
      <button
        type="button"
        className={cn(btn, 'text-ink-600 hover:bg-ink-100 disabled:opacity-40')}
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
      >
        <ChevronLeft className="size-4" />
      </button>
      {numbers.map((n, i) => (
        <span key={n} className="flex items-center gap-1.5">
          {i > 0 && numbers[i - 1] !== n - 1 && <span className="px-1 text-ink-400">…</span>}
          <button
            type="button"
            onClick={() => onChange(n)}
            aria-current={n === page ? 'page' : undefined}
            className={cn(btn, n === page ? 'bg-brand-700 text-white' : 'text-ink-700 hover:bg-ink-100')}
          >
            {n}
          </button>
        </span>
      ))}
      <button
        type="button"
        className={cn(btn, 'text-ink-600 hover:bg-ink-100 disabled:opacity-40')}
        onClick={() => onChange(page + 1)}
        disabled={page >= pages}
        aria-label="Next page"
      >
        <ChevronRight className="size-4" />
      </button>
    </nav>
  )
}
