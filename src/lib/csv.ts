import type { Expense, Income } from './types'
import { getCategory } from './categories'

function cell(value: string | number): string {
  const s = String(value)
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function toCSV(expenses: Expense[], incomes: Income[] = []): string {
  const rows = [
    ...expenses.map((e) => ({ ...e, type: 'Expense', category: getCategory(e.category).label })),
    ...incomes.map((i) => ({ ...i, type: 'Income', category: 'Income' })),
  ]
    .sort((a, b) => (a.date === b.date ? a.createdAt - b.createdAt : a.date < b.date ? -1 : 1))
    .map((r) => [r.date, r.type, r.description, r.category, r.amount.toFixed(2)].map(cell).join(','))
  return ['Date,Type,Description,Category,Amount', ...rows].join('\n') + '\n'
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
