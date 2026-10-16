import { zodResolver } from '@hookform/resolvers/zod'
import { Lock } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { Logo } from '@/components/site/Logo'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Feedback'
import { Field, Input } from '@/components/ui/Form'
import { useAuth } from '@/hooks/useAuth'
import type { ApiError } from '@/services/api'

const schema = z.object({
  email: z.string().trim().min(1, 'Enter your email').email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password'),
})
type LoginValues = z.infer<typeof schema>

export default function AdminLoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [error, setError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(schema), defaultValues: { email: '', password: '' } })

  if (user) return <Navigate to="/admin" replace />

  const fillCredentials = (email: string, pass: string) => {
    setValue('email', email, { shouldValidate: true })
    setValue('password', pass, { shouldValidate: true })
    setError(null)
  }

  const onSubmit = async (values: LoginValues) => {
    setError(null)
    try {
      await login(values.email, values.password)
      const from = (location.state as { from?: string } | null)?.from
      navigate(from && from.startsWith('/admin') ? from : '/admin', { replace: true })
    } catch (err) {
      setError((err as ApiError).message)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-50 px-4 py-12">
      <title>Portal Sign In | Cedarline Clinic</title>
      <meta name="robots" content="noindex, nofollow" />
      <main className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Link to="/" aria-label="Back to the clinic website">
            <Logo />
          </Link>
        </div>
        <div className="rounded-3xl border border-ink-100 bg-white p-8 shadow-card">
          <span className="grid size-12 place-items-center rounded-2xl bg-brand-50 text-brand-700">
            <Lock className="size-5" aria-hidden="true" />
          </span>
          <h1 className="mt-5 text-2xl font-bold">Portal Sign In</h1>
          <p className="mt-1 text-sm text-ink-500">Sign in for Doctors, Front Desk Staff & Clinic Administrators.</p>

          {/* Quick Demo Fill Buttons */}
          <div className="mt-5 rounded-2xl bg-brand-50/60 p-3 border border-brand-100/70">
            <p className="text-xs font-semibold text-brand-900 mb-2">Quick Demo Accounts (Click to fill):</p>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => fillCredentials('doctor@cedarline.example', 'Cedarline-Doctor-2026')}
                className="flex flex-col items-center justify-center rounded-xl bg-white p-2 text-center text-xs font-semibold text-brand-700 shadow-xs border border-brand-200/80 hover:bg-brand-50 hover:border-brand-300 transition-colors"
              >
                <span className="text-sm">🩺</span>
                <span className="mt-0.5 font-bold">Doctor</span>
                <span className="text-[10px] text-ink-500 truncate max-w-full">Dr. Ananya</span>
              </button>
              <button
                type="button"
                onClick={() => fillCredentials('staff@cedarline.example', 'Cedarline-Staff-2026')}
                className="flex flex-col items-center justify-center rounded-xl bg-white p-2 text-center text-xs font-semibold text-ink-700 shadow-xs border border-ink-200 hover:bg-ink-50 transition-colors"
              >
                <span className="text-sm">🏢</span>
                <span className="mt-0.5 font-bold">Staff</span>
                <span className="text-[10px] text-ink-500 truncate max-w-full">Front Desk</span>
              </button>
              <button
                type="button"
                onClick={() => fillCredentials('admin@cedarline.example', 'Cedarline-Admin-2026')}
                className="flex flex-col items-center justify-center rounded-xl bg-white p-2 text-center text-xs font-semibold text-ink-700 shadow-xs border border-ink-200 hover:bg-ink-50 transition-colors"
              >
                <span className="text-sm">🛡️</span>
                <span className="mt-0.5 font-bold">Admin</span>
                <span className="text-[10px] text-ink-500 truncate max-w-full">Clinic Lead</span>
              </button>
            </div>
          </div>

          {error && (
            <Alert tone="error" className="mt-6">
              {error}
            </Alert>
          )}
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-6 space-y-5">
            <Field label="Email" required error={errors.email?.message}>
              {(a) => <Input {...a} type="email" autoComplete="username" {...register('email')} />}
            </Field>
            <Field label="Password" required error={errors.password?.message}>
              {(a) => <Input {...a} type="password" autoComplete="current-password" {...register('password')} />}
            </Field>
            <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
              Sign in
            </Button>
          </form>
        </div>
        <p className="mt-6 text-center text-sm text-ink-500">
          <Link to="/" className="font-medium text-brand-700 hover:underline">
            ← Back to website
          </Link>
        </p>
      </main>
    </div>
  )
}
