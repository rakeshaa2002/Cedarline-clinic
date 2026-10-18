import {
  CalendarCheck,
  ChevronDown,
  ChevronRight,
  Clock,
  Menu,
  Phone,
  ScanFace,
  Scissors,
  Smile,
  Sparkles,
  X,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { ButtonLink } from '@/components/ui/Button'
import { Logo } from '@/components/site/Logo'
import { WhatsAppIcon } from '@/components/ui/WhatsAppIcon'
import { todayHours, useClinicInfo, useServices } from '@/hooks/useClinic'
import { cn } from '@/utils/format'

const BASE_SERVICE_LINKS = [
  {
    to: '/services',
    label: 'All Services',
    description: 'Complete directory of specialised medical procedures',
    icon: Sparkles,
    badge: 'Directory',
  },
  {
    to: '/services/dental',
    label: 'Dental Treatments',
    description: 'Implants, clear aligners, root canals & cosmetic dentistry',
    icon: Smile,
    badge: 'Department',
  },
  {
    to: '/services/skin',
    label: 'Skin Treatments',
    description: 'Dermatology, acne therapies, chemical peels & anti-aging',
    icon: ScanFace,
    badge: 'Department',
  },
  {
    to: '/services/hair',
    label: 'Hair Treatments',
    description: 'Trichology, PRP therapy, hair restoration & scalp care',
    icon: Scissors,
    badge: 'Department',
  },
]

const NAV = [
  { to: '/about', label: 'About' },
  { to: '/doctors', label: 'Our Doctors' },
  { to: '/blog', label: 'Patient Education' },
  { to: '/contact', label: 'Contact' },
]

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'relative rounded-xl px-3.5 py-2 text-[0.9375rem] font-semibold whitespace-nowrap transition-all duration-200 ease-out',
    isActive
      ? 'bg-brand-50/90 text-brand-700 shadow-xs ring-1 ring-brand-100/90'
      : 'text-ink-700 hover:text-brand-700 hover:bg-ink-50/80',
  )

export function Navbar() {
  const [open, setOpen] = useState(false)
  const [servicesOpen, setServicesOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const location = useLocation()
  const { data: clinic } = useClinicInfo()
  const { data: servicesList } = useServices()
  const menuRef = useRef<HTMLLIElement>(null)
  const today = clinic ? todayHours(clinic.opening_hours) : undefined
  const servicesActive = location.pathname.startsWith('/services')
  const count = servicesList?.length
  const SERVICE_LINKS = BASE_SERVICE_LINKS.map((s) =>
    s.to === '/services' && count
      ? { ...s, description: `Complete directory of ${count} specialised medical procedures` }
      : s,
  )

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setServicesOpen(true)
  }

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setServicesOpen(false)
    }, 180)
  }

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

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
      <div className="bg-ink-900 text-ink-200 border-b border-white/10 shadow-xs">
        <div className="container-page flex min-h-[3rem] py-2.5 sm:h-13 items-center justify-between text-sm sm:text-[0.9375rem]">
          <div className="flex items-center gap-2.5 sm:gap-3.5 flex-wrap">
            <span className="relative flex size-2.5">
              <span className={cn('absolute inline-flex size-full animate-ping rounded-full opacity-75', today?.closed ? 'bg-amber-400' : 'bg-emerald-400')} />
              <span className={cn('relative inline-flex size-2.5 rounded-full', today?.closed ? 'bg-amber-500' : 'bg-emerald-500')} />
            </span>
            <span className="flex items-center gap-2 font-medium text-ink-100">
              <Clock className="size-4.5 text-brand-300 shrink-0" aria-hidden="true" />
              <span className="font-semibold text-white">
                {today ? (today.closed ? 'Closed today' : `Open today ${today.open} – ${today.close}`) : 'Mon–Sat appointments'}
              </span>
            </span>
            <span className="hidden sm:inline text-ink-500">·</span>
            <span className="hidden sm:inline text-ink-300 font-medium">
              {clinic ? `${clinic.address_line.split(',').slice(-1)[0].trim()}, ${clinic.city}` : 'Indiranagar, Bengaluru'}
            </span>
          </div>
          {clinic && (
            <div className="flex items-center gap-4 sm:gap-6 text-sm sm:text-[0.9375rem]">
              <a
                href={`https://wa.me/${(clinic.whatsapp || clinic.phone).replace(/\D/g, '')}?text=${encodeURIComponent('Hello Cedarline Clinic, I have an enquiry.')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-2 font-semibold text-white transition-colors hover:text-emerald-400"
              >
                <WhatsAppIcon className="size-5 text-[#25D366] transition-transform group-hover:scale-110" aria-hidden="true" />
                <span className="hidden sm:inline">WhatsApp</span>
              </a>
              <span className="text-ink-600">·</span>
              <a
                href={`tel:${clinic.phone.replace(/\s/g, '')}`}
                className="group flex items-center gap-2 font-bold text-white transition-colors hover:text-brand-300"
              >
                <Phone className="size-4.5 text-brand-300 transition-transform group-hover:scale-110" aria-hidden="true" />
                <span>{clinic.phone}</span>
              </a>
            </div>
          )}
        </div>
      </div>

      <div className={cn('border-b bg-white/90 backdrop-blur-xl transition-all duration-300', scrolled ? 'border-ink-100 shadow-[0_4px_24px_-4px_rgba(13,33,57,0.08)]' : 'border-transparent')}>
        <nav className="container-page flex h-20 items-center justify-between gap-6" aria-label="Main">
          <Link to="/" aria-label="Cedarline Multispeciality Clinic – home">
            <Logo />
          </Link>

          {/* Desktop navigation */}
          <ul className="hidden items-center gap-1 xl:flex 2xl:gap-2">
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
            <li
              className="relative group py-2"
              ref={menuRef}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              <button
                type="button"
                aria-expanded={servicesOpen}
                aria-controls="services-menu"
                onClick={() => setServicesOpen((v) => !v)}
                className={cn(
                  linkClass({ isActive: servicesActive }),
                  'inline-flex items-center gap-1 cursor-pointer transition-colors',
                  servicesOpen && 'bg-brand-50/90 text-brand-700 ring-1 ring-brand-100/90',
                )}
              >
                Services{' '}
                <ChevronDown
                  className={cn(
                    'size-4 transition-transform duration-200 group-hover:rotate-180',
                    servicesOpen && 'rotate-180',
                  )}
                  aria-hidden="true"
                />
              </button>

              {/* Dropdown Menu: Hybrid Pure-CSS Hover (instant) + React state */}
              <div
                id="services-menu"
                className={cn(
                  'absolute top-full left-1/2 -translate-x-1/2 pt-2 w-[23rem] z-50 transition-all duration-200 ease-out',
                  servicesOpen
                    ? 'opacity-100 visible pointer-events-auto translate-y-0'
                    : 'opacity-0 invisible pointer-events-none -translate-y-1.5 group-hover:opacity-100 group-hover:visible group-hover:pointer-events-auto group-hover:translate-y-0',
                )}
              >
                <div className="overflow-hidden rounded-2xl border border-ink-100/90 bg-white/98 p-2 shadow-2xl backdrop-blur-xl ring-1 ring-ink-900/5">
                  <div className="space-y-0.5">
                    {SERVICE_LINKS.map((s) => {
                      const Icon = s.icon
                      return (
                        <NavLink
                          key={s.to}
                          to={s.to}
                          end
                          onClick={() => setServicesOpen(false)}
                          className={({ isActive }) =>
                            cn(
                              'group/item flex items-center gap-3 rounded-xl p-2.5 transition-all duration-150 hover:bg-brand-50/90 hover:shadow-xs',
                              isActive && 'bg-brand-50/90 ring-1 ring-brand-100',
                            )
                          }
                        >
                          <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-100/80 transition-all duration-150 group-hover/item:bg-brand-600 group-hover/item:text-white group-hover/item:shadow-sm">
                            <Icon className="size-4" aria-hidden="true" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="block text-sm font-bold text-ink-900 transition-colors group-hover/item:text-brand-700">
                                {s.label}
                              </span>
                              <span className="rounded-full bg-ink-100/80 px-1.5 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wider text-ink-600">
                                {s.badge}
                              </span>
                            </div>
                            <span className="block text-xs text-ink-500 truncate">
                              {s.description}
                            </span>
                          </div>
                          <ChevronRight
                            className="size-4 shrink-0 text-ink-400 opacity-0 -translate-x-1 transition-all duration-150 group-hover/item:opacity-100 group-hover/item:translate-x-0 group-hover/item:text-brand-600"
                            aria-hidden="true"
                          />
                        </NavLink>
                      )
                    })}
                  </div>
                  <div className="mt-1 flex items-center justify-between rounded-xl bg-brand-50/60 px-3 py-2 text-xs text-ink-600">
                    <span className="font-medium text-brand-900">Need treatment guidance?</span>
                    <Link
                      to="/contact"
                      onClick={() => setServicesOpen(false)}
                      className="font-semibold text-brand-700 transition-colors hover:text-brand-800 hover:underline"
                    >
                      Ask clinic team &rarr;
                    </Link>
                  </div>
                </div>
              </div>
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
                <li className="space-y-1 pt-1">
                  <a
                    href={`https://wa.me/${(clinic.whatsapp || clinic.phone).replace(/\D/g, '')}?text=${encodeURIComponent('Hello Cedarline Clinic, I have an enquiry.')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 rounded-xl bg-emerald-50 py-3 text-sm font-semibold text-emerald-800 transition-colors hover:bg-emerald-100"
                  >
                    <WhatsAppIcon className="size-4 text-[#25D366]" aria-hidden="true" /> Chat on WhatsApp
                  </a>
                  <a href={`tel:${clinic.phone.replace(/\s/g, '')}`} className="flex items-center justify-center gap-2 py-2 text-sm font-medium text-ink-600">
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
