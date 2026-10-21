import { ImagePlus, Trash2 } from 'lucide-react'
import { useId, useRef, useState } from 'react'
import { Spinner } from '@/components/ui/Feedback'
import { useToast } from '@/components/ui/Toast'
import { assetUrl, toApiError } from '@/services/api'
import { adminApi } from '@/services/endpoints'
import { cn } from '@/utils/format'

/**
 * Upload an image (to Cloudinary or the API's media store, decided server-side) and get back its URL.
 * The URL can also be typed in directly for images hosted elsewhere.
 */
export function ImageUpload({
  label,
  value,
  onChange,
  aspect = 'aspect-[4/3]',
  hint,
}: {
  label: string
  value: string | null
  onChange: (url: string | null) => void
  aspect?: string
  hint?: string
}) {
  const toast = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const urlId = useId()
  const [uploading, setUploading] = useState(false)

  const upload = async (file: File) => {
    setUploading(true)
    try {
      onChange(await adminApi.uploadImage(file))
    } catch (err) {
      toast.error('Upload failed', toApiError(err).message)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div>
      <p className="mb-1.5 text-sm font-semibold text-ink-800">{label}</p>
      <div className="flex gap-4">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className={cn(
            'relative grid w-32 shrink-0 place-items-center overflow-hidden rounded-xl border-2 border-dashed border-ink-200 bg-ink-50 text-ink-400 transition-colors hover:border-brand-400 hover:text-brand-600',
            aspect,
          )}
          aria-label={value ? `Replace ${label.toLowerCase()}` : `Upload ${label.toLowerCase()}`}
        >
          {value ? <img src={assetUrl(value)} alt="" className="absolute inset-0 size-full object-cover" /> : <ImagePlus className="size-6" aria-hidden="true" />}
          {uploading && (
            <span className="absolute inset-0 grid place-items-center bg-white/80">
              <Spinner label="Uploading" />
            </span>
          )}
        </button>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-xs font-semibold text-ink-800 hover:border-brand-300 hover:bg-brand-50"
            >
              <ImagePlus className="size-3.5" aria-hidden="true" /> {value ? 'Replace' : 'Upload'}
            </button>
            {value && (
              <button
                type="button"
                onClick={() => onChange(null)}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-ink-500 hover:bg-red-50 hover:text-red-700"
              >
                <Trash2 className="size-3.5" aria-hidden="true" /> Remove
              </button>
            )}
          </div>
          <label htmlFor={urlId} className="sr-only">
            {label} URL
          </label>
          <input
            id={urlId}
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value || null)}
            placeholder="…or paste an image URL"
            className="w-full rounded-lg border border-ink-200 px-3 py-1.5 text-xs text-ink-800 focus:border-brand-500 focus:outline-none"
          />
          <p className="text-xs text-ink-500">{hint ?? 'JPEG, PNG, WebP or GIF, up to 5 MB.'}</p>
        </div>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void upload(file)
        }}
      />
    </div>
  )
}
