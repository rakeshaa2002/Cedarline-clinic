import { CalendarCheck, ChevronDown, Clock, Menu, Phone, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { ButtonLink } from '@/components/ui/Button'
import { Logo } from '@/components/site/Logo'
import { todayHours, useClinicInfo } from '@/hooks/useClinic'
import { cn } from '@/utils/format'

const SERVICE_LINKS = [
  { to: '/services', label: 'All Services', description: 'Every treatment we offer' },
  { to: '/services/dental', label: 'Dental Treatments', description: 'Check-ups, aligners, implants' },
  { to: '/services/skin', label: 'Skin Treatments', description: 'Dermatology & aesthetic care' },
  { to: '/services/hair', label: 'Hair Treatments', description: 'Trichology & restoration' },
]

const NAV = [
  { to: '/about', label: 'About' },
  { to: '/doctors', label: 'Our Doctors' },
  { to: '/blog', label: 'Patient Education' },
  { to: '/contact', label: 'Contact' },
]

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'rounded-lg px-3 py-2 text-[0.9375rem] font-medium whitespace-nowrap transition-colors',
    isActive ? 'text-brand-700' : 'text-ink-700 hover:text-brand-700',
  )

export function Navbar() {
  const [open, setOpen] = useState(false)
  const [servicesOpen, setServicesOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const location = useLocation()
  const { data: clinic } = useClinicInfo()
  const menuRef = useRef<HTMLLIElement>(null)
  const today = clinic ? todayHours(clinic.opening_hours) : undefined
  const servicesActive = location.pathname.startsWith('/services')

  // Close menus on navigation (state adjusted during render instead of in an effect).
  const [lastPath, setLastPath] = useState(location.pathname)
  if (lastPath !== location.pathname) {
    setLastPath(location.pathname)
    setOpen(false)
    setServicesOpen(false)
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!open && !servicesOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        setServicesOpen(false)
      }
    }
    const onClick = (e: MouseEvent) => {
      if (servicesOpen && menuRef.current && !menuRef.current.contains(e.target as Node)) setServicesOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onClick)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onClick)
    }
  }, [open, servicesOpen])

  return (
    <header className="sticky top-0 z-50">
      {/* Utility bar */}
      <div className="hidden bg-ink-900 text-ink-200 md:block">
        <div className="container-page flex h-9 items-center justify-between text-xs">
          <p className="flex items-center gap-2">
            <Clock className="size-3.5 text-brand-300" aria-hidden="true" />
            {today ? (today.closed ? 'Closed today' : `Open today ${today.open} – ${today.close}`) : 'Mon–Sat appointments'}
            <span className="text-ink-500">·</span>
            <span>{clinic ? `${clinic.address_line.split(',').slice(-1)[0].trim()}, ${clinic.city}` : 'Indiranagar, Bengaluru'}</span>
          </p>
          {clinic && (
            <a href={`tel:${clinic.phone.replace(/\s/g, '')}`} className="flex items-center gap-1.5 hover:text-white">
              <Phone className="size-3.5 text-brand-300" aria-hidden="true" /> {clinic.phone}
            </a>
          )}
        </div>
      </div>

      <div className={cn('border-b bg-white/95 backdrop-blur transition-shadow', scrolled ? 'border-ink-100 shadow-sm' : 'border-transparent')}>
        <nav className="container-page flex h-[4.5rem] items-center justify-between gap-6" aria-label="Main">
          <Link to="/" aria-label="Cedarline Multispeciality Clinic – home">
            <Logo />
          </Link>

          {/* Desktop navigation */}
          <ul className="hidden items-center gap-0.5 xl:flex 2xl:gap-2">
            <li>
              <NavLink to="/" end className={linkClass}>
                Home
              </NavLink>
            </li>
            <li>
              <NavLink to="/about" className={linkClass}>
                About
              </NavLink>
            </li>
            <li className="relative" ref={menuRef}>
              <button
                type="button"
                aria-expanded={servicesOpen}
                aria-controls="services-menu"
                onClick={() => setServicesOpen((v) => !v)}
                className={cn(linkClass({ isActive: servicesActive }), 'inline-flex items-center gap-1')}
              >
                Services <ChevronDown className={cn('size-4 transition-transform', servicesOpen && 'rotate-180')} aria-hidden="true" />
              </button>
              {servicesOpen && (
                <div id="services-menu" className="absolute top-full left-1/2 mt-3 w-80 -translate-x-1/2 animate-pop rounded-2xl border border-ink-100 bg-white p-2 shadow-lift">
                  {SERVICE_LINKS.map((s) => (
                    <NavLink
                      key={s.to}
                      to={s.to}
                      end
                      className={({ isActive }) =>
                        cn('block rounded-xl px-4 py-3 transition-colors hover:bg-brand-50', isActive && 'bg-brand-50')
                      }
                    >
                      <span className="block text-sm font-semibold text-ink-900">{s.label}</span>
                      <span className="block text-xs text-ink-500">{s.description}</span>
                    </NavLink>
                  ))}
                </div>
              )}
            </li>
            {NAV.slice(1).map((item) => (
              <li key={item.to}>
                <NavLink to={item.to} className={linkClass}>
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2">
            <span className="hidden sm:block">
              <ButtonLink to="/appointments" variant="accent" icon={<CalendarCheck className="size-4" aria-hidden="true" />}>
                Book Appointment
              </ButtonLink>
            </span>
            <button
              type="button"
              className="grid size-11 place-items-center rounded-xl text-ink-800 hover:bg-ink-100 xl:hidden"
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={open ? 'Close menu' : 'Open menu'}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X className="size-6" /> : <Menu className="size-6" />}
            </button>
          </div>
        </nav>

        {/* Mobile navigation */}
        {open && (
          <div id="mobile-menu" className="max-h-[calc(100vh-4.5rem)] overflow-y-auto border-t border-ink-100 bg-white xl:hidden">
            <ul className="container-page space-y-1 py-4">
              {[{ to: '/', label: 'Home' }, NAV[0], ...SERVICE_LINKS, ...NAV.slice(1)].map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.to === '/' || item.to === '/services'}
                    className={({ isActive }) =>
                      cn(
                        'block rounded-xl px-4 py-3 text-base font-medium',
                        isActive ? 'bg-brand-50 text-brand-700' : 'text-ink-800 hover:bg-ink-50',
                        item.to.startsWith('/services/') && 'pl-8 text-[0.9375rem]',
                      )
                    }
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
              <li className="pt-3">
                <ButtonLink to="/appointments" variant="accent" size="lg" className="w-full">
                  Book an Appointment
                </ButtonLink>
              </li>
              {clinic && (
                <li>
                  <a href={`tel:${clinic.phone.replace(/\s/g, '')}`} className="mt-2 flex items-center justify-center gap-2 py-3 text-sm font-medium text-ink-600">
                    <Phone className="size-4" aria-hidden="true" /> Call {clinic.phone}
                  </a>
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
    </header>
  )
}
