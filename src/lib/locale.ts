/** The locale used for numbers and dates. Set by the app when the language changes. */
let current = 'en'

export function setFormatLocale(locale: string): void {
  current = locale
}

export function formatLocale(): string {
  return current
}
