import { Check, Palette } from 'lucide-react'
import { useState } from 'react'
import { Card } from '@/components/ui/Layout'
import { useToast } from '@/components/ui/Toast'
import { invalidate } from '@/hooks/useApi'
import { useClinicInfo } from '@/hooks/useClinic'
import { AdminPageHeader } from '@/layouts/AdminLayout'
import { toApiError } from '@/services/api'
import { adminApi } from '@/services/endpoints'
import { THEMES, applyTheme } from '@/theme/themes'
import type { Theme } from '@/types'
import { cn } from '@/utils/format'

const SWATCHES = ['100', '300', '500', '700', '900'] as const

/** Live brand customizer: the palette applies instantly here and on every open website tab. */
export default function AdminThemePage() {
  const clinic = useClinicInfo()
  const toast = useToast()
  const [saving, setSaving] = useState<Theme | null>(null)
  const current = clinic.data?.theme ?? 'cedar'

  const choose = async (theme: Theme) => {
    setSaving(theme)
    applyTheme(theme) // preview immediately
    try {
      await adminApi.setTheme(theme)
      invalidate('clinic-info')
      clinic.reload()
      toast.success(`${THEMES[theme].label} applied`, 'Visitors see it on their next page view; open tabs update when they regain focus.')
    } catch (err) {
      applyTheme(current)
      toast.error('Could not change the theme', toApiError(err).message)
    } finally {
      setSaving(null)
    }
  }

  return (
    <>
      <AdminPageHeader title="Brand theme" description="Choose the colour palette for the website, booking engine, chatbot and this panel." />
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {(Object.keys(THEMES) as Theme[]).map((id) => {
          const t = THEMES[id]
          const active = id === current
          return (
            <button key={id} type="button" disabled={saving !== null} onClick={() => void choose(id)} className="text-left" aria-pressed={active}>
              <Card className={cn('h-full p-5 transition-all hover:-translate-y-0.5 hover:shadow-lift', active && 'ring-2 ring-brand-600 ring-offset-2')}>
                <div className="flex gap-1.5" aria-hidden="true">
                  {SWATCHES.map((s) => (
                    <span key={s} className="h-10 flex-1 rounded-lg" style={{ background: t.brand[s] }} />
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <p className="font-bold text-ink-900">{t.label}</p>
                  {active ? (
                    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-white" style={{ background: t.brand['700'] }}>
                      <Check className="size-3.5" aria-hidden="true" /> Active
                    </span>
                  ) : (
                    saving === id && <span className="text-xs text-ink-500">Applying…</span>
                  )}
                </div>
                <p className="mt-1 text-sm text-ink-500">{t.description}</p>
                <div className="mt-4 flex items-center gap-2">
                  <span className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white" style={{ background: t.brand['700'] }}>Book appointment</span>
                  <span className="rounded-lg px-3 py-1.5 text-xs font-semibold" style={{ background: t.brand['50'], color: t.brand['800'] }}>Our doctors</span>
                </div>
              </Card>
            </button>
          )
        })}
      </div>
      <p className="mt-6 flex items-center gap-2 text-sm text-ink-500">
        <Palette className="size-4" aria-hidden="true" /> Every palette keeps text and buttons at accessible contrast. The orange accent stays the same.
      </p>
    </>
  )
}
