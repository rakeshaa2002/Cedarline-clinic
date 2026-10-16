import { Clock, Mail, MapPin, Phone } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Logo } from '@/components/site/Logo'
import { WhatsAppIcon } from '@/components/ui/WhatsAppIcon'
import { useClinicInfo } from '@/hooks/useClinic'

const COLUMNS = [
  {
    title: 'Clinic',
    links: [
      { to: '/about', label: 'About the Clinic' },
      { to: '/doctors', label: 'Our Doctors' },
      { to: '/blog', label: 'Patient Education' },
      { to: '/contact', label: 'Contact Us' },
      { to: '/doctor/login', label: 'Doctor & Staff Portal' },
    ],
  },
  {
    title: 'Services',
    links: [
      { to: '/services', label: 'All Services' },
      { to: '/services/dental', label: 'Dental Treatments' },
      { to: '/services/skin', label: 'Skin Treatments' },
      { to: '/services/hair', label: 'Hair Treatments' },
    ],
  },
]

const YEAR = new Date().getFullYear()

export function Footer() {
  const { data: clinic } = useClinicInfo()
  const weekdays = clinic?.opening_hours.find((h) => h.day === 'Monday')
  const saturday = clinic?.opening_hours.find((h) => h.day === 'Saturday')

  return (
    <footer className="bg-ink-950 text-ink-300">
      <div className="container-page grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.4fr]">
        <div>
          <Logo tone="light" />
          <p className="mt-5 max-w-xs text-sm leading-6 text-ink-400">
            Specialist dental, skin, hair and family care under one roof in Indiranagar, Bengaluru.
          </p>
          <Link
            to="/appointments"
            className="mt-6 inline-flex rounded-xl bg-accent-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-600"
          >
            Book an appointment
          </Link>
        </div>

        {COLUMNS.map((col) => (
          <nav key={col.title} aria-label={`${col.title} links`}>
            <h2 className="text-sm font-semibold tracking-wide text-white">{col.title}</h2>
            <ul className="mt-4 space-y-3 text-sm">
              {col.links.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="hover:text-white">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}

        <div>
          <h2 className="text-sm font-semibold tracking-wide text-white">Visit us</h2>
          {clinic ? (
            <ul className="mt-4 space-y-4 text-sm">
              <li className="flex gap-3">
                <MapPin className="mt-0.5 size-4 shrink-0 text-brand-300" aria-hidden="true" />
                <address className="not-italic leading-6">
                  {clinic.address_line}, {clinic.city} {clinic.postal_code}
                </address>
              </li>
              <li className="flex gap-3">
                <Phone className="mt-0.5 size-4 shrink-0 text-brand-300" aria-hidden="true" />
                <a href={`tel:${clinic.phone.replace(/\s/g, '')}`} className="hover:text-white">
                  {clinic.phone}
                </a>
              </li>
              <li className="flex gap-3">
                <WhatsAppIcon className="mt-0.5 size-4 shrink-0 text-[#25D366]" aria-hidden="true" />
                <a
                  href={`https://wa.me/${(clinic.whatsapp || clinic.phone).replace(/\D/g, '')}?text=${encodeURIComponent('Hello Cedarline Clinic, I have an enquiry.')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white"
                >
                  WhatsApp: {clinic.whatsapp || clinic.phone}
                </a>
              </li>
              <li className="flex gap-3">
                <Mail className="mt-0.5 size-4 shrink-0 text-brand-300" aria-hidden="true" />
                <a href={`mailto:${clinic.email}`} className="hover:text-white">
                  {clinic.email}
                </a>
              </li>
              <li className="flex gap-3">
                <Clock className="mt-0.5 size-4 shrink-0 text-brand-300" aria-hidden="true" />
                <span className="leading-6">
                  Mon–Fri {weekdays?.open}–{weekdays?.close}
                  <br />
                  Sat {saturday?.open}–{saturday?.close} · Sun closed
                </span>
              </li>
            </ul>
          ) : (
            <p className="mt-4 text-sm">Contact details are loading…</p>
          )}
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-2 py-6 text-xs text-ink-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {YEAR} Cedarline Multispeciality Clinic. Demo website — all clinic details, doctors and patients are fictional.</p>
          <p>Not for emergencies: call 112 or visit the nearest hospital.</p>
        </div>
      </div>
    </footer>
  )
}
