import { CATEGORIES, getCategory } from './categories'
import { HAIR_TREATMENTS } from './treatments-hair'
import { SKIN_TREATMENTS } from './treatments-skin'
import type { CategorySlug, Treatment } from './types'

export * from './brand'
export * from './categories'
export * from './centres'
export * from './doctors'
export type * from './types'

/** Every treatment page, in the order the categories appear. */
export const TREATMENTS: Treatment[] = CATEGORIES.flatMap((c) =>
  [...SKIN_TREATMENTS, ...HAIR_TREATMENTS].filter((t) => t.category === c.slug),
)

export const getTreatment = (slug: string | undefined) => TREATMENTS.find((t) => t.slug === slug)
export const treatmentsInCategory = (category: CategorySlug) => TREATMENTS.filter((t) => t.category === category)
export const treatmentsBySlugs = (slugs: readonly string[]) =>
  slugs.map((s) => getTreatment(s)).filter((t): t is Treatment => Boolean(t))

export const treatmentPath = (t: Pick<Treatment, 'slug' | 'category'>) => `/services/${t.category}/${t.slug}`
export const categoryPath = (slug: CategorySlug) => `/services/${slug}`
export const doctorPath = (slug: string) => `/doctors/${slug}`
export const centrePath = (slug: string) => `/centers/${slug}`

/** Path for a treatment by slug (falls back to the services hub). */
export function pathForTreatment(slug: string | undefined): string {
  const t = getTreatment(slug)
  return t ? treatmentPath(t) : '/services'
}

export function categoryOfTreatment(slug: string | undefined) {
  const t = getTreatment(slug)
  return t ? getCategory(t.category) : undefined
}
