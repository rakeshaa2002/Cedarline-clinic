import { Check, CheckCircle2, Clock, Filter, Inbox, Mail, Phone, Search, Stethoscope, User, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { EmptyState, ErrorState, PageLoader } from '@/components/ui/Feedback'
import { Card } from '@/components/ui/Layout'
import { useToast } from '@/components/ui/Toast'
import { WhatsAppIcon } from '@/components/ui/WhatsAppIcon'
import { useApi } from '@/hooks/useApi'
import { useAuth } from '@/hooks/useAuth'
import { useDoctors } from '@/hooks/useClinic'
import { AdminPageHeader } from '@/layouts/AdminLayout'
import type { ApiError } from '@/services/api'
import { adminApi } from '@/services/endpoints'
import type { Department } from '@/types'
import { DEPARTMENT_LABELS, formatDateTime } from '@/utils/format'

// RUA's specialities. Enquiries are free text, so each is matched on the words patients use.
const SPECIALITY_TERMS: Record<Department, RegExp> = {
  'medical-dermatology': /medical dermatology|acne|pimple|pigment|melasma|eczema|psoria|rash|itch|vitiligo|fungal|infection|allerg|dermatitis|urticaria/i,
  dermatosurgery: /dermatosurg|skin tags?|moles?|cysts?|warts?|scar revision|excision|biops|ingrown|keloid/i,
  'aesthetic-dermatology': /cosmetic|aesthetic|hydra ?facial|peel|botox|filler|skin booster|pdrn|nctf|mnrf|microneedl|glow|ageing|aging|wrinkle|dull/i,
  'laser-treatments': /laser|tattoo|co2|toning|hair reduction/i,
  'hair-treatments': /hair ?fall|hair loss|thinning|dandruff|scalp|prp|gfc|exosome|qr ?678|alopecia|tricho/i,
  'hair-transplant': /transplant|fue|dhi|sapphire|hairline|beard|eyebrow|grafts?/i,
  'premium-packages': /bridal|groom|wedding|package/i,
}
const SPECIALITIES = Object.keys(SPECIALITY_TERMS) as Department[]

/** "Dr. Jatin K Reddy" -> matches "Dr Jatin", "Jatin K Reddy" or "Dr. Jatin K Reddy" in an enquiry. */
const mentionsDoctor = (text: string, fullName: string) => {
  const first = fullName.replace(/^dr\.?\s+/i, '').split(' ')[0]
  return first.length >= 3 && new RegExp(`\\b${first}\\b`, 'i').test(text)
}

export default function AdminMessagesPage() {
  const { user } = useAuth()
  const messages = useApi('admin:messages', adminApi.messages, { cache: false })
  const doctors = useDoctors()
  const toast = useToast()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'unread' | 'read'>('all')
  const [deptFilter, setDeptFilter] = useState<Department | 'all'>('all')
  const [doctorFilter, setDoctorFilter] = useState('all')
  const [updatingId, setUpdatingId] = useState<number | null>(null)

  const isDoctor = user?.role === 'doctor'
  const doctorName = user?.full_name || 'RUA Skin & Hair Center'
  const doctorList = doctors.data ?? []

  const markRead = async (id: number) => {
    setUpdatingId(id)
    try {
      await adminApi.markMessageRead(id)
      messages.reload()
      toast.success('Patient status updated', 'Marked as reviewed and contacted.')
    } catch (err) {
      toast.error('Could not update status', (err as ApiError).message)
    } finally {
      setUpdatingId(null)
    }
  }

  const allItems = useMemo(() => messages.data ?? [], [messages.data])

  const filteredItems = useMemo(() => {
    return allItems.filter((m) => {
      // Status filter
      if (statusFilter === 'unread' && m.is_read) return false
      if (statusFilter === 'read' && !m.is_read) return false

      // Speciality and doctor filters read the subject and message text
      const text = `${m.subject} ${m.message}`
      if (deptFilter !== 'all' && !SPECIALITY_TERMS[deptFilter].test(text)) return false
      if (doctorFilter !== 'all' && !mentionsDoctor(text, doctorFilter)) return false

      // Search query
      if (search.trim()) {
        const q = search.toLowerCase()
        const match =
          m.name.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q) ||
          (m.phone && m.phone.includes(q)) ||
          m.subject.toLowerCase().includes(q) ||
          m.message.toLowerCase().includes(q)
        if (!match) return false
      }

      return true
    })
  }, [allItems, statusFilter, deptFilter, doctorFilter, search])
  const filtering = search !== '' || deptFilter !== 'all' || doctorFilter !== 'all' || statusFilter !== 'all'

  if (messages.loading && !messages.data) return <PageLoader />
  if (messages.error) return <ErrorState message={messages.error.message} onRetry={messages.reload} />

  const totalCount = allItems.length
  const unreadCount = allItems.filter((m) => !m.is_read).length
  const readCount = totalCount - unreadCount

  return (
    <>
      <AdminPageHeader
        title={isDoctor ? 'Patient Appointments & Inquiries' : 'Messages & Appointments'}
        description={
          isDoctor
            ? `Welcome ${doctorName}. Review patient appointment requests, connect directly via WhatsApp or phone, and update care status.`
            : `Front desk message log and appointment inquiries · ${unreadCount} pending action`
        }
      />

      {/* Metric summary cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-500">Total Patient Requests</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-ink-900">{totalCount}</span>
            <span className="text-xs text-ink-500">received</span>
          </div>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-800">New / Action Required</p>
            {unreadCount > 0 && <span className="relative flex size-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75"></span><span className="relative inline-flex size-2.5 rounded-full bg-amber-500"></span></span>}
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-amber-900">{unreadCount}</span>
            <span className="text-xs text-amber-700">need response</span>
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-800">Contacted / Completed</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-emerald-900">{readCount}</span>
            <span className="text-xs text-emerald-700">handled</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="mb-6 space-y-4 rounded-2xl border border-ink-100 bg-white p-4 shadow-xs">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Status Tabs */}
          <div className="inline-flex rounded-xl bg-ink-100/70 p-1 text-xs font-semibold text-ink-600">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`rounded-lg px-3.5 py-1.5 transition-colors cursor-pointer ${
                statusFilter === 'all' ? 'bg-white text-ink-900 shadow-xs' : 'hover:text-ink-900'
              }`}
            >
              All ({totalCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('unread')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 transition-colors cursor-pointer ${
                statusFilter === 'unread' ? 'bg-white text-amber-800 shadow-xs' : 'hover:text-ink-900'
              }`}
            >
              Pending ({unreadCount})
              {unreadCount > 0 && <span className="size-1.5 rounded-full bg-amber-500" />}
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('read')}
              className={`rounded-lg px-3.5 py-1.5 transition-colors cursor-pointer ${
                statusFilter === 'read' ? 'bg-white text-emerald-800 shadow-xs' : 'hover:text-ink-900'
              }`}
            >
              Contacted ({readCount})
            </button>
          </div>

          {/* Search box */}
          <div className="relative flex-1 lg:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by patient name, phone, email, condition…"
              className="w-full rounded-xl border border-ink-200 bg-ink-50/50 py-2 pl-9 pr-8 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-200"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        </div>

        {/* Speciality filter pills (RUA's seven specialities) */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-ink-100 text-xs">
          <span className="inline-flex items-center gap-1 font-semibold text-ink-500 mr-1">
            <Filter className="size-3.5" /> Speciality:
          </span>
          {(['all', ...SPECIALITIES] as const).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setDeptFilter(id)}
              className={`rounded-lg px-3 py-1 font-medium transition-all cursor-pointer ${
                deptFilter === id ? 'bg-brand-600 text-white shadow-xs' : 'bg-ink-100/80 text-ink-700 hover:bg-ink-200/70'
              }`}
            >
              {id === 'all' ? 'All specialities' : DEPARTMENT_LABELS[id]}
            </button>
          ))}
        </div>

        {/* Doctor filter pills (live doctor list) */}
        {doctorList.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 font-semibold text-ink-500 mr-1">
              <Stethoscope className="size-3.5" /> Doctor:
            </span>
            {[{ slug: 'all', full_name: 'All doctors' }, ...doctorList].map((d) => {
              const value = d.slug === 'all' ? 'all' : d.full_name
              return (
                <button
                  key={d.slug}
                  type="button"
                  onClick={() => setDoctorFilter(value)}
                  className={`rounded-lg px-3 py-1 font-medium transition-all cursor-pointer ${
                    doctorFilter === value ? 'bg-brand-600 text-white shadow-xs' : 'bg-ink-100/80 text-ink-700 hover:bg-ink-200/70'
                  }`}
                >
                  {d.full_name}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Patient Messages List */}
      {filteredItems.length === 0 ? (
        <EmptyState
          icon={<Inbox className="size-6" aria-hidden="true" />}
          title={filtering ? 'No matching patient records' : 'No inquiries yet'}
          description={
            filtering
              ? 'Try adjusting your search keywords or clearing active filters.'
              : 'Patient appointment requests submitted via the website or WhatsApp will appear here.'
          }
          action={
            filtering ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearch('')
                  setDeptFilter('all')
                  setDoctorFilter('all')
                  setStatusFilter('all')
                }}
              >
                Reset filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ul className="space-y-4">
          {filteredItems.map((m) => {
            const cleanPhone = m.phone ? m.phone.replace(/\D/g, '') : null
            const whatsappText = encodeURIComponent(
              `Hello ${m.name}, this is ${isDoctor ? doctorName : 'the front desk'} from RUA Skin & Hair Center about your enquiry: "${m.subject}". How can we help you with your appointment?`
            )
            const whatsappUrl = cleanPhone ? `https://wa.me/${cleanPhone}?text=${whatsappText}` : null
            const initials = m.name
              .split(' ')
              .map((n) => n[0])
              .filter(Boolean)
              .slice(0, 2)
              .join('')
              .toUpperCase()

            const isAppointment = /appointment|book|consult|consultation|schedule/i.test(m.subject)

            return (
              <li key={m.id}>
                <Card
                  className={`overflow-hidden transition-all duration-200 border ${
                    m.is_read
                      ? 'border-ink-200/80 bg-white'
                      : 'border-l-4 border-l-brand-600 border-ink-200 bg-white shadow-sm'
                  }`}
                >
                  <div className="p-5 sm:p-6">
                    {/* Header Row: Patient identity and status badge */}
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex items-center gap-3.5">
                        <div className="grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-brand-100 to-brand-50 text-sm font-bold text-brand-800 shadow-xs border border-brand-200/50">
                          {initials || <User className="size-5" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h2 className="text-base font-bold text-ink-900">{m.name}</h2>
                            {isAppointment && (
                              <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700 border border-brand-200/60">
                                Appointment
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-ink-400 mt-0.5">
                            <Clock className="size-3.5" />
                            <span>{formatDateTime(m.created_at)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Status badge */}
                      <div className="flex items-center gap-2">
                        {m.is_read ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="size-3.5 text-emerald-600" /> Contacted & Reviewed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 border border-amber-200">
                            <span className="size-2 rounded-full bg-amber-500 animate-pulse" /> Action Required
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Subject & Message Content */}
                    <div className="mt-4 rounded-xl bg-ink-50/70 p-4 border border-ink-100">
                      <p className="text-xs font-bold uppercase tracking-wider text-ink-500">Subject / Concern</p>
                      <p className="mt-0.5 text-sm font-semibold text-ink-900">{m.subject}</p>
                      <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap text-ink-700 font-normal">
                        {m.message}
                      </p>
                    </div>

                    {/* Bottom Row: Contact info + Doctor Quick Actions */}
                    <div className="mt-5 flex flex-col gap-4 pt-4 border-t border-ink-100 sm:flex-row sm:items-center sm:justify-between">
                      {/* Patient Contact Links */}
                      <div className="flex flex-wrap items-center gap-4 text-xs">
                        {m.phone && (
                          <a
                            href={`tel:${m.phone.replace(/\s/g, '')}`}
                            className="inline-flex items-center gap-1.5 font-semibold text-ink-700 hover:text-brand-700 transition-colors"
                          >
                            <Phone className="size-3.5 text-ink-400" />
                            <span>{m.phone}</span>
                          </a>
                        )}
                        <a
                          href={`mailto:${m.email}`}
                          className="inline-flex items-center gap-1.5 font-semibold text-ink-700 hover:text-brand-700 transition-colors"
                        >
                          <Mail className="size-3.5 text-ink-400" />
                          <span>{m.email}</span>
                        </a>
                      </div>

                      {/* Doctor Action Buttons */}
                      <div className="flex flex-wrap items-center gap-2">
                        {/* WhatsApp Patient Button */}
                        {whatsappUrl && (
                          <a
                            href={whatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-xl bg-[#25D366] px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#20bd5a] hover:shadow-sm transition-all cursor-pointer"
                            title={`Send WhatsApp message to ${m.name}`}
                          >
                            <WhatsAppIcon className="size-4" />
                            <span>WhatsApp Patient</span>
                          </a>
                        )}

                        {/* Call Patient Button */}
                        {m.phone && (
                          <a
                            href={`tel:${m.phone.replace(/\s/g, '')}`}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-ink-200 bg-white px-3 py-2 text-xs font-semibold text-ink-700 shadow-xs hover:bg-ink-50 transition-colors cursor-pointer"
                            title={`Call ${m.name}`}
                          >
                            <Phone className="size-3.5 text-brand-600" />
                            <span>Call</span>
                          </a>
                        )}

                        {/* Mark Reviewed / Read Toggle */}
                        {!m.is_read ? (
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => markRead(m.id)}
                            loading={updatingId === m.id}
                            icon={<Check className="size-3.5" />}
                          >
                            Mark as Contacted
                          </Button>
                        ) : (
                          <span className="text-xs font-medium text-emerald-700 inline-flex items-center gap-1">
                            <Check className="size-3 text-emerald-600" /> Completed
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
