import { api } from '@/services/api'
import type {
  BlogPost,
  BlogPostSummary,
  ChatHealth,
  ChatResponse,
  ChatTurn,
  ClinicInfo,
  ContactMessage,
  Department,
  Doctor,
  KnowledgeDocument,
  Overview,
  Page,
  Service,
  TokenResponse,
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

export const adminApi = {
  overview: () => api.get<Overview>('/admin/overview').then((r) => r.data),

  doctors: () => api.get<Doctor[]>('/admin/doctors').then((r) => r.data),
  createDoctor: (data: DoctorInput) => api.post<Doctor>('/admin/doctors', data).then((r) => r.data),
  updateDoctor: (id: number, data: DoctorInput) => api.put<Doctor>(`/admin/doctors/${id}`, data).then((r) => r.data),

  services: () => api.get<Service[]>('/admin/services').then((r) => r.data),
  createService: (data: ServiceInput) => api.post<Service>('/admin/services', data).then((r) => r.data),
  updateService: (id: number, data: ServiceInput) =>
    api.put<Service>(`/admin/services/${id}`, data).then((r) => r.data),

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
