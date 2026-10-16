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
}

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
  role: 'admin' | 'staff'
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

export interface ChatResponse {
  answer: string
  status: ChatStatus
  sources: { document_id: number; title: string; similarity: number }[]
  actions: { label: string; href: string }[]
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
