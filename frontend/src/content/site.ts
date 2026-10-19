import {
  Accessibility,
  BadgeIndianRupee,
  Baby,
  CalendarClock,
  HeartHandshake,
  Microscope,
  ShieldCheck,
  Stethoscope,
  UsersRound,
  type LucideIcon,
} from 'lucide-react'

export const SITE_NAME = 'Cedarline Multispeciality Clinic'
export const SITE_URL = (import.meta.env.VITE_SITE_URL ?? '').replace(/\/$/, '')

export const DEFAULT_CLINIC = {
  name: SITE_NAME,
  phone: '+91 94835 41927',
  whatsapp: '+91 94835 41927',
  address_line: '2nd Floor, Cedar Court, 48 Lakeside Avenue, Indiranagar',
  city: 'Bengaluru',
  opening_hours: [
    { day: 'Monday', open: '09:00', close: '20:00', closed: false },
    { day: 'Tuesday', open: '09:00', close: '20:00', closed: false },
    { day: 'Wednesday', open: '09:00', close: '20:00', closed: false },
    { day: 'Thursday', open: '09:00', close: '20:00', closed: false },
    { day: 'Friday', open: '09:00', close: '20:00', closed: false },
    { day: 'Saturday', open: '09:00', close: '17:00', closed: false },
    { day: 'Sunday', open: null, close: null, closed: true },
  ],
}

/** Static marketing copy for the fictional clinic. Dynamic data (doctors, services, hours) comes from the API. */


export const DEPARTMENTS = [
  {
    key: 'dental',
    title: 'Dental Care',
    to: '/services/dental',
    image: '/images/dental-consult.webp',
    summary: 'Check-ups, root canal treatment, braces, clear aligners, implants and whitening.',
  },
  {
    key: 'skin',
    title: 'Skin & Dermatology',
    to: '/services/skin',
    image: '/images/skin-facial.webp',
    summary: 'Medical dermatology plus peels, laser hair reduction and acne-scar care.',
  },
  {
    key: 'hair',
    title: 'Hair & Trichology',
    to: '/services/hair',
    image: '/images/hair-scalp-care.webp',
    summary: 'Hair-fall assessment with trichoscopy, scalp care, PRP and FUE consultations.',
  },
  {
    key: 'general',
    title: 'Family & General Medicine',
    to: '/services#general',
    image: '/images/doctor-patient.webp',
    summary: 'Family physicians, chronic-condition care, preventive check-ups and paediatrics.',
  },
] as const

export const WHY_CHOOSE: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: UsersRound, title: 'Specialists under one roof', text: 'Nine consultants across five departments who refer to each other, so you are not passed between hospitals.' },
  { icon: BadgeIndianRupee, title: 'Clear, upfront pricing', text: 'Indicative starting prices are published, and every cost is explained before any procedure begins.' },
  { icon: CalendarClock, title: 'Evening & Saturday clinics', text: 'Consultations until 8 PM on weekdays and on Saturdays, built around working families.' },
  { icon: Microscope, title: 'Modern diagnostics', text: 'Digital dental imaging, trichoscopy and an in-house sample collection point.' },
  { icon: Baby, title: 'Child-friendly care', text: 'A dedicated paediatrician and gentle children’s dentistry in a calm setting.' },
  { icon: Accessibility, title: 'Accessible for everyone', text: 'Step-free entrance, lift access and an accessible restroom on our floor.' },
]

export const BOOKING_STEPS = [
  { title: 'Find the right doctor', text: 'Browse our doctors or ask the AI assistant which specialist sees what, and on which days.' },
  { title: 'Call or email us', text: 'Contact the front desk by phone or email, or drop in at reception, with your preferred dates.' },
  { title: 'Get your time confirmed', text: 'We confirm your appointment on the call, or reply to your email within one working day.' },
]

/** Fictional patient feedback for demonstration only. */
export const TESTIMONIALS = [
  { quote: 'Dr. Iyer explained every option for my root canal and the cost before we started. No surprises, and very gentle.', name: 'Ritika S.', detail: 'Dental patient' },
  { quote: 'Being able to get an evening appointment made it easy to get my father’s diabetes reviews done after work.', name: 'Mohammed A.', detail: 'Family medicine' },
  { quote: 'The trichoscopy showed exactly what was going on with my scalp. I finally have a plan I understand.', name: 'Deepak N.', detail: 'Hair & scalp care' },
]

export const VALUES: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: HeartHandshake, title: 'Unhurried consultations', text: 'Appointment lengths are set by specialty so doctors have time to listen and explain.' },
  { icon: ShieldCheck, title: 'Evidence-based care', text: 'We recommend treatments only when there is good reason to, and we say so when there isn’t.' },
  { icon: Stethoscope, title: 'Joined-up specialists', text: 'Our physicians, dentists and dermatologists share notes so care stays coordinated.' },
  { icon: BadgeIndianRupee, title: 'Transparent costs', text: 'Itemised bills and published starting prices, with costs discussed before treatment.' },
]

export const FACILITIES = [
  'Three dental suites with digital X-ray',
  'Dermatology procedure room with medical-grade lasers',
  'Trichoscopy and scalp imaging',
  'In-house sample collection point',
  'Child-friendly waiting area',
  'Step-free access, lift and accessible restroom',
]
