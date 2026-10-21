import { api } from '@/services/api'
import type {
  AppointmentAnalytics,
  AppointmentDetail,
  AppointmentList,
  AppointmentStatus,
  Availability,
  BlogPost,
  BlogPostAdmin,
  BookingConfirmation,
  BookingInput,
  BlogPostSummary,
  ChatHealth,
  ChatResponse,
  ChatTurn,
  ClinicHighlights,
  ClinicInfo,
  ContactMessage,
  Department,
  Doctor,
  KnowledgeDocument,
  Overview,
  Page,
  Service,
  Testimonial,
  Theme,
  TokenResponse,
  Transformation,
  TransformationAdmin,
  User,
} from '@/types'

/* ---------- Public clinic content ---------- */
export const clinicApi = {
  info: () => api.get<ClinicInfo>('/clinic-info').then((r) => r.data),
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
export const authApi = {
  login: (email: string, password: string) =>
    api.post<TokenResponse>('/auth/login', { email, password }).then((r) => r.data),
  me: () => api.get<User>('/auth/me').then((r) => r.data),
}

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

export const adminApi = {
  overview: () => api.get<Overview>('/admin/overview').then((r) => r.data),

  doctors: () => api.get<Doctor[]>('/admin/doctors').then((r) => r.data),
  createDoctor: (data: DoctorInput) => api.post<Doctor>('/admin/doctors', data).then((r) => r.data),
  updateDoctor: (id: number, data: DoctorInput) => api.put<Doctor>(`/admin/doctors/${id}`, data).then((r) => r.data),
  deleteDoctor: (id: number) => api.delete<void>(`/admin/doctors/${id}`).then((r) => r.data),

  services: () => api.get<Service[]>('/admin/services').then((r) => r.data),
  createService: (data: ServiceInput) => api.post<Service>('/admin/services', data).then((r) => r.data),
  updateService: (id: number, data: ServiceInput) =>
    api.put<Service>(`/admin/services/${id}`, data).then((r) => r.data),
  deleteService: (id: number) => api.delete<void>(`/admin/services/${id}`).then((r) => r.data),

  appointments: (params: AppointmentQuery) =>
    api.get<AppointmentList>('/admin/appointments', { params }).then((r) => r.data),
  appointment: (id: number) => api.get<AppointmentDetail>(`/admin/appointments/${id}`).then((r) => r.data),
  appointmentAnalytics: () => api.get<AppointmentAnalytics>('/admin/appointments/analytics').then((r) => r.data),
  setAppointmentStatus: (
    id: number,
    data: { status: 'confirmed' | 'completed' | 'cancelled'; reason?: string; notify?: boolean },
  ) => api.patch<AppointmentDetail>(`/admin/appointments/${id}/status`, data).then((r) => r.data),
  updateAppointment: (
    id: number,
    data: { admin_notes?: string | null; appointment_date?: string; start_time?: string; doctor_id?: number; notify?: boolean },
  ) => api.put<AppointmentDetail>(`/admin/appointments/${id}`, data).then((r) => r.data),
  resendAppointmentEmail: (id: number, kind: 'confirmation' | 'cancellation') =>
    api.post<AppointmentDetail>(`/admin/appointments/${id}/emails`, { kind }).then((r) => r.data),
  deleteAppointment: (id: number) => api.delete<void>(`/admin/appointments/${id}`).then((r) => r.data),

  uploadImage: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post<{ url: string }>('/admin/media', form, { timeout: 60_000 }).then((r) => r.data.url)
  },

  posts: () => api.get<BlogPostAdmin[]>('/admin/blog').then((r) => r.data),
  createPost: (data: BlogPostInput) => api.post<BlogPostAdmin>('/admin/blog', data).then((r) => r.data),
  updatePost: (id: number, data: BlogPostInput) => api.put<BlogPostAdmin>(`/admin/blog/${id}`, data).then((r) => r.data),
  deletePost: (id: number) => api.delete<void>(`/admin/blog/${id}`).then((r) => r.data),

  transformations: () => api.get<TransformationAdmin[]>('/admin/transformations').then((r) => r.data),
  createTransformation: (data: TransformationInput) =>
    api.post<TransformationAdmin>('/admin/transformations', data).then((r) => r.data),
  updateTransformation: (id: number, data: TransformationInput) =>
    api.put<TransformationAdmin>(`/admin/transformations/${id}`, data).then((r) => r.data),
  deleteTransformation: (id: number) => api.delete<void>(`/admin/transformations/${id}`).then((r) => r.data),

  setTheme: (theme: Theme) => api.put<ClinicInfo>('/admin/theme', { theme }).then((r) => r.data),

  messages: () => api.get<ContactMessage[]>('/admin/messages').then((r) => r.data),
  markMessageRead: (id: number) => api.patch<ContactMessage>(`/admin/messages/${id}/read`).then((r) => r.data),

  documents: () => api.get<KnowledgeDocument[]>('/admin/knowledge/documents').then((r) => r.data),
  uploadDocument: (file: File, title?: string) => {
    const form = new FormData()
    form.append('file', file)
    if (title) form.append('title', title)
    return api.post<KnowledgeDocument>('/admin/knowledge/documents', form, { timeout: 120_000 }).then((r) => r.data)
  },
  deleteDocument: (id: number) => api.delete<{ message: string }>(`/admin/knowledge/documents/${id}`).then((r) => r.data),
  reindex: () =>
    api
      .post<{ documents: number; chunks: number; embedding_model: string }>('/admin/knowledge/reindex', null, {
        timeout: 180_000,
      })
      .then((r) => r.data),
}
