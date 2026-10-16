import { Database, FileText, RefreshCw, Trash2, Upload } from 'lucide-react'
import { useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Button } from '@/components/ui/Button'
import { Alert, ErrorState, PageLoader } from '@/components/ui/Feedback'
import { Field, Input } from '@/components/ui/Form'
import { Badge, Card } from '@/components/ui/Layout'
import { useToast } from '@/components/ui/Toast'
import { useApi } from '@/hooks/useApi'
import { AdminPageHeader } from '@/layouts/AdminLayout'
import type { ApiError } from '@/services/api'
import { adminApi, chatApi } from '@/services/endpoints'
import type { KnowledgeDocument } from '@/types'
import { formatDateTime } from '@/utils/format'

const MAX_BYTES = 5 * 1024 * 1024
const ACCEPT = '.pdf,.txt,.md'
const SOURCE_LABEL: Record<KnowledgeDocument['source_type'], { label: string; tone: 'brand' | 'neutral' | 'accent' }> = {
  system: { label: 'From clinic data', tone: 'neutral' },
  seed: { label: 'Approved FAQ', tone: 'brand' },
  upload: { label: 'Uploaded', tone: 'accent' },
}

export default function AdminKnowledgePage() {
  const docs = useApi('admin:knowledge', adminApi.documents, { cache: false })
  const health = useApi('chat:health', chatApi.health, { cache: false })
  const toast = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [fileError, setFileError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [reindexing, setReindexing] = useState(false)

  const pick = (f: File | undefined) => {
    setFileError(null)
    if (!f) return setFile(null)
    if (!/\.(pdf|txt|md)$/i.test(f.name)) return setFileError('Only PDF, TXT and MD files are supported.')
    if (f.size > MAX_BYTES) return setFileError('File is too large (max 5 MB).')
    setFile(f)
  }

  const upload = async (e: FormEvent) => {
    e.preventDefault()
    if (!file) return setFileError('Choose a file to upload.')
    setUploading(true)
    try {
      const doc = await adminApi.uploadDocument(file, title.trim() || undefined)
      toast.success('Document indexed', `${doc.title}: ${doc.chunk_count} chunks embedded.`)
      setFile(null)
      setTitle('')
      if (fileRef.current) fileRef.current.value = ''
      docs.reload()
      health.reload()
    } catch (err) {
      toast.error('Upload failed', (err as ApiError).message)
      docs.reload()
    } finally {
      setUploading(false)
    }
  }

  const remove = async (doc: KnowledgeDocument) => {
    if (!window.confirm(`Delete "${doc.title}" from the chatbot knowledge base?`)) return
    try {
      const res = await adminApi.deleteDocument(doc.id)
      toast.success('Document deleted', res.message)
      docs.reload()
      health.reload()
    } catch (err) {
      toast.error('Delete failed', (err as ApiError).message)
    }
  }

  const reindex = async () => {
    setReindexing(true)
    try {
      const res = await adminApi.reindex()
      toast.success('Re-index complete', `${res.documents} documents · ${res.chunks} chunks · ${res.embedding_model}`)
      docs.reload()
      health.reload()
    } catch (err) {
      toast.error('Re-index failed', (err as ApiError).message)
    } finally {
      setReindexing(false)
    }
  }

  return (
    <>
      <AdminPageHeader
        title="Chatbot knowledge base"
        description="The assistant answers only from these approved documents, retrieved with pgvector similarity search."
        action={
          <Button variant="outline" loading={reindexing} onClick={reindex} icon={<RefreshCw className="size-4" aria-hidden="true" />}>
            Re-index everything
          </Button>
        }
      />

      {health.data && (
        <Card className="mb-6 grid gap-4 p-5 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <HealthItem label="Status" value={<Badge tone={health.data.status === 'ok' ? 'success' : 'warning'}>{health.data.status === 'ok' ? 'Ready' : 'No indexed content'}</Badge>} />
          <HealthItem label="Embedding model" value={health.data.embedding_model} />
          <HealthItem label="Answer generation" value={health.data.llm_model ? `${health.data.llm_provider}` : 'Extractive (no LLM configured)'} />
          <HealthItem label="Indexed chunks · threshold" value={`${health.data.indexed_chunks} · ≥ ${health.data.similarity_threshold}`} />
        </Card>
      )}

      <div className="grid items-start gap-6 xl:grid-cols-[360px_1fr]">
        <Card className="p-6">
          <h2 className="flex items-center gap-2 font-bold">
            <Upload className="size-4 text-brand-600" aria-hidden="true" /> Upload a document
          </h2>
          <p className="mt-1 text-sm text-ink-500">PDF, TXT or Markdown, up to 5 MB. Text is extracted, chunked and embedded immediately.</p>
          <form onSubmit={upload} className="mt-5 space-y-4" noValidate>
            <Field label="File" required error={fileError ?? undefined}>
              {(a) => (
                <input
                  {...a}
                  ref={fileRef}
                  type="file"
                  accept={ACCEPT}
                  onChange={(e) => pick(e.target.files?.[0])}
                  className="block w-full text-sm text-ink-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-brand-700 hover:file:bg-brand-100"
                />
              )}
            </Field>
            <Field label="Title" hint="Defaults to the file name">
              {(a) => <Input {...a} maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} />}
            </Field>
            <Button type="submit" className="w-full" loading={uploading} disabled={!file}>
              Upload & index
            </Button>
          </form>
          <Alert tone="info" className="mt-5">
            Only upload approved, non-confidential clinic information. Never upload patient records.
          </Alert>
        </Card>

        <Card className="overflow-hidden">
          {docs.loading && !docs.data ? (
            <PageLoader />
          ) : docs.error ? (
            <div className="p-6"><ErrorState message={docs.error.message} onRetry={docs.reload} /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <caption className="sr-only">Knowledge documents</caption>
                <thead className="border-b border-ink-100 bg-ink-50/80 text-xs tracking-wide text-ink-500 uppercase">
                  <tr>
                    <th scope="col" className="px-5 py-3 font-semibold">Document</th>
                    <th scope="col" className="px-5 py-3 font-semibold">Source</th>
                    <th scope="col" className="px-5 py-3 font-semibold">Chunks</th>
                    <th scope="col" className="px-5 py-3 font-semibold">Updated</th>
                    <th scope="col" className="px-5 py-3"><span className="sr-only">Delete</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {docs.data?.map((d) => (
                    <tr key={d.id}>
                      <td className="px-5 py-3">
                        <span className="flex items-start gap-2.5">
                          <FileText className="mt-0.5 size-4 shrink-0 text-ink-400" aria-hidden="true" />
                          <span>
                            <span className="block font-medium text-ink-900">{d.title}</span>
                            {d.status !== 'ready' && <span className="block text-xs text-red-600">{d.status}: {d.error}</span>}
                          </span>
                        </span>
                      </td>
                      <td className="px-5 py-3"><Badge tone={SOURCE_LABEL[d.source_type].tone}>{SOURCE_LABEL[d.source_type].label}</Badge></td>
                      <td className="px-5 py-3 tabular-nums">{d.chunk_count}</td>
                      <td className="px-5 py-3 whitespace-nowrap text-ink-500">{formatDateTime(d.updated_at)}</td>
                      <td className="px-5 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => remove(d)}
                          className="grid size-8 place-items-center rounded-lg text-ink-400 hover:bg-red-50 hover:text-red-600"
                          aria-label={`Delete ${d.title}`}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="flex items-center gap-2 border-t border-ink-100 px-5 py-3 text-xs text-ink-500">
                <Database className="size-3.5" aria-hidden="true" /> "From clinic data" documents are regenerated automatically from doctors, services, hours and articles.
              </p>
            </div>
          )}
        </Card>
      </div>
    </>
  )
}

function HealthItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-xs text-ink-500">{label}</p>
      <div className="mt-1 font-medium break-words text-ink-900">{value}</div>
    </div>
  )
}
