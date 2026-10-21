import type { Theme } from '@/types'

type Shade = '50' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900' | '950'

export interface ThemeDefinition {
  label: string
  description: string
  brand: Record<Shade, string>
}

/**
 * Brand palettes the admin can switch between. Each keeps the same lightness steps as the original
 * teal, so white text on brand-500+ and brand-700 text on white stay readable (WCAG AA).
 */
export const THEMES: Record<Theme, ThemeDefinition> = {
  cedar: {
    label: 'Cedar Teal',
    description: 'The original Cedarline teal: calm and clinical.',
    brand: {
      50: '#eef8f8', 100: '#d4eeee', 200: '#a9dbdc', 300: '#74c0c2', 400: '#3f9fa3', 500: '#208589',
      600: '#176d72', 700: '#135a5f', 800: '#10494d', 900: '#0d3b3e', 950: '#082a2c',
    },
  },
  emerald: {
    label: 'Clinical Emerald',
    description: 'Fresh green that signals health and growth.',
    brand: {
      50: '#eef9f4', 100: '#d5efe4', 200: '#aadcc6', 300: '#75c4a5', 400: '#3aa37f', 500: '#12875f',
      600: '#0d6e4e', 700: '#0b5a41', 800: '#094a36', 900: '#083d2d', 950: '#04241a',
    },
  },
  sapphire: {
    label: 'Sapphire Blue',
    description: 'Trustworthy hospital blue.',
    brand: {
      50: '#eff5ff', 100: '#dbe7fe', 200: '#b9d0fb', 300: '#8bb0f5', 400: '#5a8bec', 500: '#2f6bd8',
      600: '#2457b8', 700: '#1f4794', 800: '#1c3b78', 900: '#192f5f', 950: '#0f1c3a',
    },
  },
  slate: {
    label: 'Modern Slate',
    description: 'Understated grey-blue for a premium, minimal look.',
    brand: {
      50: '#f4f6f9', 100: '#e6eaf0', 200: '#cbd3de', 300: '#a6b3c4', 400: '#7a8aa1', 500: '#566781',
      600: '#46556c', 700: '#3a4659', 800: '#313b4b', 900: '#29313e', 950: '#191e27',
    },
  },
  plum: {
    label: 'Royal Plum',
    description: 'Warm violet suited to aesthetic and skin care.',
    brand: {
      50: '#f8f3fb', 100: '#efe3f6', 200: '#dcc5ec', 300: '#c29fdc', 400: '#a374c7', 500: '#8653ad',
      600: '#6f4290', 700: '#5b3676', 800: '#4b2e61', 900: '#3e2750', 950: '#261631',
    },
  },
}

const STORAGE_KEY = 'cedarline.theme'

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
