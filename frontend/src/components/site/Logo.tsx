import { cn } from '@/utils/format'

/**
 * RUA Skin & Hair Center logo, from the brand's own artwork.
 * tone="light" is the cream version for cocoa/dark backgrounds; "dark" is cocoa for light ones.
 */
export function Logo({
  tone = 'dark',
  variant = 'horizontal',
  className,
}: {
  tone?: 'dark' | 'light'
  variant?: 'horizontal' | 'stacked' | 'mark'
  className?: string
}) {
  const color = tone === 'light' ? 'cream' : 'cocoa'
  if (variant === 'stacked') {
    return <img src={`/images/rua/brand/rua-logo-${color}.png`} alt="RUA Skin & Hair Center" width={560} height={588} className={cn('h-28 w-auto', className)} />
  }
  if (variant === 'mark') {
    return <img src={`/images/rua/brand/rua-mark-${color}.png`} alt="RUA" width={360} height={222} className={cn('h-8 w-auto', className)} />
  }
  return (
    <span className={cn('inline-flex items-center gap-3', className)}>
      <img src={`/images/rua/brand/rua-mark-${color}.png`} alt="" width={360} height={222} className="h-7 w-auto sm:h-8" />
      <span className={cn('h-8 w-px', tone === 'light' ? 'bg-cream/25' : 'bg-brand-800/20')} aria-hidden="true" />
      <img src={`/images/rua/brand/rua-wordmark-${color}.png`} alt="RUA Skin & Hair Center" width={560} height={315} className="h-9 w-auto sm:h-10" />
    </span>
  )
}
