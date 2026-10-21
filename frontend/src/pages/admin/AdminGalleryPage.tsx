import { Pencil, Plus, ShieldCheck, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { ImageUpload } from '@/components/admin/ImageUpload'
import { BeforeAfterSlider } from '@/components/site/BeforeAfter'
import { Button } from '@/components/ui/Button'
import { Alert, EmptyState, ErrorState, PageLoader } from '@/components/ui/Feedback'
import { Field, Input, Select, Textarea } from '@/components/ui/Form'
import { Badge, Card } from '@/components/ui/Layout'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { invalidate, useApi } from '@/hooks/useApi'
import { AdminPageHeader } from '@/layouts/AdminLayout'
import { toApiError, type ApiError } from '@/services/api'
import { adminApi, type TransformationInput } from '@/services/endpoints'
import type { Department, TransformationAdmin } from '@/types'
import { DEPARTMENT_LABELS } from '@/utils/format'

const EMPTY: TransformationInput = {
  department: 'dental',
  title: '',
  description: '',
  before_image: '',
  after_image: '',
  patient_consent: false,
  is_published: false,
  sort_order: 0,
}

export default function AdminGalleryPage() {
  const cases = useApi('admin:transformations', adminApi.transformations, { cache: false })
  const toast = useToast()
  const [editing, setEditing] = useState<{ id: number | null; values: TransformationInput } | null>(null)

  if (cases.loading && !cases.data) return <PageLoader />
  if (cases.error) return <ErrorState message={cases.error.message} onRetry={cases.reload} />

  const remove = async (c: TransformationAdmin) => {
    if (!window.confirm(`Delete "${c.title}"?`)) return
    try {
      await adminApi.deleteTransformation(c.id)
      invalidate('transformations:')
      toast.success('Case deleted', c.title)
      cases.reload()
    } catch (err) {
      toast.error('Could not delete', toApiError(err).message)
    }
  }

  return (
    <>
      <AdminPageHeader
        title="Before & after"
        description="Treatment results shown on the Dental, Skin and Hair pages. Publish only with the patient's written consent."
        action={<Button icon={<Plus className="size-4" aria-hidden="true" />} onClick={() => setEditing({ id: null, values: EMPTY })}>Add case</Button>}
      />
      {cases.data?.length === 0 ? (
        <EmptyState
          title="No cases yet"
          description="Add real, consented before/after photos. The section stays hidden on the website until at least one case is published."
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {cases.data?.map((c) => (
            <Card key={c.id} className="overflow-hidden p-3">
              <BeforeAfterSlider before={c.before_image} after={c.after_image} label={c.title} />
              <div className="flex items-start gap-2 px-1 pt-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-ink-900">{c.title}</p>
                  <p className="text-xs text-ink-500">{DEPARTMENT_LABELS[c.department]}</p>
                </div>
                {c.is_published ? <Badge tone="success">Published</Badge> : <Badge tone="neutral">Hidden</Badge>}
              </div>
              <div className="mt-2 flex justify-end gap-1">
                <button type="button" onClick={() => { const { id, ...values } = c; setEditing({ id, values }) }} className="grid size-8 place-items-center rounded-lg text-ink-500 hover:bg-ink-100" aria-label={`Edit ${c.title}`}>
                  <Pencil className="size-4" />
                </button>
                <button type="button" onClick={() => void remove(c)} className="grid size-8 place-items-center rounded-lg text-ink-400 hover:bg-red-50 hover:text-red-600" aria-label={`Delete ${c.title}`}>
                  <Trash2 className="size-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
      {editing && (
        <CaseEditor
          id={editing.id}
          initial={editing.values}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            invalidate('transformations:')
            cases.reload()
          }}
        />
      )}
    </>
  )
}

function CaseEditor({ id, initial, onClose, onSaved }: { id: number | null; initial: TransformationInput; onClose: () => void; onSaved: () => void }) {
  const toast = useToast()
  const [v, setV] = useState<TransformationInput>(initial)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const set = <K extends keyof TransformationInput>(k: K, value: TransformationInput[K]) => setV((prev) => ({ ...prev, [k]: value }))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setErrors({})
    setFormError(null)
    try {
      if (id) await adminApi.updateTransformation(id, v)
      else await adminApi.createTransformation(v)
      toast.success(id ? 'Case updated' : 'Case added', v.is_published ? 'It is now on the website.' : 'Saved but not published.')
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
      title={id ? 'Edit case' : 'Add before & after case'}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="case-form" loading={saving} disabled={!v.before_image || !v.after_image}>Save case</Button>
        </>
      }
    >
      <form id="case-form" onSubmit={submit} noValidate className="grid gap-5 sm:grid-cols-2">
        {formError && <Alert tone="error" className="sm:col-span-2">{formError}</Alert>}
        <Field label="Title" required error={errors.title}>
          {(a) => <Input {...a} value={v.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Clear aligners, 9 months" />}
        </Field>
        <Field label="Department" required error={errors.department}>
          {(a) => (
            <Select {...a} value={v.department} onChange={(e) => set('department', e.target.value as Department)}>
              {(Object.keys(DEPARTMENT_LABELS) as Department[]).map((d) => <option key={d} value={d}>{DEPARTMENT_LABELS[d]}</option>)}
            </Select>
          )}
        </Field>
        <ImageUpload label="Before" value={v.before_image || null} onChange={(url) => set('before_image', url ?? '')} />
        <ImageUpload label="After" value={v.after_image || null} onChange={(url) => set('after_image', url ?? '')} />
        {v.before_image && v.after_image && (
          <div className="sm:col-span-2">
            <p className="mb-1.5 text-sm font-semibold text-ink-800">Preview</p>
            <div className="max-w-md">
              <BeforeAfterSlider before={v.before_image} after={v.after_image} label={v.title || 'Preview'} />
            </div>
          </div>
        )}
        <Field label="Description" error={errors.description} className="sm:col-span-2" hint="What was done and over what time. Avoid promises about results.">
          {(a) => <Textarea {...a} rows={2} maxLength={1000} value={v.description} onChange={(e) => set('description', e.target.value)} />}
        </Field>
        <Field label="Order" error={errors.sort_order} hint="Lower numbers show first">
          {(a) => <Input {...a} type="number" value={v.sort_order} onChange={(e) => set('sort_order', Number(e.target.value))} />}
        </Field>
        <div className="space-y-3 sm:col-span-2">
          <label className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
            <input type="checkbox" className="mt-0.5 size-4 accent-brand-700" checked={v.patient_consent} onChange={(e) => {
              set('patient_consent', e.target.checked)
              if (!e.target.checked) set('is_published', false)
            }} />
            <span>
              <ShieldCheck className="mr-1 inline size-4" aria-hidden="true" />
              The patient has given <strong>written consent</strong> for these photos to be published, and they are unretouched.
            </span>
          </label>
          <label className="flex items-center gap-3 text-sm font-medium text-ink-800">
            <input type="checkbox" className="size-4 accent-brand-700" disabled={!v.patient_consent} checked={v.is_published} onChange={(e) => set('is_published', e.target.checked)} />
            Published on the {DEPARTMENT_LABELS[v.department]} page
          </label>
        </div>
      </form>
    </Modal>
  )
}
