import { detectLang, type Lang } from './i18n'

export type Theme = 'auto' | 'light' | 'dark'

export interface Prefs {
  lang: Lang
  theme: Theme
}

/** Per-device display preferences, kept apart from the budget data and backups. */
export const PREFS_KEY = 'budget-tracker:prefs'

export function loadPrefs(): Prefs {
  try {
    const raw = JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}') as Partial<Prefs>
    return {
      lang: raw.lang === 'it' || raw.lang === 'en' ? raw.lang : detectLang(),
      theme: raw.theme === 'light' || raw.theme === 'dark' ? raw.theme : 'auto',
    }
  } catch {
    return { lang: detectLang(), theme: 'auto' }
  }
}

export function savePrefs(prefs: Prefs): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
  } catch {
    // Not fatal: the choice just won't be remembered.
  }
}

export function applyTheme(theme: Theme): void {
  const root = document.documentElement
  if (theme === 'auto') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', theme)
}
