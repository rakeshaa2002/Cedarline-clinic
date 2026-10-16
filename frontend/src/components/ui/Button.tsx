import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import { Spinner } from '@/components/ui/Feedback'
import { cn } from '@/utils/format'

type Variant = 'primary' | 'accent' | 'outline' | 'ghost' | 'danger' | 'white'
type Size = 'sm' | 'md' | 'lg'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-brand-700 text-white hover:bg-brand-800 shadow-sm hover:shadow-md hover:shadow-brand-700/20',
  accent: 'bg-accent-500 text-white hover:bg-accent-600 shadow-sm shadow-accent-500/20 hover:shadow-lg hover:shadow-accent-500/30',
  outline: 'border border-ink-200 bg-white text-ink-800 hover:border-brand-300 hover:bg-brand-50 hover:shadow-sm',
  ghost: 'text-ink-700 hover:bg-ink-100 hover:text-brand-700',
  danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm hover:shadow-md hover:shadow-red-600/20',
  white: 'bg-white text-brand-800 hover:bg-brand-50 shadow-sm hover:shadow-md',
}

const SIZES: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-sm gap-1.5',
  md: 'h-11 px-5 text-[0.9375rem] gap-2',
  lg: 'h-13 px-7 text-base gap-2.5',
}

export function buttonClasses(variant: Variant = 'primary', size: Size = 'md', extra?: string) {
  return cn(
    'inline-flex items-center justify-center rounded-xl font-semibold whitespace-nowrap cursor-pointer transition-all duration-200 ease-out',
    'hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]',
    'disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none disabled:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-2',
    VARIANTS[variant],
    SIZES[size],
    extra,
  )
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  icon?: ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading = false, icon, className, children, disabled, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={buttonClasses(variant, size, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <Spinner className="size-4" /> : icon}
      {children}
    </button>
  )
})

interface ButtonLinkProps extends LinkProps {
  variant?: Variant
  size?: Size
  icon?: ReactNode
}

export function ButtonLink({ variant = 'primary', size = 'md', icon, className, children, ...rest }: ButtonLinkProps) {
  return (
    <Link className={buttonClasses(variant, size, className)} {...rest}>
      {icon}
      {children}
    </Link>
  )
}
