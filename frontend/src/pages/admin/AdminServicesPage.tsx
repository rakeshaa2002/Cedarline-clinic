import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { ServiceIcon } from '@/components/site/ServiceIcon'
import { Button } from '@/components/ui/Button'
import { Alert, ErrorState, PageLoader } from '@/components/ui/Feedback'
import { Field, Input, Select, Textarea } from '@/components/ui/Form'
import { Badge, Card } from '@/components/ui/Layout'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { invalidate, useApi } from '@/hooks/useApi'
import { AdminPageHeader } from '@/layouts/AdminLayout'
import type { ApiError } from '@/services/api'
import { adminApi, type ServiceInput } from '@/services/endpoints'
import type { Department, Service } from '@/types'
import { DEPARTMENT_LABELS, formatPrice } from '@/utils/format'

const EMPTY: ServiceInput = {
  slug: '',
  name: '',
  department: 'general',
  short_description: '',
  description: '',
  duration_minutes: 30,
  price_from: null,
  icon: 'stethoscope',
  is_active: true,
}

export default function AdminServicesPage() {
  const services = useApi('admin:services', adminApi.services)
  const toast = useToast()
  const [editing, setEditing] = useState<{ id: number | null; values: ServiceInput } | null>(null)
  const [deleting, setDeleting] = useState<Service | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  if (services.loading) return <PageLoader />
  if (services.error) return <ErrorState message={services.error.message} onRetry={services.reload} />

  return (
    <>
      <AdminPageHeader
        title="Services"
        description="Treatments shown on the website and available for booking."
        action={<Button icon={<Plus className="size-4" aria-hidden="true" />} onClick={() => setEditing({ id: null, values: EMPTY })}>Add service</Button>}
      />
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <caption className="sr-only">Clinic services</caption>
            <thead className="border-b border-ink-100 bg-ink-50/80 text-xs tracking-wide text-ink-500 uppercase">
              <tr>
                <th scope="col" className="px-5 py-3 font-semibold">Service</th>
                <th scope="col" className="px-5 py-3 font-semibold">Department</th>
                <th scope="col" className="px-5 py-3 font-semibold">Duration</th>
                <th scope="col" className="px-5 py-3 font-semibold">From</th>
                <th scope="col" className="px-5 py-3 font-semibold">Status</th>
                <th scope="col" className="px-5 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {services.data?.map((s) => (
                <tr key={s.id}>
                  <td className="px-5 py-3.5">
                    <span className="flex items-center gap-3 font-semibold text-ink-900">
                      <span className="grid size-9 place-items-center rounded-xl bg-brand-50 text-brand-700"><ServiceIcon name={s.icon} className="size-4.5" /></span>
                      {s.name}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-ink-600">{DEPARTMENT_LABELS[s.department]}</td>
                  <td className="px-5 py-3.5 text-ink-600 tabular-nums">{s.duration_minutes} min</td>
                  <td className="px-5 py-3.5 text-ink-900 tabular-nums">{formatPrice(s.price_from) ?? '—'}</td>
                  <td className="px-5 py-3.5">{s.is_active ? <Badge tone="success">Active</Badge> : <Badge tone="danger">Hidden</Badge>}</td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          const { id, ...values } = s
                          setEditing({ id, values })
                        }}
                        className="grid size-8 place-items-center rounded-lg text-ink-500 hover:bg-ink-100 hover:text-ink-800 transition-colors cursor-pointer"
                        aria-label={`Edit ${s.name}`}
                        title={`Edit ${s.name}`}
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleting(s)}
                        className="grid size-8 place-items-center rounded-lg text-ink-400 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer"
                        aria-label={`Delete ${s.name}`}
                        title={`Delete ${s.name}`}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      {editing && (
        <ServiceForm
          id={editing.id}
          initial={editing.values}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            invalidate('services:')
            services.reload()
          }}
        />
      )}
      {deleting && (
        <Modal
          open
          onClose={() => !isDeleting && setDeleting(null)}
          title="Delete Service"
          size="md"
          footer={
            <>
              <Button variant="outline" onClick={() => setDeleting(null)} disabled={isDeleting}>
                Cancel
              </Button>
              <Button
                variant="danger"
                loading={isDeleting}
                onClick={async () => {
                  setIsDeleting(true)
                  try {
                    await adminApi.deleteService(deleting.id)
                    toast.success('Service removed', `${deleting.name} was removed from the clinic services and AI knowledge base.`)
                    invalidate('services:')
                    setDeleting(null)
                    services.reload()
                  } catch (err) {
                    toast.error('Could not delete service', (err as ApiError).message)
                  } finally {
                    setIsDeleting(false)
                  }
                }}
              >
                Delete service
              </Button>
            </>
          }
        >
          <div className="space-y-3">
            <p className="text-sm text-ink-800">
              Are you sure you want to permanently delete <strong>{deleting.name}</strong>?
            </p>
            <p className="text-xs leading-relaxed text-ink-500">
              This will remove the treatment from the website directory and update the AI Chatbot's knowledge base.
            </p>
          </div>
        </Modal>
      )}
    </>
  )
}

function ServiceForm({ id, initial, onClose, onSaved }: { id: number | null; initial: ServiceInput; onClose: () => void; onSaved: () => void }) {
  const toast = useToast()
  const [v, setV] = useState<ServiceInput>(initial)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const set = <K extends keyof ServiceInput>(k: K, value: ServiceInput[K]) => setV((prev) => ({ ...prev, [k]: value }))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setErrors({})
    setFormError(null)
    try {
      const payload = { ...v, price_from: v.price_from === '' ? null : v.price_from }
      if (id) await adminApi.updateService(id, payload)
      else await adminApi.createService(payload)
      toast.success(id ? 'Service updated' : 'Service added', 'The chatbot knowledge base is refreshing in the background.')
      onSaved()
    } catch (err) {
      const apiErr = err as ApiError
      setErrors(apiErr.fieldErrors)
      setFormError(apiErr.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={id ? `Edit ${initial.name}` : 'Add service'}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="service-form" loading={saving}>Save service</Button>
        </>
      }
    >
      <form id="service-form" onSubmit={submit} noValidate className="grid gap-5 sm:grid-cols-2">
        {formError && <Alert tone="error" className="sm:col-span-2">{formError}</Alert>}
        <Field label="Name" required error={errors.name}>
          {(a) => <Input {...a} value={v.name} onChange={(e) => set('name', e.target.value)} />}
        </Field>
        {!id && (
          <Field label="URL slug" required error={errors.slug} hint="e.g. gum-treatment">
            {(a) => <Input {...a} value={v.slug} onChange={(e) => set('slug', e.target.value)} />}
          </Field>
        )}
        <Field label="Department" required error={errors.department}>
          {(a) => (
            <Select {...a} value={v.department} onChange={(e) => set('department', e.target.value as Department)}>
              {(Object.keys(DEPARTMENT_LABELS) as Department[]).map((d) => <option key={d} value={d}>{DEPARTMENT_LABELS[d]}</option>)}
            </Select>
          )}
        </Field>
        <Field label="Duration (minutes)" required error={errors.duration_minutes}>
          {(a) => <Input {...a} type="number" min={5} max={480} value={v.duration_minutes} onChange={(e) => set('duration_minutes', Number(e.target.value))} />}
        </Field>
        <Field label="Starting price (INR)" error={errors.price_from} hint="Leave empty if the price varies">
          {(a) => <Input {...a} type="number" min={0} value={v.price_from ?? ''} onChange={(e) => set('price_from', e.target.value === '' ? null : e.target.value)} />}
        </Field>
        <Field label="Short description" required error={errors.short_description} className="sm:col-span-2">
          {(a) => <Input {...a} maxLength={300} value={v.short_description} onChange={(e) => set('short_description', e.target.value)} />}
        </Field>
        <Field label="Full description" required error={errors.description} className="sm:col-span-2" hint="Used on the website and by the chatbot. Keep it factual; avoid medical claims.">
          {(a) => <Textarea {...a} rows={4} value={v.description} onChange={(e) => set('description', e.target.value)} />}
        </Field>
        <label className="flex items-center gap-3 text-sm font-medium text-ink-800 sm:col-span-2">
          <input type="checkbox" className="size-4 accent-brand-700" checked={v.is_active} onChange={(e) => set('is_active', e.target.checked)} />
          Active — shown on the website and bookable
        </label>
      </form>
    </Modal>
  )
}
