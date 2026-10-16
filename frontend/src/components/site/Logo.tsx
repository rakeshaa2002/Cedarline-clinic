import { cn } from '@/utils/format'

export function Logo({ tone = 'dark', className }: { tone?: 'dark' | 'light'; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-3', className)}>
      <svg viewBox="0 0 40 40" className="size-10 shrink-0" aria-hidden="true">
        <rect width="40" height="40" rx="11" fill={tone === 'light' ? '#ffffff' : '#135a5f'} />
        <path d="M20 7.5c-5.6 5-9.4 9.4-9.4 15a9.4 9.4 0 0 0 18.8 0c0-5.6-3.8-10-9.4-15z" fill={tone === 'light' ? '#135a5f' : '#ffffff'} />
        <path d="M20 16.5v15M16.2 21.6l3.8 3.8 3.8-3.8" stroke="#ee6c2a" strokeWidth="2.3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="leading-none whitespace-nowrap">
        <span className={cn('block font-display text-[1.25rem] font-bold tracking-tight', tone === 'light' ? 'text-white' : 'text-ink-900')}>
          Cedarline
        </span>
        <span className={cn('mt-0.5 block text-[0.6875rem] font-semibold tracking-[0.18em] uppercase', tone === 'light' ? 'text-brand-200' : 'text-brand-600')}>
          Multispeciality Clinic
        </span>
      </span>
    </span>
  )
}
