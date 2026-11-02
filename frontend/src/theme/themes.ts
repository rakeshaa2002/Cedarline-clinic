import type { Theme } from '@/types'

type Shade = '50' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900' | '950'

export interface ThemeDefinition {
  label: string
  description: string
  brand: Record<Shade, string>
}

/**
 * RUA brand palettes the admin can switch between, all from the clinic's wood-and-cream identity so
 * they sit with the cream surfaces and gold accent. Each keeps the signature palette's lightness
 * steps, so white text on brand-500+ and brand-700 text on white stay at least as readable.
 */
export const THEMES: Record<Theme, ThemeDefinition> = {
  cedar: {
    label: 'RUA Cocoa',
    description: 'The signature RUA identity: cocoa and walnut wood with cream.',
    brand: {
      50: '#fdf6ef', 100: '#f8e9dc', 200: '#efd3bb', 300: '#e0b48f', 400: '#c98e63', 500: '#a96c42',
      600: '#8e5430', 700: '#713f27', 800: '#592f23', 900: '#44241b', 950: '#2b1711',
    },
  },
  walnut: {
    label: 'Walnut & Honey',
    description: 'Golden walnut tones, warmer and lighter than the signature cocoa.',
    brand: {
      50: '#fbf6ee', 100: '#f4e7d2', 200: '#e8cfa8', 300: '#d8b07a', 400: '#c08b4f', 500: '#9a6434',
      600: '#80512a', 700: '#674224', 800: '#54361f', 900: '#452d1b', 950: '#29190e',
    },
  },
  rosewood: {
    label: 'Rosewood',
    description: 'Dusky rose-brown with a soft, skin-care feel.',
    brand: {
      50: '#fbf4f3', 100: '#f4e3e1', 200: '#e8c6c2', 300: '#d6a19b', 400: '#bf776f', 500: '#a3564f',
      600: '#874440', 700: '#6e3735', 800: '#5a2e2e', 900: '#4a2828', 950: '#2b1515',
    },
  },
  espresso: {
    label: 'Espresso',
    description: 'Deep, understated coffee brown for a quiet premium look.',
    brand: {
      50: '#f6f4f2', 100: '#e9e4df', 200: '#d4c9bf', 300: '#b6a597', 400: '#937e6d', 500: '#76604f',
      600: '#5e4c3f', 700: '#4b3d33', 800: '#3d322b', 900: '#322a25', 950: '#1c1714',
    },
  },
  sage: {
    label: 'Botanical Sage',
    description: 'Muted leaf green that pairs with RUA’s cream and gold.',
    brand: {
      50: '#f3f6f1', 100: '#e3eadf', 200: '#c8d6c1', 300: '#a3b99a', 400: '#7d9872', 500: '#5d7a52',
      600: '#4a6242', 700: '#3c4f36', 800: '#32412e', 900: '#2a3627', 950: '#161d14',
    },
  },
}

const STORAGE_KEY = 'rua.theme'

const isTheme = (value: unknown): value is Theme => typeof value === 'string' && value in THEMES

/** Point Tailwind's --color-brand-* variables at the chosen palette (cedar = the stylesheet defaults). */
export function applyTheme(theme: Theme) {
  const root = document.documentElement
  for (const [shade, color] of Object.entries(THEMES[theme].brand)) {
    if (theme === 'cedar') root.style.removeProperty(`--color-brand-${shade}`)
    else root.style.setProperty(`--color-brand-${shade}`, color)
  }
  root.dataset.theme = theme
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    /* storage unavailable: the theme is re-applied once clinic info loads */
  }
}

/** Re-apply the last known theme before React renders, so returning visitors never see a colour flash. */
export function applyStoredTheme() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (isTheme(stored)) applyTheme(stored)
  } catch {
    /* storage unavailable */
  }
}
