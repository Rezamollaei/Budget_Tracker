import type { Expense, Income } from './types'
import { translate, type Lang, type MessageKey } from './i18n'

function cell(value: string | number): string {
  const s = String(value)
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function toCSV(expenses: Expense[], incomes: Income[] = [], lang: Lang = 'en'): string {
  const rows = [
    ...expenses.map((e) => ({ ...e, type: translate(lang, 'expense'), category: translate(lang, `cat.${e.category}` as MessageKey) })),
    ...incomes.map((i) => ({ ...i, type: translate(lang, 'income'), category: translate(lang, 'income') })),
  ]
    .sort((a, b) => (a.date === b.date ? a.createdAt - b.createdAt : a.date < b.date ? -1 : 1))
    .map((r) => [r.date, r.type, r.description, r.category, r.amount.toFixed(2)].map(cell).join(','))
  return [translate(lang, 'csvHeader'), ...rows].join('\n') + '\n'
}

export function downloadFile(filename: string, content: string, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
