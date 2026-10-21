import { useEffect } from 'react'
import { useClinicInfo } from '@/hooks/useClinic'
import { applyTheme } from '@/theme/themes'

/**
 * Keeps the site's colours in sync with the theme chosen in the admin panel. Clinic info is
 * re-fetched whenever the tab becomes visible again, so a change shows up without a reload.
 */
export function ThemeSync() {
  const { data, reload } = useClinicInfo()

  useEffect(() => {
    if (data?.theme) applyTheme(data.theme)
  }, [data?.theme])

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') reload()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [reload])

  return null
}
