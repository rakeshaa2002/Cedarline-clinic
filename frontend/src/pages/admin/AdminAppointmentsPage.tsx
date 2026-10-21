import {
  AlertTriangle,
  Ban,
  Bot,
  CalendarClock,
  Check,
  CheckCheck,
  ChevronRight,
  Globe,
  Mail,
  MailCheck,
  MailX,
  MailWarning,
  Phone,
  RefreshCw,
  Search,
  Send,
  Trash2,
} from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { SlotPicker } from '@/components/site/AppointmentBookingForm'
import { DoctorPhoto } from '@/components/site/Cards'
import { Button } from '@/components/ui/Button'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback'
import { Field, Input, Select, Textarea } from '@/components/ui/Form'
import { Badge, Card, Pagination } from '@/components/ui/Layout'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { WhatsAppIcon } from '@/components/ui/WhatsAppIcon'
import { useApi } from '@/hooks/useApi'
import { useAuth } from '@/hooks/useAuth'
import { clinicToday, useAvailability, type MergedSlot } from '@/hooks/useBooking'
import { AdminPageHeader } from '@/layouts/AdminLayout'
import { toApiError } from '@/services/api'
import { adminApi } from '@/services/endpoints'
import type { Appointment, AppointmentDetail, AppointmentEmail, AppointmentStatus, Department } from '@/types'
import { DEPARTMENT_LABELS, cn, formatDate, formatDateTime, formatLongDate, formatPrice, formatTime } from '@/utils/format'

const TABS: { status: AppointmentStatus | 'all'; label: string }[] = [
  { status: 'pending', label: 'Pending triage' },
  { status: 'confirmed', label: 'Confirmed' },
  { status: 'completed', label: 'Completed' },
  { status: 'cancelled', label: 'Cancelled' },
  { status: 'all', label: 'All' },
]

const STATUS_BADGE: Record<AppointmentStatus, { tone: 'warning' | 'success' | 'info' | 'danger'; label: string }> = {
  pending: { tone: 'warning', label: 'Pending' },
  confirmed: { tone: 'success', label: 'Confirmed' },
  completed: { tone: 'info', label: 'Completed' },
  cancelled: { tone: 'danger', label: 'Cancelled' },
}

const CANCEL_REASONS = ['Doctor on emergency duty', 'Slot overbooked', 'Doctor on leave', 'Requested by patient', 'Clinic closed that day']

function StatusBadge({ status }: { status: AppointmentStatus }) {
  const { tone, label } = STATUS_BADGE[status]
  return <Badge tone={tone}>{label}</Badge>
}

function EmailState({ email }: { email: AppointmentEmail | null }) {
  if (!email) return <span className="text-xs text-ink-400">—</span>
  const Icon = email.status === 'sent' ? MailCheck : email.status === 'failed' ? MailX : MailWarning
  const tone = email.status === 'sent' ? 'text-emerald-700' : email.status === 'failed' ? 'text-red-700' : 'text-amber-700'
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs font-medium', tone)} title={email.error ?? email.subject}>
      <Icon className="size-3.5" aria-hidden="true" />
      {email.kind} · {email.status}
    </span>
  )
}

/** "Sent", "Skipped (SMTP not configured)"… — tells staff whether the patient actually got the email. */
function emailToast(detail: AppointmentDetail, toast: ReturnType<typeof useToast>, action: string) {
  const email = detail.emails[0]
  if (!email) return toast.success(action)
  if (email.status === 'sent') toast.success(action, `Email sent to ${email.recipient}.`)
  else if (email.status === 'skipped') toast.info(action, `Email not sent: ${email.error ?? 'skipped'}`)
  else toast.error(`${action}, but the email failed`, email.error ?? 'Unknown error')
}

export default function AdminAppointmentsPage() {
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const tab = (params.get('status') as AppointmentStatus | 'all' | null) ?? 'pending'
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [department, setDepartment] = useState<Department | ''>('')
  const [page, setPage] = useState(1)
  const [openId, setOpenId] = useState<number | null>(null)
  const [cancelling, setCancelling] = useState<Appointment | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)

  const filters = { status: tab === 'all' ? undefined : tab, department: department || undefined, q: search || undefined, page, page_size: 15 }
  const list = useApi(`admin:appointments:${JSON.stringify(filters)}`, () => adminApi.appointments(filters), { cache: false })

  const switchTab = (status: AppointmentStatus | 'all') => {
    setParams(status === 'pending' ? {} : { status }, { replace: true })
    setPage(1)
  }

  const confirm = async (a: Appointment) => {
    setBusyId(a.id)
    try {
      emailToast(await adminApi.setAppointmentStatus(a.id, { status: 'confirmed' }), toast, `${a.reference} confirmed`)
      list.reload()
    } catch (err) {
      toast.error('Could not confirm', toApiError(err).message)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <>
      <AdminPageHeader
        title="Appointments"
        description="Online bookings hold their slot as soon as they're made. Confirm or cancel them here; patients are emailed automatically."
        action={
          <Button variant="outline" icon={<RefreshCw className="size-4" aria-hidden="true" />} onClick={list.reload}>
            Refresh
          </Button>
        }
      />

      <div role="tablist" aria-label="Appointment status" className="mb-4 flex gap-1 overflow-x-auto border-b border-ink-100">
        {TABS.map((t) => {
          const count = t.status === 'all' ? undefined : list.data?.counts[t.status]
          const active = tab === t.status
          return (
            <button
              key={t.status}
              role="tab"
              aria-selected={active}
              type="button"
              onClick={() => switchTab(t.status)}
              className={cn(
                '-mb-px flex shrink-0 items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors',
                active ? 'border-brand-600 text-brand-800' : 'border-transparent text-ink-500 hover:text-ink-800',
              )}
            >
              {t.label}
              {count !== undefined && (
                <span className={cn('rounded-full px-2 py-0.5 text-xs tabular-nums', t.status === 'pending' && count > 0 ? 'bg-accent-500 text-white' : 'bg-ink-100 text-ink-600')}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <form
        className="mb-4 flex flex-col gap-3 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault()
          setSearch(query.trim())
          setPage(1)
        }}
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-400" aria-hidden="true" />
          <Input
            aria-label="Search appointments"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search reference, patient name, phone or email"
            className="pl-9"
          />
        </div>
        <Select
          aria-label="Department"
          value={department}
          onChange={(e) => {
            setDepartment(e.target.value as Department | '')
            setPage(1)
          }}
          className="sm:w-56"
        >
          <option value="">All departments</option>
          {(Object.keys(DEPARTMENT_LABELS) as Department[]).map((d) => (
            <option key={d} value={d}>
              {DEPARTMENT_LABELS[d]}
            </option>
          ))}
        </Select>
        <Button type="submit" variant="outline">
          Search
        </Button>
      </form>

      {list.error ? (
        <ErrorState message={list.error.message} onRetry={list.reload} />
      ) : !list.data ? (
        <Skeleton className="h-96" />
      ) : list.data.items.length === 0 ? (
        <EmptyState
          title={tab === 'pending' && !search ? 'Nothing waiting for triage' : 'No appointments found'}
          description={tab === 'pending' && !search ? 'New online bookings appear here as soon as patients make them.' : 'Try another tab or search.'}
        />
      ) : (
        <Card className={cn('overflow-hidden', list.loading && 'opacity-70')}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <caption className="sr-only">Appointments</caption>
              <thead className="border-b border-ink-100 bg-ink-50/80 text-xs tracking-wide text-ink-500 uppercase">
                <tr>
                  <th scope="col" className="px-5 py-3 font-semibold">Patient</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Doctor</th>
                  <th scope="col" className="px-5 py-3 font-semibold">When</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Status</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Last email</th>
                  <th scope="col" className="px-5 py-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {list.data.items.map((a) => (
                  <tr key={a.id} className="cursor-pointer hover:bg-ink-50/60" onClick={() => setOpenId(a.id)}>
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-ink-900">{a.patient_name}</p>
                      <p className="flex items-center gap-1.5 text-xs whitespace-nowrap text-ink-500">
                        <span className="font-mono font-semibold text-ink-700">{a.reference}</span>
                        {a.source === 'chatbot' ? (
                          <Bot className="size-3.5 shrink-0" aria-label="Booked in AI chat" />
                        ) : (
                          <Globe className="size-3.5 shrink-0" aria-label="Booked on website" />
                        )}
                      </p>
                      <p className="text-xs whitespace-nowrap text-ink-500">{a.patient_phone}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-ink-800">{a.doctor.full_name}</p>
                      <p className="text-xs text-ink-500">{DEPARTMENT_LABELS[a.department]}</p>
                    </td>
                    <td className="px-5 py-3.5 tabular-nums">
                      <p className="font-medium text-ink-800">{formatDate(a.appointment_date, { weekday: 'short', day: 'numeric', month: 'short' })}</p>
                      <p className="text-xs text-ink-500">{formatTime(a.start_time)}</p>
                    </td>
                    <td className="px-5 py-3.5"><StatusBadge status={a.status} /></td>
                    <td className="px-5 py-3.5"><EmailState email={a.last_email} /></td>
                    <td className="px-5 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        {a.status === 'pending' && (
                          <>
                            <Button size="sm" loading={busyId === a.id} icon={<Check className="size-3.5" />} onClick={() => void confirm(a)}>
                              Confirm
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setCancelling(a)}>
                              Cancel
                            </Button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => setOpenId(a.id)}
                          className="grid size-8 place-items-center rounded-lg text-ink-400 hover:bg-ink-100 hover:text-ink-800"
                          aria-label={`Open ${a.reference}`}
                        >
                          <ChevronRight className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {list.data.pages > 1 && (
            <div className="border-t border-ink-100 p-4">
              <Pagination page={page} pages={list.data.pages} onChange={setPage} />
            </div>
          )}
        </Card>
      )}

      {openId !== null && <AppointmentModal id={openId} onClose={() => setOpenId(null)} onChanged={list.reload} />}
      {cancelling && (
        <CancelDialog
          appointment={cancelling}
          onClose={() => setCancelling(null)}
          onDone={() => {
            setCancelling(null)
            list.reload()
          }}
        />
      )}
    </>
  )
}

function CancelDialog({ appointment, onClose, onDone }: { appointment: Appointment; onClose: () => void; onDone: (detail: AppointmentDetail) => void }) {
  const toast = useToast()
  const [reason, setReason] = useState('')
  const [notify, setNotify] = useState(true)
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    setSaving(true)
    try {
      const detail = await adminApi.setAppointmentStatus(appointment.id, { status: 'cancelled', reason, notify })
      emailToast(detail, toast, `${appointment.reference} cancelled`)
      onDone(detail)
    } catch (err) {
      toast.error('Could not cancel', toApiError(err).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      onClose={() => !saving && onClose()}
      title={`Cancel ${appointment.reference}?`}
      description={`${appointment.patient_name} · ${formatDate(appointment.appointment_date)} at ${formatTime(appointment.start_time)} with ${appointment.doctor.full_name}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Keep booking
          </Button>
          <Button variant="danger" loading={saving} disabled={!reason.trim()} icon={<Ban className="size-4" />} onClick={() => void submit()}>
            Cancel appointment
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <p className="mb-2 text-sm font-semibold text-ink-800">Reason (shown to the patient)</p>
          <div className="flex flex-wrap gap-2">
            {CANCEL_REASONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setReason(r)}
                aria-pressed={reason === r}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                  reason === r ? 'border-red-300 bg-red-50 text-red-800' : 'border-ink-200 text-ink-700 hover:border-ink-300',
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
        <Field label="Or write your own" hint="Keep it short and polite; the email adds an apology and a one-click link to pick a new time.">
          {(a) => <Textarea {...a} rows={2} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />}
        </Field>
        <label className="flex items-center gap-2 text-sm text-ink-800">
          <input type="checkbox" className="size-4 accent-brand-700" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
          Email the patient with the reason and a reschedule link
        </label>
      </div>
    </Modal>
  )
}

function AppointmentModal({ id, onClose, onChanged }: { id: number; onClose: () => void; onChanged: () => void }) {
  const toast = useToast()
  const { user } = useAuth()
  const detail = useApi(`admin:appointment:${id}`, () => adminApi.appointment(id), { cache: false })
  const [notes, setNotes] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [rescheduleOpen, setRescheduleOpen] = useState(false)

  const run = async (key: string, action: () => Promise<AppointmentDetail>, label: string, withEmail = true) => {
    setBusy(key)
    try {
      const updated = await action()
      if (withEmail) emailToast(updated, toast, label)
      else toast.success(label)
      detail.reload()
      onChanged()
    } catch (err) {
      toast.error('Action failed', toApiError(err).message)
    } finally {
      setBusy(null)
    }
  }

  const a = detail.data
  return (
    <Modal open onClose={onClose} title={a ? `Appointment ${a.reference}` : 'Appointment'} size="lg">
      {!a ? (
        detail.error ? <ErrorState message={detail.error.message} onRetry={detail.reload} /> : <Skeleton className="h-80" />
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={a.status} />
            <Badge tone="neutral">{a.source === 'chatbot' ? 'Booked in AI chat' : a.source === 'admin' ? 'Front desk' : 'Website'}</Badge>
            <span className="text-xs text-ink-500">Requested {formatDateTime(a.created_at)}</span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-ink-100 p-4">
              <p className="text-xs font-semibold tracking-wide text-ink-500 uppercase">Patient</p>
              <p className="mt-1 font-semibold text-ink-900">{a.patient_name}</p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <a href={`tel:${a.patient_phone.replace(/\s/g, '')}`} className="inline-flex items-center gap-1 rounded-lg bg-ink-50 px-2 py-1 font-medium text-ink-700 hover:bg-ink-100">
                  <Phone className="size-3.5" aria-hidden="true" /> {a.patient_phone}
                </a>
                <a
                  href={`https://wa.me/${a.patient_phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hello ${a.patient_name.split(' ')[0]}, this is Cedarline Clinic about your appointment ${a.reference}.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 font-medium text-emerald-800 hover:bg-emerald-100"
                >
                  <WhatsAppIcon className="size-3.5" /> WhatsApp
                </a>
                <a href={`mailto:${a.patient_email}`} className="inline-flex items-center gap-1 rounded-lg bg-ink-50 px-2 py-1 font-medium text-ink-700 hover:bg-ink-100">
                  <Mail className="size-3.5" aria-hidden="true" /> {a.patient_email}
                </a>
              </div>
            </div>
            <div className="flex gap-3 rounded-2xl border border-ink-100 p-4">
              <DoctorPhoto doctor={a.doctor} className="size-14 shrink-0 rounded-xl text-base" />
              <div>
                <p className="text-xs font-semibold tracking-wide text-ink-500 uppercase">Visit</p>
                <p className="font-semibold text-ink-900">{a.doctor.full_name}</p>
                <p className="text-sm text-ink-600">{formatLongDate(a.appointment_date)}</p>
                <p className="text-sm text-ink-600">
                  {formatTime(a.start_time)} – {formatTime(a.end_time)} · {formatPrice(a.consultation_fee) ?? 'fee at desk'}
                </p>
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold tracking-wide text-ink-500 uppercase">Reason / symptoms (from the patient)</p>
            <p className="mt-1 rounded-xl bg-ink-50 p-3 text-sm whitespace-pre-wrap text-ink-800">{a.reason}</p>
            {a.cancellation_reason && (
              <p className="mt-2 flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-900">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> Cancelled: {a.cancellation_reason}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2 border-y border-ink-100 py-4">
            {a.status === 'pending' && (
              <Button loading={busy === 'confirm'} icon={<Check className="size-4" />} onClick={() => void run('confirm', () => adminApi.setAppointmentStatus(a.id, { status: 'confirmed' }), 'Confirmed')}>
                Confirm & email patient
              </Button>
            )}
            {a.status === 'confirmed' && (
              <Button loading={busy === 'complete'} icon={<CheckCheck className="size-4" />} onClick={() => void run('complete', () => adminApi.setAppointmentStatus(a.id, { status: 'completed' }), 'Marked completed', false)}>
                Mark completed
              </Button>
            )}
            {(a.status === 'pending' || a.status === 'confirmed') && (
              <>
                <Button variant="outline" icon={<CalendarClock className="size-4" />} onClick={() => setRescheduleOpen((v) => !v)}>
                  Reschedule
                </Button>
                <Button variant="outline" icon={<Ban className="size-4" />} onClick={() => setCancelOpen(true)}>
                  Cancel…
                </Button>
              </>
            )}
            {(a.status === 'confirmed' || a.status === 'completed') && (
              <Button variant="ghost" loading={busy === 'resend-c'} icon={<Send className="size-4" />} onClick={() => void run('resend-c', () => adminApi.resendAppointmentEmail(a.id, 'confirmation'), 'Confirmation re-sent')}>
                Resend confirmation
              </Button>
            )}
            {a.status === 'cancelled' && (
              <Button variant="ghost" loading={busy === 'resend-x'} icon={<Send className="size-4" />} onClick={() => void run('resend-x', () => adminApi.resendAppointmentEmail(a.id, 'cancellation'), 'Cancellation notice re-sent')}>
                Resend cancellation notice
              </Button>
            )}
          </div>

          {rescheduleOpen && (
            <Reschedule
              appointment={a}
              onSaved={(updated) => {
                setRescheduleOpen(false)
                emailToast(updated, toast, `Moved to ${formatDate(updated.appointment_date)} ${formatTime(updated.start_time)}`)
                detail.reload()
                onChanged()
              }}
            />
          )}

          <Field label="Staff notes" hint="Only visible to clinic staff.">
            {(p) => <Textarea {...p} rows={2} maxLength={2000} value={notes ?? a.admin_notes ?? ''} onChange={(e) => setNotes(e.target.value)} />}
          </Field>
          {notes !== null && notes !== (a.admin_notes ?? '') && (
            <Button size="sm" loading={busy === 'notes'} onClick={() => void run('notes', () => adminApi.updateAppointment(a.id, { admin_notes: notes }), 'Notes saved', false).then(() => setNotes(null))}>
              Save notes
            </Button>
          )}

          <div>
            <p className="text-xs font-semibold tracking-wide text-ink-500 uppercase">Email log</p>
            {a.emails.length === 0 ? (
              <p className="mt-2 text-sm text-ink-500">No emails yet.</p>
            ) : (
              <ul className="mt-2 divide-y divide-ink-100 rounded-xl border border-ink-100">
                {a.emails.map((e) => (
                  <li key={e.id} className="flex flex-wrap items-start justify-between gap-2 p-3 text-sm">
                    <div className="min-w-0">
                      <EmailState email={e} />
                      <p className="truncate text-ink-700">{e.subject}</p>
                      {e.error && <p className="text-xs text-red-700">{e.error}</p>}
                      {e.message_id && <p className="truncate font-mono text-[0.6875rem] text-ink-400">{e.message_id}</p>}
                    </div>
                    <span className="shrink-0 text-xs text-ink-500">{formatDateTime(e.created_at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {user?.role === 'admin' && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`Permanently delete ${a.reference}? This can't be undone.`))
                  void adminApi.deleteAppointment(a.id).then(() => {
                    toast.success('Appointment deleted', a.reference)
                    onChanged()
                    onClose()
                  }, (err) => toast.error('Could not delete', toApiError(err).message))
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-400 hover:text-red-700"
            >
              <Trash2 className="size-3.5" aria-hidden="true" /> Delete record
            </button>
          )}
        </div>
      )}
      {cancelOpen && a && (
        <CancelDialog
          appointment={a}
          onClose={() => setCancelOpen(false)}
          onDone={() => {
            setCancelOpen(false)
            detail.reload()
            onChanged()
          }}
        />
      )}
    </Modal>
  )
}

function Reschedule({ appointment, onSaved }: { appointment: AppointmentDetail; onSaved: (a: AppointmentDetail) => void }) {
  const toast = useToast()
  const [date, setDate] = useState(appointment.appointment_date)
  const [slot, setSlot] = useState<MergedSlot | null>(null)
  const [notify, setNotify] = useState(true)
  const [saving, setSaving] = useState(false)
  const availability = useAvailability(date, appointment.department, appointment.doctor.slug)

  const save = async () => {
    if (!slot) return
    setSaving(true)
    try {
      onSaved(await adminApi.updateAppointment(appointment.id, { appointment_date: date, start_time: slot.start.slice(0, 5), notify }))
    } catch (err) {
      toast.error('Could not reschedule', toApiError(err).message)
      availability.reload()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-2xl border border-brand-200 bg-brand-50/30 p-4">
      <p className="text-sm font-semibold text-ink-900">Move to another slot with {appointment.doctor.full_name}</p>
      <div className="mt-3 max-w-xs">
        <Input
          type="date"
          aria-label="New date"
          min={clinicToday()}
          value={date}
          onChange={(e) => {
            setDate(e.target.value)
            setSlot(null)
          }}
        />
      </div>
      <SlotPicker slots={availability.slots} loading={availability.loading} selected={slot} onSelect={setSlot} />
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm text-ink-800">
          <input type="checkbox" className="size-4 accent-brand-700" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
          Email the updated time (confirmed bookings)
        </label>
        <Button size="sm" disabled={!slot} loading={saving} onClick={() => void save()}>
          Save new time
        </Button>
      </div>
    </div>
  )
}
