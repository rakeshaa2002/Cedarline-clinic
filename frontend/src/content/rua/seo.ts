/**
 * Page metadata and schema.org structured data for every public route.
 *
 * Used twice: by the React pages (<Seo />) and by vite.config.ts, which writes a pre-rendered
 * HTML file per route at build time. Crawlers and link previews that don't run JavaScript
 * (WhatsApp, Facebook, most AI crawlers) therefore still get the right title, description,
 * structured data and core text. Keep this module free of browser APIs and import.meta.env.
 */
import { BRAND, GENERAL_FAQS, PHILOSOPHY, PROOF_POINTS } from './brand'
import { CATEGORIES } from './categories'
import { CENTRES } from './centres'
import { DOCTORS } from './doctors'
import { TREATMENTS, categoryPath, centrePath, doctorPath, treatmentPath, treatmentsBySlugs, treatmentsInCategory } from './index'
import type { Category, Centre, Doctor, Faq, Treatment } from './types'

type Json = Record<string, unknown>

export interface PageMeta {
  path: string
  title: string
  description: string
  image: string
  noindex?: boolean
  graph: Json[]
  /** Text for the pre-rendered HTML (no-JS crawlers). */
  h1: string
  intro: string
  sections: { heading: string; items: string[] }[]
  links: { href: string; label: string }[]
}

const SHARE_IMAGE = '/images/rua/og/rua-share.jpg'
const WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const clean = (site: string) => site.replace(/\/$/, '')
const abs = (site: string, path: string) => `${clean(site)}${path}`
const orgId = (site: string) => `${clean(site)}/#organization`
const siteId = (site: string) => `${clean(site)}/#website`
const clinicId = (site: string, slug: string) => `${clean(site)}/centers/${slug}#clinic`
const physicianId = (site: string, slug: string) => `${clean(site)}/doctors/${slug}#physician`

// --- schema.org nodes ---------------------------------------------------------------------

function websiteNode(site: string): Json {
  return { '@type': 'WebSite', '@id': siteId(site), url: abs(site, '/'), name: BRAND.name, inLanguage: 'en-IN', publisher: { '@id': orgId(site) } }
}

function organizationNode(site: string): Json {
  return {
    '@type': 'MedicalOrganization',
    '@id': orgId(site),
    name: BRAND.name,
    alternateName: 'RUA',
    url: abs(site, '/'),
    logo: abs(site, '/images/rua/brand/rua-logo-cocoa.png'),
    image: abs(site, SHARE_IMAGE),
    description: BRAND.description,
    slogan: BRAND.tagline,
    medicalSpecialty: 'Dermatology',
    telephone: `+${BRAND.whatsapp}`,
    sameAs: BRAND.social.map((s) => s.url),
    department: CENTRES.map((c) => ({ '@id': clinicId(site, c.slug) })),
    member: DOCTORS.map((d) => ({ '@id': physicianId(site, d.slug) })),
  }
}

function clinicNode(site: string, c: Centre): Json {
  return {
    '@type': 'MedicalClinic',
    '@id': clinicId(site, c.slug),
    name: `${BRAND.name} – ${c.area}`,
    url: abs(site, centrePath(c.slug)),
    image: abs(site, SHARE_IMAGE),
    telephone: c.phone,
    medicalSpecialty: 'Dermatology',
    address: {
      '@type': 'PostalAddress',
      streetAddress: c.street,
      addressLocality: 'Bengaluru',
      addressRegion: 'Karnataka',
      postalCode: c.postalCode,
      addressCountry: 'IN',
    },
    ...(c.geo ? { geo: { '@type': 'GeoCoordinates', latitude: c.geo.lat, longitude: c.geo.lng } } : {}),
    hasMap: c.mapsUrl,
    openingHoursSpecification: [
      { '@type': 'OpeningHoursSpecification', dayOfWeek: WEEK, opens: BRAND.hours.open, closes: BRAND.hours.close },
    ],
    isAcceptingNewPatients: true,
    parentOrganization: { '@id': orgId(site) },
  }
}

function physicianNode(site: string, d: Doctor): Json {
  return {
    '@type': 'Physician',
    '@id': physicianId(site, d.slug),
    name: d.name,
    url: abs(site, doctorPath(d.slug)),
    image: abs(site, d.photo),
    description: `${d.role}. ${d.qualifications}; ${d.fellowship}. ${d.bio.join(' ')}`,
    medicalSpecialty: 'Dermatology',
    knowsAbout: d.focus,
    hasCredential: [
      { '@type': 'EducationalOccupationalCredential', credentialCategory: 'degree', name: 'MBBS' },
      { '@type': 'EducationalOccupationalCredential', credentialCategory: 'degree', name: 'MD (Dermatology, Venereology & Leprosy)' },
      { '@type': 'EducationalOccupationalCredential', credentialCategory: 'certificate', name: d.fellowship },
    ],
    location: CENTRES.map((c) => ({ '@id': clinicId(site, c.slug) })),
    parentOrganization: { '@id': orgId(site) },
  }
}

function faqNode(faqs: Faq[]): Json {
  return {
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  }
}

function breadcrumbNode(site: string, crumbs: { name: string; path: string }[]): Json {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: abs(site, c.path) })),
  }
}

function webPage(site: string, path: string, title: string, description: string, type = 'WebPage', extra: Json = {}): Json {
  return {
    '@type': type,
    '@id': `${abs(site, path)}#webpage`,
    url: abs(site, path),
    name: title,
    description,
    inLanguage: 'en-IN',
    isPartOf: { '@id': siteId(site) },
    publisher: { '@id': orgId(site) },
    ...extra,
  }
}

const SERVICES = { name: 'Services', path: '/services' }
const DOCTORS_CRUMB = { name: 'Doctors', path: '/doctors' }
const CENTRES_CRUMB = { name: 'Centres', path: '/centers' }

// --- page metadata ----------------------------------------------------------------------------

export function homeMeta(site: string): PageMeta {
  const title = 'RUA Skin & Hair Center – Dermatologists in Bangalore'
  const description =
    'Doctor-led skin, hair and laser care from 3 MD dermatologists in Indiranagar and Ramamurthy Nagar, Bengaluru. Open 7 days, 10am–8pm. Book a consultation.'
  return {
    path: '/',
    title,
    description,
    image: SHARE_IMAGE,
    graph: [
      websiteNode(site),
      organizationNode(site),
      ...CENTRES.map((c) => clinicNode(site, c)),
      ...DOCTORS.map((d) => physicianNode(site, d)),
      webPage(site, '/', title, description, 'WebPage', { about: { '@id': orgId(site) } }),
    ],
    h1: 'Doctor-led skin & hair care in Bangalore',
    intro: BRAND.promise,
    sections: [
      { heading: 'Why RUA', items: PROOF_POINTS.map((p) => `${p.value} ${p.label} — ${p.detail}`) },
      { heading: 'Our services', items: CATEGORIES.map((c) => `${c.name}: ${c.tagline}`) },
      { heading: 'Our dermatologists', items: DOCTORS.map((d) => `${d.name}, ${d.qualifications} — ${d.role}; ${d.fellowship}`) },
      { heading: 'Our centres', items: CENTRES.map((c) => `${c.name}: ${c.addressLines.join(', ')} · ${c.phoneDisplay}`) },
    ],
    links: [
      ...CATEGORIES.map((c) => ({ href: categoryPath(c.slug), label: c.name })),
      ...DOCTORS.map((d) => ({ href: doctorPath(d.slug), label: d.name })),
      ...CENTRES.map((c) => ({ href: centrePath(c.slug), label: c.name })),
      { href: '/book-appointment', label: 'Book an appointment' },
    ],
  }
}

export function servicesMeta(site: string): PageMeta {
  const title = 'Skin, Hair & Laser Treatments in Bangalore | RUA'
  const description =
    'Medical dermatology, dermatosurgery, cosmetic dermatology, lasers, hair treatments and hair transplants at RUA Skin & Hair Center’s two Bengaluru centres.'
  return {
    path: '/services',
    title,
    description,
    image: SHARE_IMAGE,
    graph: [
      websiteNode(site),
      organizationNode(site),
      webPage(site, '/services', title, description, 'CollectionPage'),
      breadcrumbNode(site, [SERVICES]),
      faqNode(GENERAL_FAQS),
    ],
    h1: 'Skin, Hair & Laser Treatments in Bangalore',
    intro: 'Explore a wide range of advanced skin, hair, and aesthetic treatments tailored to your needs.',
    sections: CATEGORIES.map((c) => ({ heading: c.name, items: c.items.map((i) => i.name) })),
    links: [...CATEGORIES.map((c) => ({ href: categoryPath(c.slug), label: c.name })), ...TREATMENTS.map((t) => ({ href: treatmentPath(t), label: t.name }))],
  }
}

export function categoryMeta(site: string, c: Category): PageMeta {
  const path = categoryPath(c.slug)
  const treatments = treatmentsInCategory(c.slug)
  return {
    path,
    title: c.seo.title,
    description: c.seo.description,
    image: c.image,
    graph: [
      webPage(site, path, c.seo.title, c.seo.description, 'MedicalWebPage', {
        audience: 'https://schema.org/Patient',
        specialty: 'https://schema.org/Dermatologic',
      }),
      breadcrumbNode(site, [SERVICES, { name: c.name, path }]),
      faqNode(c.faqs),
    ],
    h1: c.seo.h1,
    intro: `${c.tagline} ${c.intro}`,
    sections: [
      { heading: `${c.name} at RUA`, items: c.items.map((i) => i.name) },
      { heading: 'Frequently asked questions', items: c.faqs.map((f) => `${f.q} ${f.a}`) },
    ],
    links: treatments.map((t) => ({ href: treatmentPath(t), label: t.name })),
  }
}

export function treatmentMeta(site: string, t: Treatment): PageMeta {
  const path = treatmentPath(t)
  const category = CATEGORIES.find((c) => c.slug === t.category)!
  return {
    path,
    title: t.seo.title,
    description: t.seo.description,
    image: t.image ?? SHARE_IMAGE,
    graph: [
      webPage(site, path, t.seo.title, t.seo.description, 'MedicalWebPage', {
        audience: 'https://schema.org/Patient',
        specialty: 'https://schema.org/Dermatologic',
        about: {
          '@type': t.procedureType ?? 'MedicalProcedure',
          name: t.name,
          description: t.summary,
          howPerformed: t.steps.map((s) => `${s.title}: ${s.text}`).join(' '),
        },
        author: t.doctors.map((d) => ({ '@id': physicianId(site, d) })),
      }),
      breadcrumbNode(site, [SERVICES, { name: category.name, path: categoryPath(category.slug) }, { name: t.name, path }]),
      faqNode(t.faqs),
    ],
    h1: t.h1,
    intro: t.summary,
    sections: [
      { heading: 'Key facts', items: t.facts.map((f) => `${f.label}: ${f.value}`) },
      { heading: t.whoForTitle ?? 'Who it is for', items: t.whoFor },
      { heading: t.stepsTitle ?? 'How it works at RUA', items: t.steps.map((s) => `${s.title} — ${s.text}`) },
      { heading: 'Results & recovery', items: [t.results] },
      { heading: 'Cost', items: [t.cost] },
      { heading: 'Frequently asked questions', items: t.faqs.map((f) => `${f.q} ${f.a}`) },
    ],
    links: [
      { href: categoryPath(category.slug), label: category.name },
      ...treatmentsBySlugs(t.related).map((r) => ({ href: treatmentPath(r), label: r.name })),
      ...t.doctors.map((d) => ({ href: doctorPath(d), label: DOCTORS.find((x) => x.slug === d)?.name ?? d })),
      { href: `/book-appointment?treatment=${t.slug}`, label: `Book a ${t.name} consultation` },
    ],
  }
}

export function doctorsMeta(site: string): PageMeta {
  const title = 'Our Dermatologists in Bangalore | RUA Skin & Hair Center'
  const description =
    'Meet RUA’s founders: Dr. Jatin K Reddy, Dr. Eshritha C and Dr. Jeevith C Reddy — MBBS, MD (DVL) dermatologists with fellowship training, in Bengaluru.'
  return {
    path: '/doctors',
    title,
    description,
    image: '/images/rua/team/rua-founders-team.webp',
    graph: [
      webPage(site, '/doctors', title, description, 'CollectionPage'),
      breadcrumbNode(site, [DOCTORS_CRUMB]),
      ...DOCTORS.map((d) => physicianNode(site, d)),
    ],
    h1: 'Meet RUA’s dermatologists',
    intro: 'Three colleagues, three paths in dermatology — one circle of care.',
    sections: DOCTORS.map((d) => ({ heading: d.name, items: [d.role, d.qualifications, d.fellowship, ...d.bio] })),
    links: DOCTORS.map((d) => ({ href: doctorPath(d.slug), label: d.name })),
  }
}

export function doctorMeta(site: string, d: Doctor): PageMeta {
  const path = doctorPath(d.slug)
  return {
    path,
    title: d.seo.title,
    description: d.seo.description,
    image: d.photo,
    graph: [
      webPage(site, path, d.seo.title, d.seo.description, 'ProfilePage', { mainEntity: { '@id': physicianId(site, d.slug) } }),
      physicianNode(site, d),
      breadcrumbNode(site, [DOCTORS_CRUMB, { name: d.name, path }]),
    ],
    h1: d.name,
    intro: `${d.role} · ${d.qualifications} · ${d.fellowship}. ${d.bio.join(' ')}`,
    sections: [{ heading: 'Areas of focus', items: d.focus }],
    links: treatmentsBySlugs(d.treatments).map((t) => ({ href: treatmentPath(t), label: t.name })),
  }
}

export function centresMeta(site: string): PageMeta {
  const title = 'Skin & Hair Clinics in Indiranagar & Ramamurthy Nagar | RUA'
  const description =
    'Addresses, timings, directions and doctors at RUA Skin & Hair Center in Ramamurthy Nagar and Indiranagar, Bengaluru. Open 7 days, 10am–8pm.'
  return {
    path: '/centers',
    title,
    description,
    image: SHARE_IMAGE,
    graph: [webPage(site, '/centers', title, description, 'CollectionPage'), breadcrumbNode(site, [CENTRES_CRUMB]), ...CENTRES.map((c) => clinicNode(site, c))],
    h1: 'Skin & hair clinics in Bangalore',
    intro: 'Your neighbourhood, your RUA. Two centres in Bengaluru, open every day from 10am to 8pm.',
    sections: CENTRES.map((c) => ({ heading: c.name, items: [...c.addressLines, `Phone: ${c.phoneDisplay}`, `Open ${BRAND.hours.days}, ${BRAND.hours.label}`] })),
    links: CENTRES.map((c) => ({ href: centrePath(c.slug), label: c.name })),
  }
}

export function centreMeta(site: string, c: Centre): PageMeta {
  const path = centrePath(c.slug)
  return {
    path,
    title: c.seo.title,
    description: c.seo.description,
    image: SHARE_IMAGE,
    graph: [
      webPage(site, path, c.seo.title, c.seo.description, 'WebPage', { about: { '@id': clinicId(site, c.slug) } }),
      clinicNode(site, c),
      breadcrumbNode(site, [CENTRES_CRUMB, { name: c.area, path }]),
    ],
    h1: c.seo.h1,
    intro: c.intro,
    sections: [
      { heading: 'Address', items: [...c.addressLines, `Landmark: ${c.landmark}`] },
      { heading: 'Timings', items: [`${BRAND.hours.days}: ${BRAND.hours.label}`] },
      { heading: 'Doctors', items: DOCTORS.map((d) => `${d.name} — ${d.role}`) },
    ],
    links: CATEGORIES.map((cat) => ({ href: categoryPath(cat.slug), label: cat.name })),
  }
}

export function aboutMeta(site: string): PageMeta {
  const title = 'About Us – Founded by Three Dermatologists | RUA'
  const description =
    'RUA Skin & Hair Center began as a conversation between three dermatologists. Our philosophy, our founders, the technology we use and our published research.'
  return {
    path: '/about-us',
    title,
    description,
    image: '/images/rua/team/rua-founders-team.webp',
    graph: [webPage(site, '/about-us', title, description, 'AboutPage', { about: { '@id': orgId(site) } }), breadcrumbNode(site, [{ name: 'About us', path: '/about-us' }])],
    h1: PHILOSOPHY.heading,
    intro: PHILOSOPHY.lead,
    sections: [{ heading: 'Our philosophy', items: PHILOSOPHY.paragraphs }],
    links: DOCTORS.map((d) => ({ href: doctorPath(d.slug), label: d.name })),
  }
}

export function contactMeta(site: string): PageMeta {
  const title = 'Contact RUA Skin & Hair Center – Bengaluru'
  const description =
    'Call, WhatsApp or visit RUA Skin & Hair Center in Ramamurthy Nagar or Indiranagar, Bengaluru. Open Sunday to Saturday, 10am–8pm.'
  return {
    path: '/contact',
    title,
    description,
    image: SHARE_IMAGE,
    graph: [webPage(site, '/contact', title, description, 'ContactPage'), breadcrumbNode(site, [{ name: 'Contact', path: '/contact' }])],
    h1: 'Get in touch with us',
    intro: 'Call, WhatsApp or visit either RUA centre — we are open every day from 10am to 8pm.',
    sections: CENTRES.map((c) => ({ heading: c.name, items: [...c.addressLines, `Phone: ${c.phoneDisplay}`] })),
    links: CENTRES.map((c) => ({ href: centrePath(c.slug), label: c.name })),
  }
}

export function bookMeta(site: string): PageMeta {
  const title = 'Book a Dermatologist Appointment in Bangalore | RUA'
  const description =
    'Book a consultation with RUA’s dermatologists in Ramamurthy Nagar or Indiranagar, Bengaluru — choose your centre, concern, doctor and time in under a minute.'
  return {
    path: '/book-appointment',
    title,
    description,
    image: SHARE_IMAGE,
    graph: [webPage(site, '/book-appointment', title, description), breadcrumbNode(site, [{ name: 'Book an appointment', path: '/book-appointment' }])],
    h1: 'Book a consultation',
    intro: 'Choose your centre, what you need help with, your doctor and a preferred time. Our team confirms your appointment on WhatsApp.',
    sections: [],
    links: CENTRES.map((c) => ({ href: centrePath(c.slug), label: c.name })),
  }
}

/** Every indexable public page — drives the sitemap and build-time pre-rendering. The home page is
 *  hidden (`/` redirects to `/services`), so it is not listed and `/` serves the Services snapshot. */
export function allPageMetas(site: string): PageMeta[] {
  return [
    servicesMeta(site),
    ...CATEGORIES.map((c) => categoryMeta(site, c)),
    ...TREATMENTS.map((t) => treatmentMeta(site, t)),
    doctorsMeta(site),
    ...DOCTORS.map((d) => doctorMeta(site, d)),
    centresMeta(site),
    ...CENTRES.map((c) => centreMeta(site, c)),
    aboutMeta(site),
    contactMeta(site),
    bookMeta(site),
  ]
}

export function jsonLdDocument(graph: Json[]): Json {
  return { '@context': 'https://schema.org', '@graph': graph }
}
