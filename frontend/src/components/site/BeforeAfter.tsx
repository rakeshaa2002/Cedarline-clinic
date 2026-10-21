import { ChevronsLeftRight, ShieldCheck } from 'lucide-react'
import { useId, useState } from 'react'
import { SectionHeading } from '@/components/ui/Layout'
import { useApi } from '@/hooks/useApi'
import { assetUrl } from '@/services/api'
import { clinicApi } from '@/services/endpoints'
import type { Department, Transformation } from '@/types'

/**
 * Drag (or use arrow keys) to compare two photos. A transparent native range input covers the
 * image, so mouse, touch, keyboard and screen readers all work without custom gesture code.
 */
export function BeforeAfterSlider({ before, after, label }: { before: string; after: string; label: string }) {
  const [position, setPosition] = useState(50)
  const id = useId()
  return (
    <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-ink-100 select-none">
      <img src={assetUrl(after)} alt={`${label}: after treatment`} loading="lazy" className="absolute inset-0 size-full object-cover" />
      <img
        src={assetUrl(before)}
        alt={`${label}: before treatment`}
        loading="lazy"
        className="absolute inset-0 size-full object-cover"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      />
      <span className="absolute top-3 left-3 rounded-full bg-ink-950/70 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm">Before</span>
      <span className="absolute top-3 right-3 rounded-full bg-brand-700/85 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm">After</span>
      <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow-[0_0_8px_rgba(0,0,0,0.4)]" style={{ left: `${position}%` }} aria-hidden="true">
        <span className="absolute top-1/2 left-1/2 grid size-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-brand-700 shadow-lg">
          <ChevronsLeftRight className="size-5" />
        </span>
      </div>
      <label htmlFor={id} className="sr-only">
        Compare before and after for {label}
      </label>
      <input
        id={id}
        type="range"
        min={0}
        max={100}
        value={position}
        onChange={(e) => setPosition(Number(e.target.value))}
        aria-valuetext={`${position}% before`}
        className="absolute inset-0 size-full cursor-ew-resize opacity-0"
      />
    </div>
  )
}

/** "Real results" on a department page: renders nothing until the clinic publishes consented cases. */
export function TransformationsSection({ department }: { department: Department }) {
  const { data } = useApi<Transformation[]>(`transformations:${department}`, () => clinicApi.transformations(department))
  if (!data?.length) return null
  return (
    <section className="section">
      <div className="container-page">
        <SectionHeading
          eyebrow="Real results"
          title="Before & after"
          description="Drag the slider to compare. Every case is shared with the patient's written consent; individual results vary."
        />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {data.map((c) => (
            <figure key={c.id} className="overflow-hidden rounded-[var(--radius-card)] border border-ink-100 bg-white p-3 shadow-card">
              <BeforeAfterSlider before={c.before_image} after={c.after_image} label={c.title} />
              <figcaption className="px-1 pt-3 pb-1">
                <p className="font-semibold text-ink-900">{c.title}</p>
                {c.description && <p className="mt-1 text-sm text-ink-600">{c.description}</p>}
              </figcaption>
            </figure>
          ))}
        </div>
        <p className="mt-6 flex items-center gap-2 text-xs text-ink-500">
          <ShieldCheck className="size-4 text-brand-600" aria-hidden="true" /> Photos are unretouched and published with consent.
          Outcomes depend on each patient; your doctor will discuss what to expect.
        </p>
      </div>
    </section>
  )
}
