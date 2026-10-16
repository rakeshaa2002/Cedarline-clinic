import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import { Spinner } from '@/components/ui/Feedback'
import { cn } from '@/utils/format'

type Variant = 'primary' | 'accent' | 'outline' | 'ghost' | 'danger' | 'white'
type Size = 'sm' | 'md' | 'lg'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-brand-700 text-white hover:bg-brand-800 shadow-sm',
  accent: 'bg-accent-500 text-white hover:bg-accent-600 shadow-sm shadow-accent-500/20',
  outline: 'border border-ink-200 bg-white text-ink-800 hover:border-brand-300 hover:bg-brand-50',
  ghost: 'text-ink-700 hover:bg-ink-100',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  white: 'bg-white text-brand-800 hover:bg-brand-50 shadow-sm',
}

const SIZES: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-sm gap-1.5',
  md: 'h-11 px-5 text-[0.9375rem] gap-2',
  lg: 'h-13 px-7 text-base gap-2.5',
}

export function buttonClasses(variant: Variant = 'primary', size: Size = 'md', extra?: string) {
  return cn(
    'inline-flex items-center justify-center rounded-xl font-semibold whitespace-nowrap transition-colors duration-150',
    'disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2',
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
