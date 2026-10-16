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
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(schema), defaultValues: { email: '', password: '' } })

  if (user) return <Navigate to="/admin" replace />

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
      <title>Staff sign in | Cedarline Clinic</title>
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
          <h1 className="mt-5 text-2xl font-bold">Staff sign in</h1>
          <p className="mt-1 text-sm text-ink-500">Manage the AI assistant’s knowledge, doctors, services and messages.</p>
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
