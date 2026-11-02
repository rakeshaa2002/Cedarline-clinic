import {
  Award,
  Baby,
  Crown,
  Droplets,
  Flower2,
  Gem,
  HandHeart,
  Leaf,
  Plus,
  Scissors,
  ShieldCheck,
  Sparkles,
  Sprout,
  Stethoscope,
  Sun,
  Wallet,
  WandSparkles,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Breadcrumbs, type Crumb } from '@/components/ui/Layout'
import type { Faq } from '@/content/rua'
import { cn } from '@/utils/format'
import { openStatus } from '@/utils/rua'

// --- Icons ------------------------------------------------------------------------------------

const ICONS: Record<string, LucideIcon> = {
  stethoscope: Stethoscope,
  scissors: Scissors,
  sparkles: Sparkles,
  zap: Zap,
  sprout: Sprout,
  crown: Crown,
  gem: Gem,
  wallet: Wallet,
  award: Award,
  shield: ShieldCheck,
  droplets: Droplets,
  sun: Sun,
  flower: Flower2,
  hand: HandHeart,
  wand: WandSparkles,
  baby: Baby,
  leaf: Leaf,
}

export function BrandIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? Sparkles
  return <Icon className={className} aria-hidden="true" />
}

export function SocialIcon({ id, className }: { id: string; className?: string }) {
  const common = { className, 'aria-hidden': true, viewBox: '0 0 24 24' } as const
  switch (id) {
    case 'instagram':
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4.2" />
          <circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none" />
        </svg>
      )
    case 'youtube':
      return (
        <svg {...common} fill="currentColor">
          <path d="M21.6 7.2a2.7 2.7 0 0 0-1.9-1.9C18 4.8 12 4.8 12 4.8s-6 0-7.7.5A2.7 2.7 0 0 0 2.4 7.2 28 28 0 0 0 2 12a28 28 0 0 0 .4 4.8 2.7 2.7 0 0 0 1.9 1.9c1.7.5 7.7.5 7.7.5s6 0 7.7-.5a2.7 2.7 0 0 0 1.9-1.9A28 28 0 0 0 22 12a28 28 0 0 0-.4-4.8ZM10 15.2V8.8l5.2 3.2L10 15.2Z" />
        </svg>
      )
    case 'facebook':
      return (
        <svg {...common} fill="currentColor">
          <path d="M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.5-1.5h1.6V4.4a21 21 0 0 0-2.3-.1c-2.3 0-3.9 1.4-3.9 4v2.2H7.8v3h2.6V21h3.1Z" />
        </svg>
      )
    default:
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M16.6 11.2c-.3-2.5-2-3.8-4.4-3.8-2.6 0-4.2 1.7-4.2 4.6 0 3 1.7 4.7 4.3 4.7 2.2 0 3.6-1.2 3.6-3 0-2.2-2.3-2.8-4-2.6-1.6.2-2.6 1-2.5 2.2.1 1.1 1.2 1.8 2.6 1.7 2.6-.2 3.7-2.6 3.3-5.5" />
          <path d="M19.5 7.5C18 4.6 15.4 3 12.1 3 6.6 3 3.5 6.6 3.5 12s3.1 9 8.6 9c3.6 0 6.2-1.6 7.4-4.4" />
        </svg>
      )
  }
}

// --- Motion -----------------------------------------------------------------------------------

/** Fades content up as it scrolls into view (instant when reduced motion is preferred). */
export function Reveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(() => typeof IntersectionObserver === 'undefined')
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          io.disconnect()
        }
      },
      { rootMargin: '0px 0px -6% 0px', threshold: 0.08 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  const style: CSSProperties | undefined = delay ? { transitionDelay: `${delay}ms` } : undefined
  return (
    <div ref={ref} className={cn('reveal', visible && 'is-visible', className)} style={style}>
      {children}
    </div>
  )
}

// --- Typography -------------------------------------------------------------------------------

export function SectionHeader({
  eyebrow,
  title,
  lead,
  align = 'left',
  tone = 'dark',
  action,
  as: Tag = 'h2',
  className,
}: {
  eyebrow?: string
  title: ReactNode
  lead?: ReactNode
  align?: 'left' | 'center'
  tone?: 'dark' | 'light'
  action?: ReactNode
  as?: 'h1' | 'h2'
  className?: string
}) {
  return (
    <div
      className={cn(
        'mb-10 flex flex-col gap-6 sm:mb-14',
        align === 'center' ? 'items-center text-center' : 'lg:flex-row lg:items-end lg:justify-between',
        className,
      )}
    >
      <div className={cn('max-w-3xl', align === 'center' && 'mx-auto')}>
        {eyebrow && (
          <p className={cn('flex items-center gap-3', align === 'center' && 'justify-center', tone === 'light' ? 'eyebrow-light' : 'eyebrow')}>
            <span className="h-px w-8 bg-current opacity-60" aria-hidden="true" />
            {eyebrow}
          </p>
        )}
        <Tag className={cn('mt-4 text-3xl leading-tight sm:text-4xl lg:text-[2.75rem]', tone === 'light' && 'text-cream')}>{title}</Tag>
        {lead && <p className={cn('mt-5 text-lg leading-8', tone === 'light' ? 'text-cream/75' : 'text-ink-600')}>{lead}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

// --- Page hero for inner pages ----------------------------------------------------------------------

export function PageHero({
  crumbs,
  eyebrow,
  title,
  lead,
  actions,
  aside,
  children,
}: {
  crumbs: Crumb[]
  eyebrow?: string
  title: ReactNode
  lead?: ReactNode
  actions?: ReactNode
  aside?: ReactNode
  children?: ReactNode
}) {
  return (
    <section className="surface-cocoa relative isolate overflow-hidden text-cream">
      <div className="slats absolute inset-0 -z-10 opacity-70" aria-hidden="true" />
      <img
        src="/images/rua/brand/rua-mark-gold.png"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -bottom-16 -z-10 w-[34rem] max-w-none opacity-[0.07]"
      />
      <div className={cn('container-page grid gap-10 py-12 sm:py-16 lg:py-20', aside ? 'lg:grid-cols-[1.15fr_0.85fr] lg:items-center' : undefined)}>
        <div className="animate-fade-up">
          <Breadcrumbs items={crumbs} tone="light" />
          {eyebrow && <p className="eyebrow-light mt-7">{eyebrow}</p>}
          <h1 className="mt-3 max-w-4xl text-4xl leading-[1.08] text-cream sm:text-5xl lg:text-[3.6rem]">{title}</h1>
          {lead && <div className="mt-6 max-w-2xl text-lg leading-8 text-cream/80">{lead}</div>}
          {actions && <div className="mt-8 flex flex-wrap gap-3">{actions}</div>}
          {children}
        </div>
        {aside && <div className="animate-fade-up [animation-delay:120ms]">{aside}</div>}
      </div>
      <div className="hairline-gold h-px w-full opacity-70" aria-hidden="true" />
    </section>
  )
}

// --- FAQ --------------------------------------------------------------------------------------------

export function FaqList({ faqs, className }: { faqs: Faq[]; className?: string }) {
  return (
    <div className={cn('divide-y divide-ink-200/70 overflow-hidden rounded-[1.75rem] border border-ink-200/70 bg-white shadow-card', className)}>
      {faqs.map((f, i) => (
        <details key={f.q} className="group px-6 py-5 sm:px-8" open={i === 0}>
          <summary className="flex cursor-pointer list-none items-start justify-between gap-6 [&::-webkit-details-marker]:hidden">
            <h3 className="font-display text-lg leading-snug text-ink-900">{f.q}</h3>
            <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-700 ring-1 ring-brand-100 transition-transform duration-300 group-open:rotate-45">
              <Plus className="size-4" aria-hidden="true" />
            </span>
          </summary>
          <p className="mt-3 pr-10 leading-7 text-ink-600">{f.a}</p>
        </details>
      ))}
    </div>
  )
}

// --- Live opening status ---------------------------------------------------------------------------

export function OpenStatus({ tone = 'dark', className }: { tone?: 'dark' | 'light'; className?: string }) {
  const [status, setStatus] = useState(() => openStatus())
  useEffect(() => {
    const timer = window.setInterval(() => setStatus(openStatus()), 60_000)
    return () => window.clearInterval(timer)
  }, [])
  return (
    <span className={cn('inline-flex items-center gap-2 text-sm', className)}>
      <span className="relative flex size-2.5">
        {status.open && <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-70" />}
        <span className={cn('relative inline-flex size-2.5 rounded-full', status.open ? 'bg-emerald-500' : 'bg-rose-400')} />
      </span>
      <span className={cn('font-semibold', tone === 'light' ? 'text-cream' : 'text-ink-900')}>{status.label}</span>
      <span className={tone === 'light' ? 'text-cream/65' : 'text-ink-500'}>· {status.detail}</span>
    </span>
  )
}

// --- Map ---------------------------------------------------------------------------------------------

export function MapEmbed({ src, title, className }: { src: string; title: string; className?: string }) {
  return (
    <div className={cn('overflow-hidden rounded-[1.75rem] border border-ink-200/70 bg-sand shadow-card', className)}>
      <iframe
        src={src}
        title={title}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        className="h-full min-h-72 w-full grayscale-[25%] sepia-[15%]"
        allowFullScreen
      />
    </div>
  )
}
