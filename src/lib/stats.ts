import type { CategoryId, Expense, Income } from './types'
import { daysInMonth, monthKey } from './dates'
import { normalizeText } from './categories'
import { roundMoney } from './money'

/** A budget applies from the month it was set until a later month overrides it. */
export function budgetFor(budgets: Record<string, number>, key: string): number {
  let best: string | null = null
  for (const k of Object.keys(budgets)) {
    if (k <= key && (best === null || k > best)) best = k
  }
  return best === null ? 0 : budgets[best]
}

export interface MonthSummary {
  items: Expense[]
  incomeItems: Income[]
  spent: number
  /** Money that came in this month. */
  income: number
  /** income - spent; negative means you spent more than you earned. */
  saved: number
  budget: number
  remaining: number
  /** Days left in the month including today; 0 for past months. */
  daysLeft: number
  /** How much can be spent per remaining day to stay on budget. */
  perDay: number
  byCategory: { category: CategoryId; total: number; count: number }[]
}

export function summarizeMonth(expenses: Expense[], incomes: Income[], key: string, budget: number, today: string): MonthSummary {
  const items = expenses.filter((e) => monthKey(e.date) === key)
  const incomeItems = incomes.filter((i) => monthKey(i.date) === key)
  const spent = roundMoney(items.reduce((s, e) => s + e.amount, 0))
  const income = roundMoney(incomeItems.reduce((s, i) => s + i.amount, 0))
  const remaining = roundMoney(budget - spent)

  const currentKey = monthKey(today)
  const total = daysInMonth(key)
  const daysLeft = key < currentKey ? 0 : key > currentKey ? total : total - Number(today.slice(8, 10)) + 1
  const perDay = daysLeft > 0 && remaining > 0 ? roundMoney(remaining / daysLeft) : 0

  const totals = new Map<CategoryId, { total: number; count: number }>()
  for (const e of items) {
    const t = totals.get(e.category) ?? { total: 0, count: 0 }
    t.total += e.amount
    t.count += 1
    totals.set(e.category, t)
  }
  const byCategory = [...totals.entries()]
    .map(([category, t]) => ({ category, total: roundMoney(t.total), count: t.count }))
    .sort((a, b) => b.total - a.total)

  return { items, incomeItems, spent, income, saved: roundMoney(income - spent), budget, remaining, daysLeft, perDay, byCategory }
}

export type Entry = (Expense & { type: 'expense' }) | (Income & { type: 'income' })

export function toEntries(expenses: Expense[], incomes: Income[]): Entry[] {
  return [...expenses.map((e) => ({ ...e, type: 'expense' as const })), ...incomes.map((i) => ({ ...i, type: 'income' as const }))]
}

export interface DayGroup {
  date: string
  spent: number
  earned: number
  items: Entry[]
}

export function groupByDay(items: Entry[]): DayGroup[] {
  const sorted = [...items].sort((a, b) => (a.date === b.date ? b.createdAt - a.createdAt : a.date < b.date ? 1 : -1))
  const groups: DayGroup[] = []
  for (const e of sorted) {
    let last = groups[groups.length - 1]
    if (!last || last.date !== e.date) {
      last = { date: e.date, spent: 0, earned: 0, items: [] }
      groups.push(last)
    }
    last.items.push(e)
    if (e.type === 'income') last.earned = roundMoney(last.earned + e.amount)
    else last.spent = roundMoney(last.spent + e.amount)
  }
  return groups
}

export interface Favorite {
  description: string
  amount: number
  category: CategoryId
  count: number
}

/** Things you buy repeatedly (same description and amount), for one-tap adding. */
export function favorites(expenses: Expense[], limit = 6): Favorite[] {
  const map = new Map<string, Favorite & { last: number }>()
  for (const e of expenses) {
    const key = `${normalizeText(e.description)}|${e.amount}`
    const f = map.get(key)
    if (f) {
      f.count += 1
      if (e.createdAt > f.last) {
        f.last = e.createdAt
        f.category = e.category
        f.description = e.description
      }
    } else {
      map.set(key, { description: e.description, amount: e.amount, category: e.category, count: 1, last: e.createdAt })
    }
  }
  return [...map.values()]
    .filter((f) => f.count >= 2)
    .sort((a, b) => b.count - a.count || b.last - a.last)
    .slice(0, limit)
    .map(({ last: _last, ...f }) => f)
}
