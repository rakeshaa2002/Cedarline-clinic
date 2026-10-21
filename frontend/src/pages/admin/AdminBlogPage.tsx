import { Eye, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ImageUpload } from '@/components/admin/ImageUpload'
import { Markdown } from '@/components/site/Markdown'
import { Button } from '@/components/ui/Button'
import { Alert, EmptyState, ErrorState, PageLoader } from '@/components/ui/Feedback'
import { Field, Input, Select, Textarea } from '@/components/ui/Form'
import { Badge, Card } from '@/components/ui/Layout'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { invalidate, useApi } from '@/hooks/useApi'
import { useAuth } from '@/hooks/useAuth'
import { useDoctors } from '@/hooks/useClinic'
import { AdminPageHeader } from '@/layouts/AdminLayout'
import { assetUrl, toApiError, type ApiError } from '@/services/api'
import { adminApi, type BlogPostInput } from '@/services/endpoints'
import type { BlogPostAdmin } from '@/types'
import { cn, formatDate } from '@/utils/format'

const EMPTY: BlogPostInput = {
  slug: '',
  title: '',
  excerpt: '',
  content: '## First heading\n\nWrite the article here. Separate paragraphs with a blank line.\n\n- Bullet points start with a dash\n- **Bold** and *italic* work too',
  category: 'General',
  cover_image: null,
  reading_minutes: null,
  author_id: null,
  is_published: false,
  published_at: null,
}

const slugify = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)

const toInput = (p: BlogPostAdmin): BlogPostInput => ({
  title: p.title,
  excerpt: p.excerpt,
  content: p.content,
  category: p.category,
  cover_image: p.cover_image,
  reading_minutes: p.reading_minutes,
  author_id: p.author_id,
  is_published: p.is_published,
  published_at: p.published_at,
})

export default function AdminBlogPage() {
  const { user } = useAuth()
  const posts = useApi('admin:blog', adminApi.posts, { cache: false })
  const toast = useToast()
  const [editing, setEditing] = useState<{ id: number | null; values: BlogPostInput } | null>(null)
  const isAdmin = user?.role === 'admin'

  if (posts.loading && !posts.data) return <PageLoader />
  if (posts.error) return <ErrorState message={posts.error.message} onRetry={posts.reload} />

  const remove = async (p: BlogPostAdmin) => {
    if (!window.confirm(`Delete "${p.title}"? This can't be undone.`)) return
    try {
      await adminApi.deletePost(p.id)
      invalidate('blog')
      toast.success('Article deleted', p.title)
      posts.reload()
    } catch (err) {
      toast.error('Could not delete', toApiError(err).message)
    }
  }

  return (
    <>
      <AdminPageHeader
        title="Blog"
        description="Patient education articles. Published articles appear on the website and are taught to the AI assistant."
        action={isAdmin && <Button icon={<Plus className="size-4" aria-hidden="true" />} onClick={() => setEditing({ id: null, values: EMPTY })}>New article</Button>}
      />
      {posts.data?.length === 0 ? (
        <EmptyState title="No articles yet" description="Write your first patient education article." />
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-ink-100">
            {posts.data?.map((p) => (
              <li key={p.id} className="flex items-center gap-4 px-5 py-4">
                <div className="hidden size-16 shrink-0 overflow-hidden rounded-xl bg-ink-100 sm:block">
                  {p.cover_image && <img src={assetUrl(p.cover_image)} alt="" className="size-full object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-ink-900">{p.title}</p>
                  <p className="text-xs text-ink-500">
                    {p.category} · {p.author?.full_name ?? 'Clinic team'} · {formatDate(p.published_at)} · {p.reading_minutes} min read
                  </p>
                </div>
                {p.is_published ? <Badge tone="success">Published</Badge> : <Badge tone="warning">Draft</Badge>}
                <div className="flex items-center gap-1">
                  {p.is_published && (
                    <Link to={`/blog/${p.slug}`} target="_blank" className="grid size-8 place-items-center rounded-lg text-ink-500 hover:bg-ink-100" aria-label={`View ${p.title}`}>
                      <Eye className="size-4" />
                    </Link>
                  )}
                  {isAdmin && (
                    <>
                      <button type="button" onClick={() => setEditing({ id: p.id, values: toInput(p) })} className="grid size-8 place-items-center rounded-lg text-ink-500 hover:bg-ink-100" aria-label={`Edit ${p.title}`}>
                        <Pencil className="size-4" />
                      </button>
                      <button type="button" onClick={() => void remove(p)} className="grid size-8 place-items-center rounded-lg text-ink-400 hover:bg-red-50 hover:text-red-600" aria-label={`Delete ${p.title}`}>
                        <Trash2 className="size-4" />
                      </button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
      {editing && (
        <PostEditor
          id={editing.id}
          initial={editing.values}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            invalidate('blog')
            posts.reload()
          }}
        />
      )}
    </>
  )
}

function PostEditor({ id, initial, onClose, onSaved }: { id: number | null; initial: BlogPostInput; onClose: () => void; onSaved: () => void }) {
  const toast = useToast()
  const doctors = useDoctors()
  const [v, setV] = useState<BlogPostInput>(initial)
  const [slugTouched, setSlugTouched] = useState(Boolean(id))
  const [preview, setPreview] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const set = <K extends keyof BlogPostInput>(k: K, value: BlogPostInput[K]) => setV((prev) => ({ ...prev, [k]: value }))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setErrors({})
    setFormError(null)
    try {
      if (id) await adminApi.updatePost(id, v)
      else await adminApi.createPost(v)
      toast.success(id ? 'Article updated' : 'Article created', v.is_published ? 'It is live and the chatbot is learning it.' : 'Saved as a draft.')
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
      title={id ? 'Edit article' : 'New article'}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="post-form" loading={saving}>{v.is_published ? 'Publish' : 'Save draft'}</Button>
        </>
      }
    >
      <form id="post-form" onSubmit={submit} noValidate className="grid gap-5 sm:grid-cols-2">
        {formError && <Alert tone="error" className="sm:col-span-2">{formError}</Alert>}
        <Field label="Title" required error={errors.title} className="sm:col-span-2">
          {(a) => (
            <Input
              {...a}
              value={v.title}
              onChange={(e) => {
                set('title', e.target.value)
                if (!slugTouched) set('slug', slugify(e.target.value))
              }}
            />
          )}
        </Field>
        {!id && (
          <Field label="URL slug" required error={errors.slug} hint={`/blog/${v.slug || '…'}`}>
            {(a) => (
              <Input
                {...a}
                value={v.slug}
                onChange={(e) => {
                  setSlugTouched(true)
                  set('slug', slugify(e.target.value))
                }}
              />
            )}
          </Field>
        )}
        <Field label="Category" required error={errors.category} hint="e.g. Dental, Skin, Hair, Family health">
          {(a) => <Input {...a} value={v.category} onChange={(e) => set('category', e.target.value)} />}
        </Field>
        <Field label="Author" error={errors.author_id}>
          {(a) => (
            <Select {...a} value={v.author_id ?? ''} onChange={(e) => set('author_id', e.target.value ? Number(e.target.value) : null)}>
              <option value="">Clinic team</option>
              {doctors.data?.map((d) => <option key={d.id} value={d.id}>{d.full_name}</option>)}
            </Select>
          )}
        </Field>
        <Field label="Publish date" error={errors.published_at} hint="Leave empty for today">
          {(a) => <Input {...a} type="date" value={v.published_at ?? ''} onChange={(e) => set('published_at', e.target.value || null)} />}
        </Field>
        <Field label="Excerpt" required error={errors.excerpt} className="sm:col-span-2" hint="One or two sentences for cards and search results.">
          {(a) => <Textarea {...a} rows={2} maxLength={400} value={v.excerpt} onChange={(e) => set('excerpt', e.target.value)} />}
        </Field>
        <div className="sm:col-span-2">
          <ImageUpload label="Cover image" value={v.cover_image} onChange={(url) => set('cover_image', url)} aspect="aspect-[16/10]" />
        </div>
        <div className="sm:col-span-2">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-sm font-semibold text-ink-800">Article</span>
            <div className="flex rounded-lg bg-ink-100 p-0.5 text-xs font-semibold" role="tablist" aria-label="Editor mode">
              {(['Write', 'Preview'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  role="tab"
                  aria-selected={preview === (mode === 'Preview')}
                  onClick={() => setPreview(mode === 'Preview')}
                  className={cn('rounded-md px-3 py-1', preview === (mode === 'Preview') ? 'bg-white text-ink-900 shadow-xs' : 'text-ink-500')}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
          {preview ? (
            <div className="max-h-96 overflow-y-auto rounded-xl border border-ink-100 p-5">
              <Markdown content={v.content} />
            </div>
          ) : (
            <Textarea
              aria-label="Article content (Markdown)"
              rows={14}
              value={v.content}
              onChange={(e) => set('content', e.target.value)}
              className="font-mono text-sm"
            />
          )}
          <p className="mt-1 text-xs text-ink-500">
            Markdown: <code>## Heading</code>, <code>- list</code>, <code>1. steps</code>, <code>**bold**</code>, <code>*italic*</code>, <code>[link](https://…)</code>. Keep it educational: no diagnoses or dosages.
          </p>
          {errors.content && <p className="mt-1 text-sm text-red-700">{errors.content}</p>}
        </div>
        <label className="flex items-center gap-3 text-sm font-medium text-ink-800 sm:col-span-2">
          <input type="checkbox" className="size-4 accent-brand-700" checked={v.is_published} onChange={(e) => set('is_published', e.target.checked)} />
          Published — visible on the website and used by the AI assistant
        </label>
      </form>
    </Modal>
  )
}
