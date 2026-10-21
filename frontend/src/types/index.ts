export type Department = 'general' | 'dental' | 'skin' | 'hair' | 'pediatrics'
export interface OpeningHour {
  day: string
  open: string | null
  close: string | null
  closed: boolean
}

export interface ClinicInfo {
  name: string
  tagline: string
  about: string
  phone: string
  whatsapp: string | null
  email: string
  address_line: string
  city: string
  state: string
  postal_code: string
  country: string
  map_embed_url: string | null
  opening_hours: OpeningHour[]
  emergency_note: string
  theme: Theme
}

export type Theme = 'cedar' | 'emerald' | 'sapphire' | 'slate' | 'plum'

export interface Doctor {
  id: number
  slug: string
  full_name: string
  department: Department
  specialization: string
  qualifications: string
  experience_years: number
  bio: string
  languages: string[]
  photo_url: string | null
  consultation_days: number[]
  start_time: string
  end_time: string
  slot_minutes: number
  consultation_fee: string | null
  is_active: boolean
}

export interface Service {
  id: number
  slug: string
  name: string
  department: Department
  short_description: string
  description: string
  duration_minutes: number
  price_from: string | null
  icon: string
  is_active: boolean
}

export interface BlogAuthor {
  id: number
  slug: string
  full_name: string
  specialization: string
  photo_url: string | null
}

export interface BlogPostSummary {
  id: number
  slug: string
  title: string
  excerpt: string
  category: string
  cover_image: string | null
  reading_minutes: number
  published_at: string
  author: BlogAuthor | null
}

export interface BlogPost extends BlogPostSummary {
  content: string
}

export interface BlogPostAdmin extends BlogPost {
  is_published: boolean
  author_id: number | null
}

export interface Page<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  pages: number
}

export interface User {
  id: number
  email: string
  full_name: string
  role: 'admin' | 'staff' | 'doctor'
}

export interface TokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  user: User
}

export interface ContactMessage {
  id: number
  name: string
  email: string
  phone: string | null
  subject: string
  message: string
  is_read: boolean
  created_at: string
}

export interface KnowledgeDocument {
  id: number
  title: string
  source_type: 'upload' | 'seed' | 'system'
  filename: string | null
  content_type: string | null
  status: 'processing' | 'ready' | 'failed'
  error: string | null
  chunk_count: number
  created_at: string
  updated_at: string
}

export interface ChatTurn {
  role: 'user' | 'assistant'
  content: string
}

export type ChatStatus = 'answered' | 'no_context' | 'safety_redirect' | 'emergency' | 'fallback'

/** Doctor card attached to an answer, built from the live doctors table. */
export interface ChatDoctor {
  slug: string
  full_name: string
  specialization: string
  department: string
  qualifications: string
  experience_years: number
  languages: string[]
  photo_url: string | null
  consultation_fee: number | null
  schedule: string
  booking_href: string
}

export interface ChatSuggestion {
  label: string
  message: string
}

export interface ChatResponse {
  answer: string
  status: ChatStatus
  sources: { document_id: number; title: string; similarity: number }[]
  actions: { label: string; href: string }[]
  doctors: ChatDoctor[]
  suggestions: ChatSuggestion[]
  provider: string
}

export interface ChatHealth {
  status: 'ok' | 'degraded'
  embedding_provider: string
  embedding_model: string
  llm_provider: string
  llm_model: string | null
  indexed_chunks: number
  similarity_threshold: number
}

export interface Overview {
  chat: {
    today: number
    total: number
    window_days: number
    by_status: Record<ChatStatus, number>
    answered_rate: number | null
    avg_latency_ms: number | null
    per_day: { date: string; count: number }[]
  }
  knowledge: { documents: number; ready: number; failed: number; chunks: number; embedding_model: string }
  unread_messages: number
  active_doctors: number
  active_services: number
}

export interface Testimonial {
  id: number
  quote: string
  name: string
  detail: string
}

export interface HighlightItem {
  icon: string
  title: string
  text: string
}

export interface ClinicHighlights {
  values: HighlightItem[]
  facilities: string[]
  why_choose: HighlightItem[]
}


/* ---------- Online booking ---------- */

export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled'
export type AppointmentSource = 'website' | 'chatbot' | 'admin'

export interface Slot {
  start_time: string
  end_time: string
  available: boolean
}

export interface DoctorAvailability {
  doctor_id: number
  slug: string
  full_name: string
  specialization: string
  photo_url: string | null
  consultation_fee: string | null
  slots: Slot[]
}

export interface Availability {
  date: string
  clinic_open: boolean
  doctors: DoctorAvailability[]
}

export interface BookingInput {
  department: Department
  doctor_slug: string | null
  appointment_date: string
  start_time: string
  patient_name: string
  patient_email: string
  patient_phone: string
  reason: string
  source?: 'website' | 'chatbot'
}

export interface AppointmentDoctor {
  id: number
  slug: string
  full_name: string
  specialization: string
  department: Department
  photo_url: string | null
}

export interface BookingConfirmation {
  reference: string
  status: AppointmentStatus
  department: Department
  appointment_date: string
  start_time: string
  end_time: string
  consultation_fee: string | null
  patient_name: string
  patient_email: string
  doctor: AppointmentDoctor
}

export interface AppointmentEmail {
  id: number
  kind: 'received' | 'confirmation' | 'cancellation'
  status: 'sent' | 'failed' | 'skipped'
  recipient: string
  subject: string
  message_id: string | null
  error: string | null
  created_at: string
}

export interface Appointment extends BookingConfirmation {
  id: number
  source: AppointmentSource
  patient_phone: string
  reason: string
  cancellation_reason: string | null
  admin_notes: string | null
  confirmed_at: string | null
  completed_at: string | null
  cancelled_at: string | null
  created_at: string
  updated_at: string
  last_email: AppointmentEmail | null
}

export interface AppointmentDetail extends Appointment {
  emails: AppointmentEmail[]
}

export interface AppointmentList extends Page<Appointment> {
  counts: Record<AppointmentStatus, number>
}

export interface AppointmentAnalytics {
  total: number
  this_month: number
  pending: number
  today: number
  upcoming_7_days: number
  conversion_rate: number | null
  cancellation_rate: number | null
  revenue_this_month: string
  revenue_total: string
  by_month: { month: string; total: number; pending: number; confirmed: number; completed: number; cancelled: number }[]
  by_department: { department: Department; total: number; revenue: string }[]
  by_source: Partial<Record<AppointmentSource, number>>
}

/* ---------- Before / after gallery ---------- */

export interface Transformation {
  id: number
  department: Department
  title: string
  description: string
  before_image: string
  after_image: string
}

export interface TransformationAdmin extends Transformation {
  patient_consent: boolean
  is_published: boolean
  sort_order: number
}
