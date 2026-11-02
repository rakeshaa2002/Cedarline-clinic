/**
 * Shapes for RUA's website content. Content files use relative imports only, because
 * vite.config.ts also imports them (to build the sitemap and pre-rendered SEO pages).
 */

export type CategorySlug =
  | 'medical-dermatology'
  | 'dermatosurgery'
  | 'aesthetic-dermatology'
  | 'laser-treatments'
  | 'hair-treatments'
  | 'hair-transplant'
  | 'premium-packages'

export type DoctorSlug = 'dr-jatin-k-reddy' | 'dr-eshritha-c' | 'dr-jeevith-c-reddy'
export type CentreSlug = 'ramamurthy-nagar' | 'indiranagar'
export type EquipmentId =
  | 'q-switched-diode'
  | 'hydrafacial'
  | 'rf-plasma-pen'
  | 'cryo'
  | 'co2-laser'
  | 'mnrf'
  | 'derma-pen'
  | 'lllt'

export interface Faq {
  q: string
  a: string
}

export interface Fact {
  label: string
  value: string
}

export interface Step {
  title: string
  text: string
}

export interface ServiceItem {
  /** Exactly as RUA lists the service. */
  name: string
  /** Set when the service has its own treatment page. */
  treatment?: string
}

export interface Category {
  slug: CategorySlug
  name: string
  /** Short label for menus. */
  navName: string
  icon: 'stethoscope' | 'scissors' | 'sparkles' | 'zap' | 'sprout' | 'crown' | 'gem'
  /** RUA's own one-line description of the category. */
  tagline: string
  intro: string
  image: string
  imageAlt: string
  items: ServiceItem[]
  doctors: DoctorSlug[]
  equipment: EquipmentId[]
  faqs: Faq[]
  seo: { title: string; description: string; h1: string }
}

export interface Treatment {
  slug: string
  category: CategorySlug
  name: string
  h1: string
  seo: { title: string; description: string }
  /** Answer-first summary: what it is, who it suits, who does it at RUA. */
  summary: string
  facts: Fact[]
  whoForTitle?: string
  whoFor: string[]
  stepsTitle?: string
  steps: Step[]
  results: string
  cost: string
  faqs: Faq[]
  doctors: DoctorSlug[]
  equipment?: EquipmentId[]
  related: string[]
  image?: string
  procedureType?: 'SurgicalProcedure' | 'NoninvasiveProcedure' | 'PercutaneousProcedure' | 'TherapeuticProcedure'
}

export interface Doctor {
  slug: DoctorSlug
  name: string
  shortName: string
  role: string
  qualifications: string
  fellowship: string
  persona: string
  personaLine: string
  bio: string[]
  focus: string[]
  categories: CategorySlug[]
  treatments: string[]
  photo: string
  seo: { title: string; description: string }
}

export interface Centre {
  slug: CentreSlug
  name: string
  area: string
  isNew?: boolean
  addressLines: string[]
  street: string
  locality: string
  postalCode: string
  landmark: string
  phone: string
  phoneDisplay: string
  mapsUrl: string
  mapEmbedUrl: string
  geo?: { lat: number; lng: number }
  intro: string
  directions: string[]
  seo: { title: string; description: string; h1: string }
}
