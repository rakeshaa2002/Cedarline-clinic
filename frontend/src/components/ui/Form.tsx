import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/utils/format'

const control =
  'block w-full rounded-xl border bg-white px-3.5 text-[0.9375rem] text-ink-900 placeholder:text-ink-400 ' +
  'transition-colors focus:outline-none focus:ring-4 disabled:bg-ink-50 disabled:text-ink-400'
const ok = 'border-ink-200 hover:border-ink-300 focus:border-brand-500 focus:ring-brand-500/15'
const bad = 'border-red-400 focus:border-red-500 focus:ring-red-500/15'

interface FieldProps {
  label: string
  error?: string
  hint?: ReactNode
  required?: boolean
  children: (props: { id: string; 'aria-invalid'?: boolean; 'aria-describedby'?: string }) => ReactNode
  className?: string
}

/** Label + control + hint/error, wired up with ids for screen readers. */
export function Field({ label, error, hint, required, children, className }: FieldProps) {
  const id = useId()
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const describedBy = [error && errorId, hint && hintId].filter(Boolean).join(' ') || undefined
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink-800">
        {label}
        {required ? (
          <span className="text-accent-600" aria-hidden="true">
            {' '}*
          </span>
        ) : (
          <span className="font-normal text-ink-400"> (optional)</span>
        )}
      </label>
      {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy })}
      {hint && !error && (
        <p id={hintId} className="mt-1.5 text-xs text-ink-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="mt-1.5 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ className, invalid, ...rest }, ref) {
  const isInvalid = invalid ?? rest['aria-invalid'] === true
  return <input ref={ref} className={cn(control, 'h-11', isInvalid ? bad : ok, className)} {...rest} />
})

type SelectProps = SelectHTMLAttributes<HTMLSelectElement>
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select({ className, children, ...rest }, ref) {
  const isInvalid = rest['aria-invalid'] === true
  return (
    <select
      ref={ref}
      className={cn(
        control,
        'h-11 appearance-none bg-[url("data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A//www.w3.org/2000/svg%27%20viewBox%3D%270%200%2020%2020%27%20fill%3D%27%235a7598%27%3E%3Cpath%20d%3D%27M5.3%207.3a1%201%200%200%201%201.4%200L10%2010.6l3.3-3.3a1%201%200%201%201%201.4%201.4l-4%204a1%201%200%200%201-1.4%200l-4-4a1%201%200%200%201%200-1.4z%27/%3E%3C/svg%3E")] bg-[length:1.25rem] bg-[right_0.75rem_center] bg-no-repeat pr-10',
        isInvalid ? bad : ok,
        className,
      )}
      {...rest}
    >
      {children}
    </select>
  )
})

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea({ className, ...rest }, ref) {
  const isInvalid = rest['aria-invalid'] === true
  return <textarea ref={ref} className={cn(control, 'min-h-28 py-3', isInvalid ? bad : ok, className)} {...rest} />
})
