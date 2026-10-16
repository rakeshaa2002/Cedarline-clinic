import type { ReactNode } from 'react'
import { Breadcrumbs, type Crumb } from '@/components/ui/Layout'

/** Consistent interior-page header with breadcrumbs, H1 and optional image. */
export function PageHero({
  title,
  description,
  crumbs,
  eyebrow,
  image,
  children,
}: {
  title: string
  description: string
  crumbs: Crumb[]
  eyebrow?: string
  image?: string
  children?: ReactNode
}) {
  return (
    <section className="relative overflow-hidden bg-brand-900 text-white">
      {image && (
        <>
          <img src={image} alt="" className="absolute inset-0 size-full object-cover opacity-30" fetchPriority="high" />
          <div className="absolute inset-0 bg-gradient-to-r from-brand-900 via-brand-900/90 to-brand-900/40" />
        </>
      )}
      <div className="relative container-page py-14 sm:py-20">
        <Breadcrumbs items={[{ label: 'Home', to: '/' }, ...crumbs]} tone="light" />
        <div className="mt-6 max-w-2xl animate-fade-up">
          {eyebrow && <p className="mb-3 text-xs font-semibold tracking-[0.14em] text-brand-200 uppercase">{eyebrow}</p>}
          <h1 className="text-4xl font-bold text-white sm:text-5xl">{title}</h1>
          <p className="mt-5 text-lg leading-8 text-brand-50/85">{description}</p>
          {children && <div className="mt-8 flex flex-wrap gap-3">{children}</div>}
        </div>
      </div>
    </section>
  )
}
