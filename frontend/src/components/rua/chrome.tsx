import { CalendarCheck, ChevronDown, Clock, MapPin, Menu, Phone, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { Logo } from '@/components/site/Logo'
import { BrandIcon, OpenStatus, SocialIcon } from '@/components/rua/ui'
import { ButtonLink } from '@/components/ui/Button'
import { WhatsAppIcon } from '@/components/ui/WhatsAppIcon'
import {
  BRAND,
  CATEGORIES,
  CENTRES,
  DOCTORS,
  categoryPath,
  centrePath,
  doctorPath,
  treatmentPath,
  treatmentsInCategory,
} from '@/content/rua'
import { cn } from '@/utils/format'
import { telHref, whatsappLink } from '@/utils/rua'

const WHATSAPP_HELLO = 'Hello RUA Skin & Hair Center, I have an enquiry.'
const YEAR = new Date().getFullYear()

// --- Call menu (both centres) ------------------------------------------------------------------------

function CallMenu({ tone = 'light', align = 'right' }: { tone?: 'light' | 'dark'; align?: 'left' | 'right' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={cn(
          'inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold transition',
          tone === 'light' ? 'text-cream ring-1 ring-cream/25 hover:bg-cream/10' : 'text-brand-800 ring-1 ring-ink-200 hover:bg-brand-50',
        )}
      >
        <Phone className="size-4" aria-hidden="true" /> Call us
        <ChevronDown className={cn('size-3.5 transition-transform', open && 'rotate-180')} aria-hidden="true" />
      </button>
      {open && (
        <div
          className={cn(
            'animate-pop absolute top-full z-50 mt-2 w-72 overflow-hidden rounded-2xl bg-white p-2 shadow-lift ring-1 ring-ink-100',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          {CENTRES.map((c) => (
            <a
              key={c.slug}
              href={telHref(c.phone)}
              data-centre={c.slug}
              className="flex items-center gap-3 rounded-xl p-3 transition hover:bg-brand-50"
            >
              <span className="grid size-10 place-items-center rounded-full bg-brand-800 text-cream">
                <Phone className="size-4" aria-hidden="true" />
              </span>
              <span>
                <span className="block text-sm font-semibold text-ink-900">{c.name}</span>
                <span className="block text-sm text-ink-600">{c.phoneDisplay}</span>
              </span>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

// --- Header ---------------------------------------------------------------------------------------------

const NAV_LINK =
  'relative inline-flex h-11 items-center gap-1 rounded-full px-4 text-[0.9375rem] font-medium text-cream/80 transition hover:text-cream'

export function SiteHeader() {
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [menu, setMenu] = useState<'services' | 'centres' | null>(null)
  const [scrolled, setScrolled] = useState(false)
  const closeTimer = useRef<number | undefined>(undefined)

  // Close menus on navigation (state adjusted during render).
  const [lastPath, setLastPath] = useState(location.pathname)
  if (lastPath !== location.pathname) {
    setLastPath(location.pathname)
    setMobileOpen(false)
    setMenu(null)
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

  const openMenu = (m: 'services' | 'centres') => {
    window.clearTimeout(closeTimer.current)
    setMenu(m)
  }
  const scheduleClose = () => {
    closeTimer.current = window.setTimeout(() => setMenu(null), 160)
  }

  const active = (prefix: string) => location.pathname === prefix || location.pathname.startsWith(`${prefix}/`)

  return (
    <header className="sticky top-0 z-50">
      {/* Utility bar */}
      <div className="hidden bg-brand-950 text-cream md:block">
        <div className="container-page flex h-10 items-center justify-between gap-6 text-[0.8125rem]">
          <div className="flex items-center gap-5">
            <OpenStatus tone="light" />
            <span className="hidden items-center gap-1.5 text-cream/65 lg:inline-flex">
              <Clock className="size-3.5" aria-hidden="true" /> {BRAND.hours.days}, {BRAND.hours.short}
            </span>
          </div>
          <div className="flex items-center gap-5">
            {CENTRES.map((c) => (
              <a key={c.slug} href={telHref(c.phone)} data-centre={c.slug} className="inline-flex items-center gap-1.5 text-cream/80 hover:text-cream">
                <Phone className="size-3.5 text-accent-300" aria-hidden="true" />
                <span className="hidden lg:inline">{c.area}</span> {c.phoneDisplay}
              </a>
            ))}
            <span className="h-4 w-px bg-cream/20" aria-hidden="true" />
            {BRAND.social.slice(0, 3).map((s) => (
              <a key={s.id} href={s.url} target="_blank" rel="noopener noreferrer" aria-label={`RUA on ${s.label}`} className="text-cream/70 hover:text-cream">
                <SocialIcon id={s.id} className="size-4" />
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Main bar */}
      <div className={cn('surface-cocoa relative transition-shadow duration-300', scrolled && 'shadow-[0_12px_30px_-12px_rgba(43,23,17,0.6)]')}>
        <div className="slats pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
        <nav className="container-page relative flex h-[4.5rem] items-center justify-between gap-4 lg:h-20" aria-label="Main">
          <Link to="/about-us" aria-label="RUA Skin & Hair Center" className="shrink-0">
            <Logo tone="light" />
          </Link>

          <ul className="hidden items-center gap-0.5 xl:flex">
            <li>
              <NavLink to="/about-us" className={({ isActive }) => cn(NAV_LINK, isActive && 'text-cream')}>
                About
              </NavLink>
            </li>
            <li onMouseEnter={() => openMenu('services')} onMouseLeave={scheduleClose}>
              <button
                type="button"
                className={cn(NAV_LINK, (active('/services') || menu === 'services') && 'text-cream')}
                aria-expanded={menu === 'services'}
                onClick={() => setMenu((m) => (m === 'services' ? null : 'services'))}
              >
                Services <ChevronDown className={cn('size-4 transition-transform', menu === 'services' && 'rotate-180')} aria-hidden="true" />
              </button>
              {menu === 'services' && (
                <div className="fixed inset-x-0 top-[calc(var(--header-offset,7.5rem))] z-50 px-4 pt-2 xl:absolute xl:inset-x-auto xl:top-full xl:left-1/2 xl:w-[min(76rem,calc(100vw-3rem))] xl:-translate-x-1/2 xl:px-0">
                  <div className="animate-pop overflow-hidden rounded-[1.75rem] bg-white shadow-lift ring-1 ring-ink-100">
                    <div className="grid grid-cols-4 gap-x-8 gap-y-7 p-8">
                      {CATEGORIES.map((c) => (
                        <div key={c.slug}>
                          <Link to={categoryPath(c.slug)} className="group flex items-center gap-2.5">
                            <span className="grid size-9 place-items-center rounded-full bg-brand-50 text-brand-700 ring-1 ring-brand-100 transition group-hover:bg-brand-800 group-hover:text-cream">
                              <BrandIcon name={c.icon} className="size-4" />
                            </span>
                            <span className="font-display text-[1.05rem] text-ink-900 group-hover:text-brand-700">{c.navName}</span>
                          </Link>
                          <ul className="mt-3 space-y-1.5 pl-[2.875rem]">
                            {treatmentsInCategory(c.slug)
                              .slice(0, 4)
                              .map((t) => (
                                <li key={t.slug}>
                                  <Link to={treatmentPath(t)} className="text-sm text-ink-600 hover:text-brand-700">
                                    {t.name}
                                  </Link>
                                </li>
                              ))}
                          </ul>
                        </div>
                      ))}
                      <div className="surface-cocoa relative isolate flex flex-col justify-between overflow-hidden rounded-2xl p-5 text-cream">
                        <div className="slats absolute inset-0 -z-10 opacity-70" aria-hidden="true" />
                        <p className="eyebrow-light">Not sure where to start?</p>
                        <p className="mt-2 font-display text-lg leading-snug">Book a consultation and a dermatologist will guide you.</p>
                        <ButtonLink to="/book-appointment" size="sm" variant="accent" className="mt-4 self-start">
                          Book now
                        </ButtonLink>
                      </div>
                    </div>
                    <div className="flex items-center justify-between bg-sand/60 px-8 py-3.5 text-sm">
                      <span className="text-ink-600">{BRAND.positioning}</span>
                      <Link to="/services" className="font-semibold text-brand-700 hover:underline">
                        View all services →
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </li>
            <li>
              <NavLink to="/doctors" className={({ isActive }) => cn(NAV_LINK, isActive && 'text-cream')}>
                Doctors
              </NavLink>
            </li>
            <li className="relative" onMouseEnter={() => openMenu('centres')} onMouseLeave={scheduleClose}>
              <button
                type="button"
                className={cn(NAV_LINK, (active('/centers') || menu === 'centres') && 'text-cream')}
                aria-expanded={menu === 'centres'}
                onClick={() => setMenu((m) => (m === 'centres' ? null : 'centres'))}
              >
                Centres <ChevronDown className={cn('size-4 transition-transform', menu === 'centres' && 'rotate-180')} aria-hidden="true" />
              </button>
              {menu === 'centres' && (
                <div className="absolute top-full left-1/2 z-50 w-[26rem] -translate-x-1/2 pt-2">
                  <div className="animate-pop rounded-[1.5rem] bg-white p-2 shadow-lift ring-1 ring-ink-100">
                    {CENTRES.map((c) => (
                      <Link key={c.slug} to={centrePath(c.slug)} className="flex gap-3 rounded-2xl p-4 transition hover:bg-brand-50">
                        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-800 text-cream">
                          <MapPin className="size-4" aria-hidden="true" />
                        </span>
                        <span>
                          <span className="flex items-center gap-2 font-display text-lg text-ink-900">
                            {c.name}
                            {c.isNew && <span className="rounded-full bg-accent-100 px-2 py-0.5 font-sans text-[0.65rem] font-bold text-accent-700">NEW</span>}
                          </span>
                          <span className="mt-0.5 block text-sm leading-6 text-ink-600">{c.addressLines[0]}</span>
                        </span>
                      </Link>
                    ))}
                    <Link to="/centers" className="block rounded-2xl px-4 py-3 text-sm font-semibold text-brand-700 hover:bg-brand-50">
                      Compare both centres →
                    </Link>
                  </div>
                </div>
              )}
            </li>
            <li>
              <NavLink to="/contact" className={({ isActive }) => cn(NAV_LINK, isActive && 'text-cream')}>
                Contact
              </NavLink>
            </li>
          </ul>

          <div className="flex items-center gap-2">
            <div className="hidden lg:block">
              <CallMenu />
            </div>
            <span className="hidden sm:block">
              <ButtonLink to="/book-appointment" variant="accent" icon={<CalendarCheck className="size-4" aria-hidden="true" />}>
                Book appointment
              </ButtonLink>
            </span>
            <button
              type="button"
              className="grid size-11 place-items-center rounded-full text-cream ring-1 ring-cream/25 xl:hidden"
              aria-expanded={mobileOpen}
              aria-controls="mobile-menu"
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              onClick={() => setMobileOpen((v) => !v)}
            >
              {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </nav>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div id="mobile-menu" className="fixed inset-x-0 top-[4.5rem] bottom-0 z-40 overflow-y-auto bg-ivory md:top-[7rem] xl:hidden">
          <div className="container-page space-y-8 py-6 pb-28">
            <div className="grid gap-2">
              {[
                ['/about-us', 'About RUA'],
                ['/services', 'All services'],
                ['/doctors', 'Our doctors'],
                ['/centers', 'Our centres'],
                ['/contact', 'Contact'],
              ].map(([to, label]) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) =>
                    cn('rounded-2xl px-5 py-3.5 font-display text-xl', isActive ? 'bg-brand-800 text-cream' : 'bg-white text-ink-900 ring-1 ring-ink-100')
                  }
                >
                  {label}
                </NavLink>
              ))}
            </div>
            <div>
              <p className="eyebrow mb-3">Services</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {CATEGORIES.map((c) => (
                  <Link key={c.slug} to={categoryPath(c.slug)} className="flex items-center gap-3 rounded-2xl bg-white p-3 ring-1 ring-ink-100">
                    <span className="grid size-9 place-items-center rounded-full bg-brand-50 text-brand-700">
                      <BrandIcon name={c.icon} className="size-4" />
                    </span>
                    <span className="font-medium text-ink-900">{c.name}</span>
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <p className="eyebrow mb-3">Doctors</p>
              <div className="grid gap-2">
                {DOCTORS.map((d) => (
                  <Link key={d.slug} to={doctorPath(d.slug)} className="flex items-center gap-3 rounded-2xl bg-white p-3 ring-1 ring-ink-100">
                    <img src={d.photo} alt="" className="size-11 rounded-full bg-brand-800 object-cover object-top" />
                    <span>
                      <span className="block font-medium text-ink-900">{d.name}</span>
                      <span className="block text-sm text-ink-500">{d.role}</span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
            <div className="grid gap-2">
              {CENTRES.map((c) => (
                <a key={c.slug} href={telHref(c.phone)} data-centre={c.slug} className="flex items-center justify-between rounded-2xl bg-white p-4 ring-1 ring-ink-100">
                  <span className="font-medium text-ink-900">Call {c.area}</span>
                  <span className="text-sm text-brand-700">{c.phoneDisplay}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}

// --- Footer ------------------------------------------------------------------------------------------

export function SiteFooter() {
  return (
    <footer className="surface-cocoa relative isolate overflow-hidden pb-24 text-cream md:pb-0">
      <div className="slats absolute inset-0 -z-10 opacity-60" aria-hidden="true" />
      <div className="hairline-gold h-px w-full opacity-70" aria-hidden="true" />
      <div className="container-page grid gap-12 py-16 lg:grid-cols-12 lg:py-20">
        <div className="lg:col-span-4">
          <Logo tone="light" variant="stacked" className="h-32" />
          <p className="mt-6 font-display text-2xl text-cream/95 italic">{BRAND.tagline}</p>
          <p className="mt-4 max-w-sm leading-7 text-cream/70">{BRAND.promise}</p>
          <div className="mt-6 flex gap-2.5">
            {BRAND.social.map((s) => (
              <a
                key={s.id}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`RUA on ${s.label}`}
                className="grid size-10 place-items-center rounded-full text-cream/80 ring-1 ring-cream/20 transition hover:bg-cream hover:text-brand-800"
              >
                <SocialIcon id={s.id} className="size-4.5" />
              </a>
            ))}
          </div>
        </div>

        <div className="grid gap-10 sm:grid-cols-3 lg:col-span-8">
          <div>
            <p className="eyebrow-light">Services</p>
            <ul className="mt-5 space-y-2.5 text-[0.95rem]">
              {CATEGORIES.map((c) => (
                <li key={c.slug}>
                  <Link to={categoryPath(c.slug)} className="text-cream/75 hover:text-cream">
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="eyebrow-light">Popular treatments</p>
            <ul className="mt-5 space-y-2.5 text-[0.95rem]">
              {[
                ['hair-transplant', 'fue-hair-transplant', 'Hair transplant'],
                ['hair-treatments', 'prp-hair-treatment', 'PRP hair treatment'],
                ['laser-treatments', 'laser-hair-reduction', 'Laser hair reduction'],
                ['aesthetic-dermatology', 'hydrafacial', 'HydraFacial'],
                ['medical-dermatology', 'acne-scar-treatment', 'Acne & acne scars'],
                ['medical-dermatology', 'pigmentation-melasma-treatment', 'Pigmentation & melasma'],
              ].map(([cat, slug, label]) => (
                <li key={slug}>
                  <Link to={`/services/${cat}/${slug}`} className="text-cream/75 hover:text-cream">
                    {label}
                  </Link>
                </li>
              ))}
              <li className="pt-2">
                <span className="text-xs tracking-wider text-cream/50 uppercase">Doctors</span>
              </li>
              {DOCTORS.map((d) => (
                <li key={d.slug}>
                  <Link to={doctorPath(d.slug)} className="text-cream/75 hover:text-cream">
                    {d.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="eyebrow-light">Visit us</p>
            <div className="mt-5 space-y-6 text-[0.95rem]">
              {CENTRES.map((c) => (
                <div key={c.slug}>
                  <Link to={centrePath(c.slug)} className="font-display text-lg text-cream hover:text-accent-200">
                    {c.name}
                  </Link>
                  <address className="mt-1.5 leading-6 text-cream/65 not-italic">{c.addressLines.join(', ')}</address>
                  <a href={telHref(c.phone)} data-centre={c.slug} className="mt-1.5 inline-flex items-center gap-1.5 font-semibold text-accent-200 hover:text-accent-100">
                    <Phone className="size-3.5" aria-hidden="true" /> {c.phoneDisplay}
                  </a>
                </div>
              ))}
              <div className="rounded-2xl bg-cream/5 p-4 ring-1 ring-cream/15">
                <p className="text-sm font-semibold">Business hours</p>
                <p className="mt-1 text-sm text-cream/70">
                  {BRAND.hours.days}
                  <br />
                  {BRAND.hours.label}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="border-t border-cream/10">
        <div className="container-page flex flex-col gap-3 py-6 text-xs text-cream/55 sm:flex-row sm:items-center sm:justify-between">
          <p>© {YEAR} {BRAND.name}. All rights reserved.</p>
          <p className="max-w-2xl sm:text-right">
            Information on this website is general and not a substitute for medical advice. Treatment plans and results vary from person to
            person.
          </p>
        </div>
      </div>
    </footer>
  )
}

// --- Mobile action bar + WhatsApp button --------------------------------------------------------------

export function MobileActionBar() {
  const [callOpen, setCallOpen] = useState(false)
  return (
    <>
      {callOpen && (
        <div className="fixed inset-0 z-[60] bg-brand-950/50 backdrop-blur-sm md:hidden" onClick={() => setCallOpen(false)}>
          <div className="animate-fade-up absolute inset-x-3 bottom-24 rounded-3xl bg-white p-3 shadow-lift" onClick={(e) => e.stopPropagation()}>
            <p className="px-3 pt-2 pb-1 text-sm font-semibold text-ink-500">Call a centre</p>
            {CENTRES.map((c) => (
              <a key={c.slug} href={telHref(c.phone)} data-centre={c.slug} className="flex items-center justify-between rounded-2xl p-3.5 hover:bg-brand-50">
                <span className="font-display text-lg text-ink-900">{c.area}</span>
                <span className="font-semibold text-brand-700">{c.phoneDisplay}</span>
              </a>
            ))}
          </div>
        </div>
      )}
      <div className="fixed inset-x-3 bottom-3 z-50 md:hidden">
        <div className="surface-cocoa grid grid-cols-3 gap-1 rounded-[1.4rem] p-1.5 shadow-[0_16px_40px_-12px_rgba(43,23,17,0.7)] ring-1 ring-cream/10">
          <button type="button" onClick={() => setCallOpen(true)} className="flex flex-col items-center gap-1 rounded-2xl py-2 text-xs font-semibold text-cream">
            <Phone className="size-5" aria-hidden="true" /> Call
          </button>
          <a
            href={whatsappLink(WHATSAPP_HELLO)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-1 rounded-2xl py-2 text-xs font-semibold text-cream"
          >
            <WhatsAppIcon className="size-5" aria-hidden="true" /> WhatsApp
          </a>
          <Link to="/book-appointment" className="flex flex-col items-center gap-1 rounded-2xl bg-accent-400 py-2 text-xs font-bold text-brand-950">
            <CalendarCheck className="size-5" aria-hidden="true" /> Book
          </Link>
        </div>
      </div>
    </>
  )
}

export function WhatsAppFloat() {
  // Bottom-right, stacked just above the "Ask RUA AI" launcher (48px tall; bottom-20 on phones, above the
  // mobile action bar, and bottom-6 from sm up), so the two always sit together.
  return (
    <a
      href={whatsappLink(WHATSAPP_HELLO)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with RUA on WhatsApp"
      title="Chat on WhatsApp"
      className="fixed right-4 bottom-[8.75rem] z-40 inline-flex size-12 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_10px_26px_-8px_rgba(37,211,102,0.6)] transition hover:-translate-y-0.5 hover:scale-105 sm:right-6 sm:bottom-[5.25rem]"
    >
      <WhatsAppIcon className="size-7" aria-hidden="true" />
    </a>
  )
}
