import { api } from '@/services/api'
import { mockAdminApi, mockAuthApi, mockClinicInfo } from '@/services/mockAdmin'
import type {
  AppointmentStatus,
  Availability,
  BlogPost,
  BookingConfirmation,
  BookingInput,
  BlogPostSummary,
  ChatHealth,
  ChatResponse,
  ChatTurn,
  ClinicHighlights,
  ClinicInfo,
  Department,
  Doctor,
  Page,
  Service,
  Testimonial,
  Transformation,
  TransformationAdmin,
} from '@/types'

/* ---------- Public clinic content ---------- */
export const clinicApi = {
  // Frontend-only: clinic details come from the RUA content; the theme is the one chosen in the demo admin.
  info: (): Promise<ClinicInfo> => mockClinicInfo(),
  services: (department?: Department) =>
    api.get<Service[]>('/services', { params: { department } }).then((r) => r.data),
  doctors: (params?: { department?: Department; service_id?: number }) =>
    api.get<Doctor[]>('/doctors', { params }).then((r) => r.data),
  blog: (params: { page?: number; page_size?: number; category?: string }) =>
    api.get<Page<BlogPostSummary>>('/blog', { params }).then((r) => r.data),
  blogCategories: () => api.get<string[]>('/blog/categories').then((r) => r.data),
  blogPost: (slug: string) => api.get<BlogPost>(`/blog/${encodeURIComponent(slug)}`).then((r) => r.data),
  contact: (data: { name: string; email: string; phone?: string; subject: string; message: string }) =>
    api.post<{ message: string }>('/contact', data).then((r) => r.data),
  testimonials: () => api.get<Testimonial[]>('/testimonials').then((r) => r.data),
  transformations: (department?: Department) =>
    api.get<Transformation[]>('/transformations', { params: { department } }).then((r) => r.data),
  highlights: () => api.get<ClinicHighlights>('/clinic-highlights').then((r) => r.data),
}

/* ---------- Online booking ---------- */
export const bookingApi = {
  availability: (params: { date: string; department?: Department; doctor?: string }) =>
    api.get<Availability>('/appointments/availability', { params }).then((r) => r.data),
  book: (data: BookingInput) => api.post<BookingConfirmation>('/appointments', data).then((r) => r.data),
}

/* ---------- Chat ---------- */
export const chatApi = {
  ask: (message: string, history: ChatTurn[]) =>
    api.post<ChatResponse>('/chat', { message, history }, { timeout: 45_000 }).then((r) => r.data),
  health: () => api.get<ChatHealth>('/chat/health').then((r) => r.data),
}

/* ---------- Auth ---------- */
// The admin and doctor portals are frontend-only (demo mode): see services/mockAdmin.ts.
export const authApi = mockAuthApi

/* ---------- Admin ---------- */
export type DoctorInput = Omit<Doctor, 'id' | 'slug'> & { slug?: string }
export type ServiceInput = Omit<Service, 'id' | 'slug'> & { slug?: string; sort_order?: number }
export type BlogPostInput = {
  slug?: string
  title: string
  excerpt: string
  content: string
  category: string
  cover_image: string | null
  reading_minutes: number | null
  author_id: number | null
  is_published: boolean
  published_at: string | null
}
export type TransformationInput = Omit<TransformationAdmin, 'id'>
export type AppointmentQuery = {
  status?: AppointmentStatus
  department?: Department
  q?: string
  date_from?: string
  date_to?: string
  page?: number
  page_size?: number
}

/** Admin portal calls, served from the in-browser demo database (services/mockAdmin.ts). */
export const adminApi = mockAdminApi
