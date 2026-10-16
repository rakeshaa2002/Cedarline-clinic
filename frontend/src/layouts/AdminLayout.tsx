import { BookOpenText, ExternalLink, LayoutDashboard, LogOut, Mail, Menu, Stethoscope, UsersRound, X } from 'lucide-react'
import { Suspense, useState, type ReactNode } from 'react'
import { Link, NavLink, Navigate, Outlet, useLocation } from 'react-router-dom'
import { Logo } from '@/components/site/Logo'
import { PageLoader } from '@/components/ui/Feedback'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/utils/format'

const getNav = (role: 'admin' | 'staff' | 'doctor') => {
  if (role === 'doctor') {
    return [
      { to: '/admin', label: 'Doctor Dashboard', icon: LayoutDashboard, end: true },
      { to: '/admin/messages', label: 'Patient Appointments', icon: Mail, end: false },
      { to: '/admin/doctors', label: 'Clinic Schedule & Doctors', icon: UsersRound, end: false },
    ]
  }
  return [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/admin/messages', label: 'Messages', icon: Mail, end: false },
    { to: '/admin/doctors', label: 'Doctors', icon: UsersRound, end: false },
    ...(role === 'admin'
      ? [
          { to: '/admin/services', label: 'Services', icon: Stethoscope, end: false },
          { to: '/admin/knowledge', label: 'Chatbot knowledge', icon: BookOpenText, end: false },
        ]
      : []),
  ]
}

/** Authenticated shell for doctors, staff and admins. Unauthenticated visitors are sent to the login page. */
export function AdminLayout() {
  const { user, loading, logout } = useAuth()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  const [lastPath, setLastPath] = useState(location.pathname)
  if (lastPath !== location.pathname) {
    setLastPath(location.pathname)
    setMenuOpen(false)
  }

  if (loading) return <PageLoader label="Checking your session…" />
  if (!user) return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />

  // Admin-only route protection
  if (user.role !== 'admin' && (location.pathname.startsWith('/admin/services') || location.pathname.startsWith('/admin/knowledge'))) {
    return <Navigate to="/admin" replace />
  }

  const items = getNav(user.role)
  const isDoctor = user.role === 'doctor'

  const sidebar = (
    <nav aria-label="Admin" className="flex h-full flex-col">
      <Link to="/admin" className="px-5 py-5 flex items-center justify-between">
        <Logo tone="light" />
      </Link>
      <ul className="flex-1 space-y-1 px-3 py-2">
        {items.map(({ to, label, icon: Icon, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive ? 'bg-white/12 text-white' : 'text-ink-300 hover:bg-white/6 hover:text-white',
                )
              }
            >
              <Icon className="size-4.5" aria-hidden="true" /> {label}
            </NavLink>
          </li>
        ))}
      </ul>
      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-2 mb-1.5">
          <span
            className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
              isDoctor ? 'bg-brand-500/20 text-brand-300 border border-brand-400/30' : 'bg-white/10 text-ink-300'
            }`}
          >
            {isDoctor ? '🩺 Doctor Portal' : user.role}
          </span>
        </div>
        <p className="truncate text-sm font-semibold text-white">{user.full_name}</p>
        <p className="truncate text-xs text-ink-400">{user.email}</p>
        <div className="mt-3 flex gap-2">
          <Link to="/" className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-white/8 py-2 text-xs font-semibold text-ink-200 hover:bg-white/12">
            <ExternalLink className="size-3.5" aria-hidden="true" /> Website
          </Link>
          <button
            type="button"
            onClick={logout}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-white/8 py-2 text-xs font-semibold text-ink-200 hover:bg-white/12 cursor-pointer"
          >
            <LogOut className="size-3.5" aria-hidden="true" /> Sign out
          </button>
        </div>
      </div>
    </nav>
  )

  return (
    <div className="min-h-screen bg-ink-50">
      <title>{isDoctor ? 'Doctor Portal' : 'Admin'} | Cedarline Clinic</title>
      <meta name="robots" content="noindex, nofollow" />
      <aside className="fixed inset-y-0 left-0 hidden w-64 bg-ink-950 lg:block">{sidebar}</aside>

      <div className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-ink-100 bg-white px-4 lg:hidden">
        <Logo />
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="grid size-10 place-items-center rounded-lg hover:bg-ink-100"
          aria-label="Open admin menu"
          aria-expanded={menuOpen}
        >
          <Menu className="size-5" />
        </button>
      </div>
      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink-950/50" onClick={() => setMenuOpen(false)} aria-hidden="true" />
          <aside className="absolute inset-y-0 left-0 w-72 bg-ink-950">
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              className="absolute top-4 right-3 grid size-9 place-items-center rounded-lg text-ink-300 hover:bg-white/10"
              aria-label="Close admin menu"
            >
              <X className="size-5" />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      <main className="lg:pl-64">
        <div className="mx-auto max-w-[120rem] px-4 py-8 sm:px-6 lg:px-10 2xl:px-14">
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </div>
      </main>
    </div>
  )
}

export function AdminPageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-ink-500">{description}</p>}
      </div>
      {action}
    </div>
  )
}
