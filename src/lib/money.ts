export const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'CHF', 'SEK', 'NOK', 'DKK', 'PLN', 'TRY', 'AED', 'IRR', 'INR', 'JPY', 'CNY', 'BRL', 'MXN']

const formatters = new Map<string, Intl.NumberFormat>()

export function formatMoney(amount: number, currency: string): string {
  let f = formatters.get(currency)
  if (!f) {
    try {
      f = new Intl.NumberFormat(undefined, { style: 'currency', currency })
    } catch {
      f = new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    }
    formatters.set(currency, f)
  }
  return f.format(amount)
}

/** Round to cents so sums of floats like 0.1 + 0.2 stay clean. */
export function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100
}

/** Accepts "12.5", "12,50" and "1,200.75". Returns null if it isn't a positive amount. */
export function parseAmount(text: string): number | null {
  const t = text.trim().replace(/[$€£¥₹﷼\s]/g, '')
  let normalized: string
  if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(t)) normalized = t.replace(/,/g, '')
  else if (/^\d+(,\d{1,2})$/.test(t)) normalized = t.replace(',', '.')
  else if (/^\d+(\.\d+)?$/.test(t) || /^\.\d+$/.test(t)) normalized = t
  else return null
  const n = Number(normalized)
  return Number.isFinite(n) && n > 0 ? roundMoney(n) : null
}
