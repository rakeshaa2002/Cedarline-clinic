/**
 * Frontend-only admin portal (demo mode).
 *
 * The admin and doctor portals run entirely in the browser: sign-in checks the mock credentials
 * below, and every admin call reads and writes a small database kept in localStorage, seeded from
 * the RUA website content (doctors, centres, treatments). Nothing here talks to the backend, so the
 * portal works on a static host. The public chatbot and online booking still use the API.
 *
 * Data is per browser: another device or a cleared browser starts again from the seed.
 */
import { ApiError, tokenStore } from '@/services/api'
import type { AppointmentQuery, BlogPostInput, DoctorInput, ServiceInput, TransformationInput } from '@/services/endpoints'
import { BRAND, CATEGORIES, CENTRES, DOCTORS as RUA_DOCTORS, TREATMENTS } from '@/content/rua'
import type {
  Appointment,
  AppointmentAnalytics,
  AppointmentBranch,
  AppointmentDetail,
  AppointmentList,
  AppointmentSource,
  AppointmentStatus,
  BlogPostAdmin,
  ChatStatus,
  ClinicInfo,
  ContactMessage,
  Department,
  Doctor,
  KnowledgeDocument,
  Overview,
  Service,
  Theme,
  TokenResponse,
  TransformationAdmin,
  User,
  WhatsAppMessage,
} from '@/types'

// --- Mock credentials (shown on the login page's quick-fill buttons) ------------------------------

interface MockAccount extends User {
  password: string
  doctorSlug?: string
}

export const MOCK_ACCOUNTS: MockAccount[] = [
  { id: 1, email: 'admin@ruaskinandhair.example', password: 'RUA-Admin-2026', full_name: 'Clinic Administrator', role: 'admin' },
  { id: 2, email: 'staff@ruaskinandhair.example', password: 'RUA-Staff-2026', full_name: 'Front Desk', role: 'staff' },
  {
    id: 3,
    email: 'doctor@ruaskinandhair.example',
    password: 'RUA-Doctor-2026',
    full_name: 'Dr. Jatin K Reddy',
    role: 'doctor',
    doctorSlug: 'dr-jatin-k-reddy',
  },
]

const TOKEN_PREFIX = 'rua-demo-session:'
const STORAGE_KEY = 'rua.admin.demo.v1'
const TZ = 'Asia/Kolkata'
const DEMO_NOTE = 'Demo mode: WhatsApp and email are not connected, so nothing was sent.'

// --- Helpers ----------------------------------------------------------------------------------------

const wait = <T>(value: T, ms = 120): Promise<T> => new Promise((resolve) => setTimeout(() => resolve(value), ms))
const clone = <T>(value: T): T => (value === undefined ? value : (JSON.parse(JSON.stringify(value)) as T))
const nowIso = () => new Date().toISOString()
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date())
const addDays = (iso: string, days: number) => {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}
const weekday = (iso: string) => (new Date(`${iso}T00:00:00Z`).getUTCDay() + 6) % 7 // Monday = 0, like the API
const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 110)
const nextId = (rows: { id: number }[]) => rows.reduce((max, r) => Math.max(max, r.id), 0) + 1
const toMinutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))
const toTime = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}:00`
const normTime = (t: string) => (t.length === 5 ? `${t}:00` : t)

function notFound(what: string): never {
  throw new ApiError(`${what} not found.`, 404, 'not_found')
}
function invalid(fieldErrors: Record<string, string>): never {
  throw new ApiError('Please check the highlighted fields.', 422, 'validation_error', fieldErrors)
}

/** Small deterministic random generator so the seed looks the same on every device. */
function seededRandom(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// --- Seed data from the RUA website content ------------------------------------------------------

const SCHEDULES: Record<string, { primary: Department; days: number[]; start: string; end: string }> = {
  'dr-jatin-k-reddy': { primary: 'hair-transplant', days: [0, 1, 2, 3, 4, 5], start: '10:00:00', end: '19:00:00' },
  'dr-eshritha-c': { primary: 'aesthetic-dermatology', days: [0, 1, 2, 3, 4, 5], start: '11:00:00', end: '20:00:00' },
  'dr-jeevith-c-reddy': { primary: 'medical-dermatology', days: [1, 2, 3, 4, 5, 6], start: '10:00:00', end: '18:00:00' },
}

const DURATION: Record<Department, number> = {
  'medical-dermatology': 20,
  dermatosurgery: 30,
  'aesthetic-dermatology': 60,
  'laser-treatments': 45,
  'hair-treatments': 60,
  'hair-transplant': 360,
  'premium-packages': 60,
}

function seedDoctors(): Doctor[] {
  return RUA_DOCTORS.map((d, i) => {
    const s = SCHEDULES[d.slug]
    return {
      id: i + 1,
      slug: d.slug,
      full_name: d.name,
      department: s.primary,
      departments: [...new Set<Department>([s.primary, ...d.categories, 'medical-dermatology'])],
      specialization: d.role,
      qualifications: d.qualifications,
      fellowship: d.fellowship,
      experience_years: null,
      bio: [d.personaLine, ...d.bio].join(' '),
      languages: [],
      photo_url: d.photo,
      consultation_days: s.days,
      start_time: s.start,
      end_time: s.end,
      slot_minutes: 30,
      consultation_fee: null,
      is_active: true,
    }
  })
}

function seedServices(): Service[] {
  const services: Service[] = []
  const seen = new Set<string>()
  const icon = (dept: Department) => CATEGORIES.find((c) => c.slug === dept)?.icon ?? 'sparkles'
  for (const t of TREATMENTS) {
    seen.add(t.slug)
    services.push({
      id: services.length + 1,
      slug: t.slug,
      name: t.name,
      department: t.category,
      short_description: t.summary.length > 300 ? `${t.summary.slice(0, 297)}…` : t.summary,
      description: `${t.summary} ${t.results} ${t.cost}`,
      duration_minutes: DURATION[t.category],
      price_from: null,
      icon: icon(t.category),
      is_active: true,
    })
  }
  for (const c of CATEGORIES) {
    for (const item of c.items) {
      const slug = slugify(`${c.slug}-${item.name}`)
      if (item.treatment || seen.has(slug)) continue
      seen.add(slug)
      services.push({
        id: services.length + 1,
        slug,
        name: item.name,
        department: c.slug,
        short_description: `${item.name} — part of RUA's ${c.name}. ${c.tagline}`.slice(0, 300),
        description: `${item.name} is offered at RUA Skin & Hair Center as part of ${c.name}. ${c.intro}`,
        duration_minutes: DURATION[c.slug],
        price_from: null,
        icon: icon(c.slug),
        is_active: true,
      })
    }
  }
  return services
}

const BRANCHES: AppointmentBranch[] = CENTRES.map((c, i) => ({
  id: i + 1,
  slug: c.slug,
  name: c.name,
  area: c.area,
  address: c.addressLines.join(', '),
  phone: c.phoneDisplay,
  map_url: c.mapsUrl,
}))

const SAMPLE_PATIENTS: [string, string, Department, string][] = [
  ['Priya Sharma', '+91 90000 10001', 'medical-dermatology', 'Acne flare-up on cheeks for three weeks'],
  ['Rahul Varma', '+91 90000 10002', 'hair-transplant', 'Receding hairline — hair transplant consultation'],
  ['Sneha Kulkarni', '+91 90000 10003', 'aesthetic-dermatology', "HydraFacial before my sister's wedding"],
  ['Amit Patel', '+91 90000 10004', 'hair-treatments', 'Hair thinning at the crown, interested in PRP or GFC'],
  ['Divya Nambiar', '+91 90000 10005', 'laser-treatments', 'Laser hair reduction for upper lip and chin'],
  ['Karthik Iyer', '+91 90000 10006', 'dermatosurgery', 'Skin tags on the neck, want them removed'],
  ['Meghana Rao', '+91 90000 10007', 'medical-dermatology', 'Melasma on cheeks getting darker'],
  ['Farhan Sheikh', '+91 90000 10008', 'laser-treatments', 'Acne scars — asking about CO2 laser'],
  ['Lakshmi Menon', '+91 90000 10009', 'medical-dermatology', "Eczema on my son's arms"],
  ['Arjun Desai', '+91 90000 10010', 'hair-transplant', 'Beard transplant for patchy beard'],
  ['Ananya Gowda', '+91 90000 10011', 'aesthetic-dermatology', 'Skin boosters for dull skin'],
  ['Vikram Shetty', '+91 90000 10012', 'dermatosurgery', 'Wart on the sole of my foot'],
]
const CANCEL_REASONS = ['Doctor on emergency duty', 'Requested by patient', 'Slot overbooked']
const REF_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

function slotGrid(d: Doctor, day: string): string[] {
  if (!d.consultation_days.includes(weekday(day))) return []
  const out: string[] = []
  for (let m = toMinutes(d.start_time); m + d.slot_minutes <= toMinutes(d.end_time); m += d.slot_minutes) out.push(toTime(m))
  return out
}

function appointmentDoctor(d: Doctor) {
  return { id: d.id, slug: d.slug, full_name: d.full_name, specialization: d.specialization, department: d.department, photo_url: d.photo_url }
}

function seedAppointments(doctors: Doctor[]): MockDb['appointments'] {
  const rnd = seededRandom(42)
  const pick = <T>(list: T[]) => list[Math.floor(rnd() * list.length)]
  const reference = () => `RUA-${Array.from({ length: 6 }, () => pick([...REF_ALPHABET])).join('')}`
  const start = today()
  const used = new Set<string>()
  const rows: MockDb['appointments'] = []

  const add = (day: string, status: AppointmentStatus) => {
    const [name, phone, department, reason] = pick(SAMPLE_PATIENTS)
    const options = doctors.filter((d) => slotGrid(d, day).length && d.departments.includes(department))
    if (!options.length) return
    const doctor = pick(options)
    const startTime = pick(slotGrid(doctor, day))
    const key = `${doctor.id}|${day}|${startTime}`
    if (used.has(key)) return
    used.add(key)
    const stamp = `${addDays(day, -3)}T09:30:00.000Z`
    const decided = `${day}T${startTime.slice(0, 5)}:00.000Z`
    const id = rows.length + 1
    const whatsapp: WhatsAppMessage[] =
      status === 'confirmed' || status === 'completed'
        ? [{ id, appointment_id: id, to_phone: phone, kind: 'confirmation', body: `Your RUA appointment on ${day} is confirmed.`, status: 'sent', provider_message_id: null, error: null, created_at: stamp }]
        : []
    rows.push({
      id,
      reference: reference(),
      status,
      department,
      appointment_date: day,
      start_time: startTime,
      end_time: toTime(toMinutes(startTime) + doctor.slot_minutes),
      consultation_fee: null,
      patient_name: name,
      patient_email: null,
      patient_phone: phone,
      doctor: appointmentDoctor(doctor),
      branch: pick(BRANCHES),
      source: pick<AppointmentSource>(['website', 'website', 'chatbot']),
      patient_id: SAMPLE_PATIENTS.findIndex((p) => p[1] === phone) + 1,
      reason,
      cancellation_reason: status === 'cancelled' ? pick(CANCEL_REASONS) : null,
      admin_notes: null,
      confirmed_at: status === 'confirmed' || status === 'completed' ? stamp : null,
      completed_at: status === 'completed' ? decided : null,
      cancelled_at: status === 'cancelled' ? stamp : null,
      created_at: stamp,
      updated_at: stamp,
      last_email: null,
      last_whatsapp: whatsapp[0] ?? null,
      // kept on the row; appointment() returns them as the detail view's logs
      whatsapp_messages: whatsapp,
      emails: [],
    })
  }

  for (let offset = -150; offset < 0; offset += 2) add(addDays(start, offset), rnd() < 0.85 ? 'completed' : 'cancelled')
  for (let offset = 1; offset < 15; offset++) for (let n = 0; n < 2; n++) add(addDays(start, offset), rnd() < 0.5 ? 'pending' : 'confirmed')
  return rows
}

const SAMPLE_MESSAGES: Omit<ContactMessage, 'id' | 'created_at'>[] = [
  {
    name: 'Priya Sharma',
    email: 'priya.sharma@example.com',
    phone: '+91 90000 10001',
    subject: 'Appointment request: Dr. Jeevith C Reddy (Medical Dermatology)',
    message: 'I have had an acne flare-up on my cheeks for three weeks. Can I see Dr. Jeevith at Indiranagar this weekend? Sunday afternoon works best.',
    is_read: false,
  },
  {
    name: 'Rahul Varma',
    email: 'rahul.varma@example.com',
    phone: '+91 90000 10002',
    subject: 'Appointment request: Dr. Jatin K Reddy (Hair Transplant)',
    message: 'My hairline is receding. I would like an FUE hair transplant consultation with Dr. Jatin and an idea of the cost and EMI options. Happy to send photos on WhatsApp.',
    is_read: false,
  },
  {
    name: 'Sneha Kulkarni',
    email: 'sneha.k@example.com',
    phone: '+91 90000 10003',
    subject: 'Bridal package with Dr. Eshritha C (Premium Packages)',
    message: 'My wedding is in four months. I would like to plan a bridal glow programme with HydraFacial and skin boosters with Dr. Eshritha.',
    is_read: false,
  },
  {
    name: 'Amit Patel',
    email: 'amit.patel@example.com',
    phone: '+91 90000 10004',
    subject: 'Hair fall — PRP or GFC with Dr. Jatin K Reddy (Hair Treatments)',
    message: 'Hair thinning at the crown for a year. Is PRP or GFC suitable, and how many sessions are usually needed? Ramamurthy Nagar is closer for me.',
    is_read: true,
  },
  {
    name: 'Divya Nambiar',
    email: 'divya.n@example.com',
    phone: '+91 90000 10005',
    subject: 'Laser hair reduction with Dr. Eshritha C (Laser Treatments)',
    message: 'I would like laser hair reduction for the upper lip and chin. Which days is Dr. Eshritha at Indiranagar, and how many sessions does it take?',
    is_read: false,
  },
  {
    name: 'Karthik Iyer',
    email: 'karthik.iyer@example.com',
    phone: '+91 90000 10006',
    subject: 'Skin tag removal with Dr. Jeevith C Reddy (Dermatosurgery)',
    message: 'A few skin tags on my neck. Can they be removed on the same day as the consultation?',
    is_read: true,
  },
]

function seedDocuments(): KnowledgeDocument[] {
  const stamp = nowIso()
  const docs: [string, KnowledgeDocument['source_type'], number][] = [
    ['RUA Skin & Hair Center — clinic, centres and opening hours', 'system', 6],
    ['Our doctors', 'system', 9],
    ['Services and treatments', 'system', 64],
    ['Appointment guide', 'seed', 8],
    ['Frequently asked questions', 'seed', 14],
    ['Patient policies', 'seed', 7],
  ]
  return docs.map(([title, source_type, chunk_count], i) => ({
    id: i + 1,
    title,
    source_type,
    filename: source_type === 'seed' ? `${slugify(title)}.md` : null,
    content_type: source_type === 'seed' ? 'text/markdown' : null,
    status: 'ready',
    error: null,
    chunk_count,
    created_at: stamp,
    updated_at: stamp,
  }))
}

interface MockDb {
  version: 1
  theme: Theme
  doctors: Doctor[]
  services: Service[]
  appointments: (Appointment & { whatsapp_messages?: WhatsAppMessage[]; emails?: AppointmentDetail['emails'] })[]
  messages: ContactMessage[]
  posts: BlogPostAdmin[]
  transformations: TransformationAdmin[]
  documents: KnowledgeDocument[]
}

function seed(): MockDb {
  const doctors = seedDoctors()
  const start = today()
  return {
    version: 1,
    theme: 'cedar',
    doctors,
    services: seedServices(),
    appointments: seedAppointments(doctors),
    messages: SAMPLE_MESSAGES.map((m, i) => ({ ...m, id: i + 1, created_at: `${addDays(start, -(i % 4))}T0${(i % 9) + 1}:15:00.000Z` })),
    posts: [],
    transformations: [],
    documents: seedDocuments(),
  }
}

// --- Storage (localStorage, with an in-memory fallback) ----------------------------------------

let memory: MockDb | null = null

function db(): MockDb {
  if (memory) return memory
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? (JSON.parse(raw) as MockDb) : null
    if (parsed?.version === 1) memory = parsed
  } catch {
    /* unreadable or blocked storage: start from the seed */
  }
  if (!memory) {
    memory = seed()
    save()
  }
  return memory
}

function save() {
  try {
    if (memory) localStorage.setItem(STORAGE_KEY, JSON.stringify(memory))
  } catch {
    /* storage full or blocked: changes last until the tab closes */
  }
}

/** Forget every change made in the demo portal and start again from the RUA seed. */
export function resetMockAdmin() {
  memory = seed()
  save()
}

// --- Session ----------------------------------------------------------------------------------------

function sessionAccount(): MockAccount {
  const token = tokenStore.get()
  const id = token?.startsWith(TOKEN_PREFIX) ? Number(token.slice(TOKEN_PREFIX.length)) : NaN
  const account = MOCK_ACCOUNTS.find((a) => a.id === id)
  if (!account) {
    window.dispatchEvent(new Event('auth:expired'))
    throw new ApiError('Your session has ended. Please sign in again.', 401, 'unauthorized')
  }
  return account
}

function requireAdmin(): MockAccount {
  const account = sessionAccount()
  if (account.role !== 'admin') throw new ApiError('Only clinic administrators can do this.', 403, 'forbidden')
  return account
}

const publicUser = ({ password: _password, doctorSlug: _slug, ...user }: MockAccount): User => user

/** Doctors see only their own patients, as in the API. */
function scopedAppointments() {
  const account = sessionAccount()
  const rows = db().appointments
  if (account.role !== 'doctor') return rows
  const doctor = db().doctors.find((d) => d.slug === account.doctorSlug)
  return rows.filter((a) => a.doctor.id === doctor?.id)
}

// --- Public pieces the portal reads ------------------------------------------------------------

export function mockClinicInfo(): Promise<ClinicInfo> {
  const main = CENTRES[0]
  return wait({
    name: BRAND.name,
    tagline: BRAND.tagline,
    about: BRAND.description,
    phone: BRAND.whatsappDisplay,
    whatsapp: BRAND.whatsappDisplay,
    email: '',
    address_line: main.addressLines.slice(0, 2).join(', '),
    city: 'Bengaluru',
    state: 'Karnataka',
    postal_code: main.postalCode,
    country: 'India',
    map_embed_url: main.mapEmbedUrl,
    opening_hours: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => ({
      day,
      open: BRAND.hours.open,
      close: BRAND.hours.close,
      closed: false,
    })),
    emergency_note:
      'RUA Skin & Hair Center is an outpatient clinic and does not provide emergency care. In a medical emergency, call 112 or go to the nearest hospital emergency department.',
    theme: db().theme,
  }, 0)
}

// --- Auth ---------------------------------------------------------------------------------------

export const mockAuthApi = {
  login: (email: string, password: string): Promise<TokenResponse> => {
    const account = MOCK_ACCOUNTS.find((a) => a.email.toLowerCase() === email.trim().toLowerCase() && a.password === password)
    if (!account) return Promise.reject(new ApiError('Incorrect email or password.', 401, 'unauthorized'))
    return wait({ access_token: `${TOKEN_PREFIX}${account.id}`, token_type: 'bearer', expires_in: 8 * 3600, user: publicUser(account) })
  },
  me: (): Promise<User> => {
    try {
      return wait(publicUser(sessionAccount()), 0)
    } catch (err) {
      return Promise.reject(err)
    }
  },
}

// --- Admin ----------------------------------------------------------------------------------------

/** Run a handler with the API's async/error behaviour (errors become rejected promises). */
function call<T>(fn: () => T, ms?: number): Promise<T> {
  try {
    return wait(clone(fn()), ms)
  } catch (err) {
    return Promise.reject(err)
  }
}

function detail(a: MockDb['appointments'][number]): AppointmentDetail {
  return {
    ...a,
    emails: a.emails ?? [],
    whatsapp_messages: a.whatsapp_messages ?? [],
    reminder_24h_sent_at: null,
    reminder_2h_sent_at: null,
  }
}

function listItem(a: MockDb['appointments'][number]): Appointment {
  const { whatsapp_messages: _wa, emails: _emails, ...rest } = a
  return rest
}

function findAppointment(id: number) {
  return scopedAppointments().find((a) => a.id === id) ?? notFound('Appointment')
}

function logWhatsApp(a: MockDb['appointments'][number], kind: WhatsAppMessage['kind'], body: string) {
  const all = db().appointments.flatMap((x) => x.whatsapp_messages ?? [])
  const message: WhatsAppMessage = {
    id: nextId(all),
    appointment_id: a.id,
    to_phone: a.patient_phone,
    kind,
    body,
    status: 'skipped',
    provider_message_id: null,
    error: DEMO_NOTE,
    created_at: nowIso(),
  }
  a.whatsapp_messages = [...(a.whatsapp_messages ?? []), message]
  a.last_whatsapp = message
}

const TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
}

function validateDoctor(data: DoctorInput) {
  const errors: Record<string, string> = {}
  if (!data.full_name?.trim()) errors.full_name = 'Please enter the doctor’s name'
  if (!data.specialization?.trim()) errors.specialization = 'Please enter a specialization'
  if (!data.consultation_days?.length) errors.consultation_days = 'Choose at least one consultation day'
  if (data.start_time && data.end_time && toMinutes(data.start_time) >= toMinutes(data.end_time)) errors.end_time = 'End time must be after the start time'
  if (Object.keys(errors).length) invalid(errors)
}

function uniqueSlug(base: string, taken: { slug: string; id: number }[], selfId?: number) {
  let slug = slugify(base) || 'item'
  for (let n = 2; taken.some((t) => t.slug === slug && t.id !== selfId); n++) slug = `${slugify(base)}-${n}`
  return slug
}

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new ApiError('Could not read that file.', 400, 'bad_file'))
    reader.readAsDataURL(file)
  })

export const mockAdminApi = {
  overview: () =>
    call((): Overview => {
      sessionAccount()
      const d = db()
      const rnd = seededRandom(7)
      const per_day = Array.from({ length: 14 }, (_, i) => ({ date: addDays(today(), i - 13), count: 4 + Math.floor(rnd() * 14) }))
      const total = per_day.reduce((n, p) => n + p.count, 0) * 2
      const by_status: Record<ChatStatus, number> = {
        answered: Math.round(total * 0.78),
        fallback: Math.round(total * 0.06),
        no_context: Math.round(total * 0.07),
        safety_redirect: Math.round(total * 0.08),
        emergency: 0,
      }
      by_status.emergency = Math.max(0, total - Object.values(by_status).reduce((a, b) => a + b, 0))
      return {
        chat: {
          today: per_day[per_day.length - 1].count,
          total,
          window_days: 30,
          by_status,
          answered_rate: Math.round(((by_status.answered + by_status.fallback) / total) * 1000) / 1000,
          avg_latency_ms: 1840,
          per_day,
        },
        knowledge: {
          documents: d.documents.length,
          ready: d.documents.filter((x) => x.status === 'ready').length,
          failed: d.documents.filter((x) => x.status === 'failed').length,
          chunks: d.documents.reduce((n, x) => n + x.chunk_count, 0),
          embedding_model: 'gemini:gemini-embedding-001:768',
        },
        unread_messages: d.messages.filter((m) => !m.is_read).length,
        active_doctors: d.doctors.filter((x) => x.is_active).length,
        active_services: d.services.filter((x) => x.is_active).length,
      }
    }),

  // Doctors
  doctors: () => call(() => {
    sessionAccount()
    return [...db().doctors].sort((a, b) => a.full_name.localeCompare(b.full_name))
  }),
  createDoctor: (data: DoctorInput) =>
    call(() => {
      requireAdmin()
      validateDoctor(data)
      const d = db()
      const doctor: Doctor = { ...data, id: nextId(d.doctors), slug: uniqueSlug(data.slug || data.full_name, d.doctors) }
      d.doctors.push(doctor)
      save()
      return doctor
    }),
  updateDoctor: (id: number, data: DoctorInput) =>
    call(() => {
      requireAdmin()
      validateDoctor(data)
      const d = db()
      const i = d.doctors.findIndex((x) => x.id === id)
      if (i < 0) notFound('Doctor')
      const doctor: Doctor = { ...d.doctors[i], ...data, id, slug: uniqueSlug(data.slug || d.doctors[i].slug, d.doctors, id) }
      d.doctors[i] = doctor
      for (const a of d.appointments) if (a.doctor.id === id) a.doctor = appointmentDoctor(doctor)
      save()
      return doctor
    }),
  deleteDoctor: (id: number, opts?: { deleteAppointments?: boolean }) =>
    call((): void => {
      requireAdmin()
      const d = db()
      if (!d.doctors.some((x) => x.id === id)) notFound('Doctor')
      const booked = d.appointments.filter((a) => a.doctor.id === id)
      if (booked.length && !opts?.deleteAppointments) {
        throw new ApiError(
          `This doctor has ${booked.length} appointment${booked.length === 1 ? '' : 's'}. Delete them too, or mark the doctor inactive instead.`,
          409,
          'doctor_has_appointments',
          { appointments: String(booked.length) },
        )
      }
      d.appointments = d.appointments.filter((a) => a.doctor.id !== id)
      d.doctors = d.doctors.filter((x) => x.id !== id)
      save()
    }),

  // Services
  services: () => call(() => {
    sessionAccount()
    return db().services
  }),
  createService: (data: ServiceInput) =>
    call(() => {
      requireAdmin()
      if (!data.name?.trim()) invalid({ name: 'Please enter a name' })
      const d = db()
      const { sort_order: _order, ...rest } = data
      const service: Service = { ...rest, id: nextId(d.services), slug: uniqueSlug(data.slug || data.name, d.services) }
      d.services.push(service)
      save()
      return service
    }),
  updateService: (id: number, data: ServiceInput) =>
    call(() => {
      requireAdmin()
      if (!data.name?.trim()) invalid({ name: 'Please enter a name' })
      const d = db()
      const i = d.services.findIndex((x) => x.id === id)
      if (i < 0) notFound('Service')
      const { sort_order: _order, ...rest } = data
      d.services[i] = { ...d.services[i], ...rest, id, slug: uniqueSlug(data.slug || d.services[i].slug, d.services, id) }
      save()
      return d.services[i]
    }),
  deleteService: (id: number) =>
    call((): void => {
      requireAdmin()
      const d = db()
      if (!d.services.some((x) => x.id === id)) notFound('Service')
      d.services = d.services.filter((x) => x.id !== id)
      save()
    }),

  // Appointments
  appointments: (params: AppointmentQuery) =>
    call((): AppointmentList => {
      let rows = scopedAppointments()
      if (params.department) rows = rows.filter((a) => a.department === params.department)
      if (params.date_from) rows = rows.filter((a) => a.appointment_date >= params.date_from!)
      if (params.date_to) rows = rows.filter((a) => a.appointment_date <= params.date_to!)
      const q = params.q?.trim().toLowerCase()
      if (q) {
        rows = rows.filter((a) =>
          [a.reference, a.patient_name, a.patient_email ?? '', a.patient_phone].some((v) => v.toLowerCase().includes(q)),
        )
      }
      const counts: Record<AppointmentStatus, number> = { pending: 0, confirmed: 0, completed: 0, cancelled: 0 }
      for (const a of rows) counts[a.status] += 1
      if (params.status) rows = rows.filter((a) => a.status === params.status)
      const key = (a: Appointment) => `${a.appointment_date} ${a.start_time}`
      // Open work soonest first; history newest first (as the API orders it).
      rows = [...rows].sort((a, b) =>
        params.status === 'pending' || params.status === 'confirmed' ? key(a).localeCompare(key(b)) : key(b).localeCompare(key(a)),
      )
      const page = params.page ?? 1
      const size = params.page_size ?? 20
      return {
        items: rows.slice((page - 1) * size, page * size).map(listItem),
        total: rows.length,
        page,
        page_size: size,
        pages: Math.max(1, Math.ceil(rows.length / size)),
        counts,
      }
    }),
  appointment: (id: number) => call(() => detail(findAppointment(id))),
  appointmentAnalytics: () =>
    call((): AppointmentAnalytics => {
      const rows = scopedAppointments()
      const now = today()
      const monthKey = now.slice(0, 7)
      const wentAhead = (a: Appointment) => a.status === 'confirmed' || a.status === 'completed'
      const fee = (a: Appointment) => Number(a.consultation_fee ?? 0)
      const months: string[] = []
      for (let i = 5; i >= 0; i--) {
        const d = new Date(`${monthKey}-01T00:00:00Z`)
        d.setUTCMonth(d.getUTCMonth() - i)
        months.push(d.toISOString().slice(0, 7))
      }
      const by_month = months.map((month) => {
        const inMonth = rows.filter((a) => a.appointment_date.startsWith(month))
        const n = (s: AppointmentStatus) => inMonth.filter((a) => a.status === s).length
        return { month, total: inMonth.length, pending: n('pending'), confirmed: n('confirmed'), completed: n('completed'), cancelled: n('cancelled') }
      })
      const tally = <K extends string>(keys: K[]) => {
        const counts = new Map<K, number>()
        for (const k of keys) counts.set(k, (counts.get(k) ?? 0) + 1)
        return [...counts.entries()].sort((a, b) => b[1] - a[1])
      }
      const decided = rows.filter((a) => wentAhead(a) || a.status === 'cancelled').length
      const cancelled = rows.filter((a) => a.status === 'cancelled').length
      const revenue = (list: Appointment[]) => String(list.filter(wentAhead).reduce((n, a) => n + fee(a), 0))
      const whatsapp = rows.flatMap((a) => a.whatsapp_messages ?? [])
      const week = addDays(now, 7)
      return {
        total: rows.length,
        this_month: rows.filter((a) => a.appointment_date.startsWith(monthKey)).length,
        pending: rows.filter((a) => a.status === 'pending').length,
        today: rows.filter((a) => a.appointment_date === now && a.status !== 'cancelled').length,
        upcoming_7_days: rows.filter(
          (a) => a.appointment_date >= now && a.appointment_date <= week && (a.status === 'pending' || a.status === 'confirmed'),
        ).length,
        conversion_rate: decided ? Math.round(((decided - cancelled) / decided) * 1000) / 1000 : null,
        cancellation_rate: decided ? Math.round((cancelled / decided) * 1000) / 1000 : null,
        revenue_this_month: revenue(rows.filter((a) => a.appointment_date.startsWith(monthKey))),
        revenue_total: revenue(rows),
        by_month,
        by_department: tally(rows.map((a) => a.department)).map(([department, total]) => ({
          department,
          total,
          revenue: revenue(rows.filter((a) => a.department === department)),
        })),
        by_branch: tally(rows.map((a) => a.branch?.name ?? 'Not specified')).map(([branch, total]) => ({ branch, total })),
        by_source: Object.fromEntries(tally(rows.map((a) => a.source))),
        whatsapp_sent: whatsapp.filter((w) => w.status === 'sent').length,
        whatsapp_pending: whatsapp.filter((w) => w.status !== 'sent').length,
      }
    }),
  setAppointmentStatus: (id: number, data: { status: 'confirmed' | 'completed' | 'cancelled'; reason?: string; notify?: boolean }) =>
    call(() => {
      const a = findAppointment(id)
      if (!TRANSITIONS[a.status].includes(data.status)) {
        throw new ApiError(`A ${a.status} appointment can't be marked ${data.status}.`, 409, 'invalid_transition')
      }
      const stamp = nowIso()
      a.status = data.status
      a.updated_at = stamp
      if (data.status === 'confirmed') a.confirmed_at = stamp
      if (data.status === 'completed') a.completed_at = stamp
      if (data.status === 'cancelled') {
        a.cancelled_at = stamp
        a.cancellation_reason = data.reason?.trim() || 'Cancelled by the clinic'
      }
      if (data.notify !== false && data.status !== 'completed') {
        logWhatsApp(a, data.status === 'confirmed' ? 'confirmation' : 'cancellation', `Your RUA appointment ${a.reference} is ${data.status}.`)
      }
      save()
      return detail(a)
    }),
  updateAppointment: (
    id: number,
    data: { admin_notes?: string | null; appointment_date?: string; start_time?: string; doctor_id?: number; notify?: boolean },
  ) =>
    call(() => {
      const a = findAppointment(id)
      const d = db()
      if (data.admin_notes !== undefined) a.admin_notes = data.admin_notes
      const moving = data.appointment_date !== undefined || data.start_time !== undefined || data.doctor_id !== undefined
      if (moving) {
        const doctor = d.doctors.find((x) => x.id === (data.doctor_id ?? a.doctor.id)) ?? notFound('Doctor')
        const day = data.appointment_date ?? a.appointment_date
        const start = normTime(data.start_time ?? a.start_time)
        if (!slotGrid(doctor, day).includes(start)) invalid({ start_time: `${doctor.full_name} has no ${start.slice(0, 5)} slot on that day` })
        const clash = d.appointments.some(
          (x) => x.id !== a.id && x.doctor.id === doctor.id && x.appointment_date === day && x.start_time === start && (x.status === 'pending' || x.status === 'confirmed'),
        )
        if (clash) throw new ApiError('That slot was just booked. Please choose another time.', 409, 'slot_taken')
        a.doctor = appointmentDoctor(doctor)
        a.appointment_date = day
        a.start_time = start
        a.end_time = toTime(toMinutes(start) + doctor.slot_minutes)
        if (data.notify !== false) logWhatsApp(a, 'reschedule', `Your RUA appointment ${a.reference} has moved to ${day} at ${start.slice(0, 5)}.`)
      }
      a.updated_at = nowIso()
      save()
      return detail(a)
    }),
  resendAppointmentEmail: (id: number, kind: 'confirmation' | 'cancellation') =>
    call(() => {
      const a = findAppointment(id)
      const email = {
        id: nextId(db().appointments.flatMap((x) => x.emails ?? [])),
        kind,
        status: 'skipped' as const,
        recipient: a.patient_email ?? a.patient_phone,
        subject: `Your RUA appointment ${a.reference}`,
        message_id: null,
        error: DEMO_NOTE,
        created_at: nowIso(),
      }
      a.emails = [...(a.emails ?? []), email]
      a.last_email = email
      save()
      return detail(a)
    }),
  deleteAppointment: (id: number) =>
    call((): void => {
      findAppointment(id)
      const d = db()
      d.appointments = d.appointments.filter((a) => a.id !== id)
      save()
    }),

  uploadImage: async (file: File) => {
    sessionAccount()
    if (!file.type.startsWith('image/')) throw new ApiError('Please choose an image file.', 400, 'bad_file')
    if (file.size > 1.5 * 1024 * 1024) throw new ApiError('In the demo portal images must be under 1.5 MB.', 400, 'file_too_large')
    return fileToDataUrl(file)
  },

  // Blog
  posts: () => call(() => {
    sessionAccount()
    return db().posts
  }),
  createPost: (data: BlogPostInput) =>
    call(() => {
      sessionAccount()
      if (!data.title?.trim()) invalid({ title: 'Please enter a title' })
      const d = db()
      const author = d.doctors.find((x) => x.id === data.author_id)
      const post: BlogPostAdmin = {
        ...data,
        id: nextId(d.posts),
        slug: uniqueSlug(data.slug || data.title, d.posts),
        reading_minutes: data.reading_minutes ?? Math.max(1, Math.round(data.content.split(/\s+/).length / 200)),
        published_at: data.published_at ?? nowIso(),
        author: author ? { id: author.id, slug: author.slug, full_name: author.full_name, specialization: author.specialization, photo_url: author.photo_url } : null,
      }
      d.posts.unshift(post)
      save()
      return post
    }),
  updatePost: (id: number, data: BlogPostInput) =>
    call(() => {
      sessionAccount()
      const d = db()
      const i = d.posts.findIndex((x) => x.id === id)
      if (i < 0) notFound('Article')
      const author = d.doctors.find((x) => x.id === data.author_id)
      d.posts[i] = {
        ...d.posts[i],
        ...data,
        id,
        slug: uniqueSlug(data.slug || d.posts[i].slug, d.posts, id),
        reading_minutes: data.reading_minutes ?? d.posts[i].reading_minutes,
        published_at: data.published_at ?? d.posts[i].published_at,
        author: author ? { id: author.id, slug: author.slug, full_name: author.full_name, specialization: author.specialization, photo_url: author.photo_url } : null,
      }
      save()
      return d.posts[i]
    }),
  deletePost: (id: number) =>
    call((): void => {
      sessionAccount()
      const d = db()
      d.posts = d.posts.filter((x) => x.id !== id)
      save()
    }),

  // Before / after gallery
  transformations: () => call(() => {
    sessionAccount()
    return db().transformations
  }),
  createTransformation: (data: TransformationInput) =>
    call(() => {
      sessionAccount()
      const d = db()
      const row: TransformationAdmin = { ...data, id: nextId(d.transformations) }
      d.transformations.push(row)
      save()
      return row
    }),
  updateTransformation: (id: number, data: TransformationInput) =>
    call(() => {
      sessionAccount()
      const d = db()
      const i = d.transformations.findIndex((x) => x.id === id)
      if (i < 0) notFound('Case')
      d.transformations[i] = { ...data, id }
      save()
      return d.transformations[i]
    }),
  deleteTransformation: (id: number) =>
    call((): void => {
      sessionAccount()
      const d = db()
      d.transformations = d.transformations.filter((x) => x.id !== id)
      save()
    }),

  setTheme: (theme: Theme) =>
    call(() => {
      requireAdmin()
      db().theme = theme
      save()
    }).then(() => mockClinicInfo()),

  // Messages
  messages: () =>
    call(() => {
    sessionAccount()
    return [...db().messages].sort((a, b) => b.created_at.localeCompare(a.created_at))
  }),
  markMessageRead: (id: number) =>
    call(() => {
      sessionAccount()
      const m = db().messages.find((x) => x.id === id) ?? notFound('Message')
      m.is_read = true
      save()
      return m
    }),

  // Chatbot knowledge
  documents: () => call(() => {
    sessionAccount()
    return db().documents
  }),
  uploadDocument: async (file: File, title?: string) => {
    requireAdmin()
    if (!/\.(pdf|txt|md)$/i.test(file.name)) throw new ApiError('Upload a PDF, TXT or Markdown file.', 400, 'unsupported_file')
    const d = db()
    const stamp = nowIso()
    const doc: KnowledgeDocument = {
      id: nextId(d.documents),
      title: title?.trim() || file.name.replace(/\.[^.]+$/, ''),
      source_type: 'upload',
      filename: file.name,
      content_type: file.type || null,
      status: 'ready',
      error: null,
      chunk_count: Math.max(1, Math.round(file.size / 1500)),
      created_at: stamp,
      updated_at: stamp,
    }
    d.documents.push(doc)
    save()
    return wait(clone(doc), 400)
  },
  deleteDocument: (id: number) =>
    call(() => {
      requireAdmin()
      const d = db()
      d.documents = d.documents.filter((x) => x.id !== id)
      save()
      return { message: 'Document deleted.' }
    }),
  reindex: () =>
    call(() => {
      requireAdmin()
      const docs = db().documents
      return { documents: docs.length, chunks: docs.reduce((n, x) => n + x.chunk_count, 0), embedding_model: 'gemini:gemini-embedding-001:768' }
    }, 600),
}
