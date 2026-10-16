import { Pencil, Plus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { DoctorPhoto } from '@/components/site/Cards'
import { Button } from '@/components/ui/Button'
import { Alert, ErrorState, PageLoader } from '@/components/ui/Feedback'
import { Field, Input, Select, Textarea } from '@/components/ui/Form'
import { Badge, Card } from '@/components/ui/Layout'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { invalidate, useApi } from '@/hooks/useApi'
import { AdminPageHeader } from '@/layouts/AdminLayout'
import type { ApiError } from '@/services/api'
import { adminApi, type DoctorInput } from '@/services/endpoints'
import type { Department, Doctor } from '@/types'
import { DEPARTMENT_LABELS, WEEKDAYS_SHORT, cn, consultationDaysLabel, formatTime } from '@/utils/format'

const EMPTY: DoctorInput = {
  slug: '',
  full_name: '',
  department: 'general',
  specialization: '',
  qualifications: '',
  experience_years: 0,
  bio: '',
  languages: ['English'],
  photo_url: null,
  consultation_days: [0, 1, 2, 3, 4],
  start_time: '09:00:00',
  end_time: '13:00:00',
  slot_minutes: 30,
  is_active: true,
}

export default function AdminDoctorsPage() {
  const doctors = useApi('admin:doctors', adminApi.doctors)
  const [editing, setEditing] = useState<{ id: number | null; values: DoctorInput } | null>(null)

  if (doctors.loading) return <PageLoader />
  if (doctors.error) return <ErrorState message={doctors.error.message} onRetry={doctors.reload} />

  return (
    <>
      <AdminPageHeader
        title="Doctors"
        description="Profiles and weekly schedules. Changes update the website, booking slots and the chatbot's knowledge."
        action={
          <Button icon={<Plus className="size-4" aria-hidden="true" />} onClick={() => setEditing({ id: null, values: EMPTY })}>
            Add doctor
          </Button>
        }
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {doctors.data?.map((d) => (
          <Card key={d.id} className="flex gap-4 p-5">
            <DoctorPhoto doctor={d} className="size-16 shrink-0 rounded-2xl" />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-ink-900">{d.full_name}</p>
                  <p className="text-sm text-ink-500">{d.specialization}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const { id, ...values } = d
                    setEditing({ id, values })
                  }}
                  className="grid size-8 place-items-center rounded-lg text-ink-500 hover:bg-ink-100 hover:text-ink-800"
                  aria-label={`Edit ${d.full_name}`}
                >
                  <Pencil className="size-4" />
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Badge tone="brand">{DEPARTMENT_LABELS[d.department]}</Badge>
                {!d.is_active && <Badge tone="danger">Inactive</Badge>}
              </div>
              <p className="mt-2 text-xs text-ink-500">
                {consultationDaysLabel(d.consultation_days)} · {formatTime(d.start_time)}–{formatTime(d.end_time)} · {d.slot_minutes}-min consults
              </p>
            </div>
          </Card>
        ))}
      </div>
      {editing && (
        <DoctorForm
          id={editing.id}
          initial={editing.values}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            invalidate('doctors:')
            doctors.reload()
          }}
        />
      )}
    </>
  )
}

function DoctorForm({ id, initial, onClose, onSaved }: { id: number | null; initial: DoctorInput; onClose: () => void; onSaved: (d: Doctor) => void }) {
  const toast = useToast()
  const [v, setV] = useState<DoctorInput>(initial)
  const [languages, setLanguages] = useState(initial.languages.join(', '))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const set = <K extends keyof DoctorInput>(k: K, value: DoctorInput[K]) => setV((prev) => ({ ...prev, [k]: value }))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setErrors({})
    setFormError(null)
    const payload: DoctorInput = {
      ...v,
      languages: languages.split(',').map((l) => l.trim()).filter(Boolean),
      start_time: v.start_time.length === 5 ? `${v.start_time}:00` : v.start_time,
      end_time: v.end_time.length === 5 ? `${v.end_time}:00` : v.end_time,
      photo_url: v.photo_url || null,
    }
    try {
      const saved = id ? await adminApi.updateDoctor(id, payload) : await adminApi.createDoctor(payload)
      toast.success(id ? 'Doctor updated' : 'Doctor added', 'The chatbot knowledge base is refreshing in the background.')
      onSaved(saved)
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
      title={id ? `Edit ${initial.full_name}` : 'Add doctor'}
      size="xl"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="doctor-form" loading={saving}>Save doctor</Button>
        </>
      }
    >
      <form id="doctor-form" onSubmit={submit} noValidate className="grid gap-5 sm:grid-cols-2">
        {formError && <Alert tone="error" className="sm:col-span-2">{formError}</Alert>}
        <Field label="Full name" required error={errors.full_name}>
          {(a) => <Input {...a} value={v.full_name} onChange={(e) => set('full_name', e.target.value)} />}
        </Field>
        <Field label="Department" required error={errors.department}>
          {(a) => (
            <Select {...a} value={v.department} onChange={(e) => set('department', e.target.value as Department)}>
              {(Object.keys(DEPARTMENT_LABELS) as Department[]).map((d) => <option key={d} value={d}>{DEPARTMENT_LABELS[d]}</option>)}
            </Select>
          )}
        </Field>
        {!id && (
          <Field label="URL slug" required error={errors.slug} hint="Lowercase letters, numbers and hyphens, e.g. priya-sharma">
            {(a) => <Input {...a} value={v.slug} onChange={(e) => set('slug', e.target.value)} />}
          </Field>
        )}
        <Field label="Specialization" required error={errors.specialization}>
          {(a) => <Input {...a} value={v.specialization} onChange={(e) => set('specialization', e.target.value)} />}
        </Field>
        <Field label="Qualifications" required error={errors.qualifications}>
          {(a) => <Input {...a} value={v.qualifications} onChange={(e) => set('qualifications', e.target.value)} />}
        </Field>
        <Field label="Experience (years)" required error={errors.experience_years}>
          {(a) => <Input {...a} type="number" min={0} max={60} value={v.experience_years} onChange={(e) => set('experience_years', Number(e.target.value))} />}
        </Field>
        <Field label="Languages" required error={errors.languages} hint="Comma-separated">
          {(a) => <Input {...a} value={languages} onChange={(e) => setLanguages(e.target.value)} />}
        </Field>
        <Field label="Photo URL" error={errors.photo_url}>
          {(a) => <Input {...a} value={v.photo_url ?? ''} onChange={(e) => set('photo_url', e.target.value)} placeholder="/images/doctors/name.webp" />}
        </Field>
        <Field label="Biography" required error={errors.bio} className="sm:col-span-2">
          {(a) => <Textarea {...a} rows={3} value={v.bio} onChange={(e) => set('bio', e.target.value)} />}
        </Field>
        <fieldset className="sm:col-span-2">
          <legend className="mb-2 text-sm font-medium text-ink-800">Consultation days</legend>
          <div className="flex flex-wrap gap-2">
            {WEEKDAYS_SHORT.map((day, i) => {
              const on = v.consultation_days.includes(i)
              return (
                <label key={day} className={cn('cursor-pointer rounded-xl border px-3.5 py-2 text-sm font-semibold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand-500', on ? 'border-brand-700 bg-brand-700 text-white' : 'border-ink-200 text-ink-700')}>
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={on}
                    onChange={() => set('consultation_days', on ? v.consultation_days.filter((d) => d !== i) : [...v.consultation_days, i].sort())}
                  />
                  {day}
                </label>
              )
            })}
          </div>
          {errors.consultation_days && <p className="mt-1.5 text-sm text-red-600">{errors.consultation_days}</p>}
        </fieldset>
        <div className="grid grid-cols-3 gap-4 sm:col-span-2">
          <Field label="Start" required error={errors.start_time}>
            {(a) => <Input {...a} type="time" value={v.start_time.slice(0, 5)} onChange={(e) => set('start_time', e.target.value)} />}
          </Field>
          <Field label="End" required error={errors.end_time}>
            {(a) => <Input {...a} type="time" value={v.end_time.slice(0, 5)} onChange={(e) => set('end_time', e.target.value)} />}
          </Field>
          <Field label="Consult (min)" required error={errors.slot_minutes}>
            {(a) => <Input {...a} type="number" min={10} max={120} step={5} value={v.slot_minutes} onChange={(e) => set('slot_minutes', Number(e.target.value))} />}
          </Field>
        </div>
        <label className="flex items-center gap-3 text-sm font-medium text-ink-800 sm:col-span-2">
          <input type="checkbox" className="size-4 accent-brand-700" checked={v.is_active} onChange={(e) => set('is_active', e.target.checked)} />
          Active — visible on the website and bookable
        </label>
      </form>
    </Modal>
  )
}
