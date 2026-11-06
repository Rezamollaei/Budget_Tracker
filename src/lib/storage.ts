import type { AppState, Asset, Expense, Income } from './types'
import { guessCategory, isCategoryId } from './categories'
import { isAssetKind } from './assets'
import { isValidISODate, monthKey } from './dates'
import { roundMoney } from './money'

const STORAGE_KEY = 'budget-tracker:v1'

export function emptyState(): AppState {
  return { version: 1, currency: 'USD', budgets: {}, expenses: [], incomes: [], assets: [] }
}

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function toExpense(raw: unknown): Expense | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const amount = Number(r.amount)
  if (!Number.isFinite(amount) || amount <= 0) return null
  if (!isValidISODate(r.date)) return null
  return {
    id: typeof r.id === 'string' && r.id ? r.id : newId(),
    amount: roundMoney(amount),
    description: typeof r.description === 'string' ? r.description : '',
    category: isCategoryId(r.category) ? r.category : 'other',
    date: r.date,
    createdAt: typeof r.createdAt === 'number' ? r.createdAt : Date.now(),
  }
}

function toIncome(raw: unknown): Income | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const amount = Number(r.amount)
  if (!Number.isFinite(amount) || amount <= 0 || !isValidISODate(r.date)) return null
  return {
    id: typeof r.id === 'string' && r.id ? r.id : newId(),
    amount: roundMoney(amount),
    description: typeof r.description === 'string' ? r.description : '',
    date: r.date,
    createdAt: typeof r.createdAt === 'number' ? r.createdAt : Date.now(),
  }
}

function toAsset(raw: unknown): Asset | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const value = Number(r.value)
  if (!Number.isFinite(value) || value < 0) return null
  return {
    id: typeof r.id === 'string' && r.id ? r.id : newId(),
    name: typeof r.name === 'string' && r.name.trim() ? r.name : 'Untitled',
    kind: isAssetKind(r.kind) ? r.kind : 'other',
    value: roundMoney(value),
    updatedAt: typeof r.updatedAt === 'number' ? r.updatedAt : Date.now(),
  }
}

function list<T>(raw: unknown, convert: (item: unknown) => T | null): T[] {
  return Array.isArray(raw) ? raw.map(convert).filter((x): x is T => x !== null) : []
}

function toState(raw: unknown): AppState | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (r.version !== 1 || !Array.isArray(r.expenses)) return null
  const budgets: Record<string, number> = {}
  if (r.budgets && typeof r.budgets === 'object') {
    for (const [k, v] of Object.entries(r.budgets as Record<string, unknown>)) {
      if (/^\d{4}-\d{2}$/.test(k) && typeof v === 'number' && v >= 0) budgets[k] = v
    }
  }
  return {
    version: 1,
    currency: typeof r.currency === 'string' && r.currency ? r.currency : 'USD',
    budgets,
    expenses: list(r.expenses, toExpense),
    // Saved before income and assets existed? Those fields are simply missing.
    incomes: list(r.incomes, toIncome),
    assets: list(r.assets, toAsset),
  }
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return (raw && toState(JSON.parse(raw))) || emptyState()
  } catch {
    return emptyState()
  }
}

export function saveState(state: AppState): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    return true
  } catch {
    return false
  }
}

export const STORAGE_EVENT_KEY = STORAGE_KEY

/**
 * Read a backup made by this app, or a budget_data.json written by the old
 * Python script ({ initial_budget, expenses: [{ description, amount }] }).
 */
export function parseImport(text: string, today: string): AppState | null {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return null
  }
  const state = toState(raw)
  if (state) return state

  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (!Array.isArray(r.expenses)) return null
  // The old script saved the key with a trailing space by mistake.
  const legacyBudget = Number(r.initial_budget ?? r['initial_budget '])
  const now = Date.now()
  const expenses: Expense[] = []
  r.expenses.forEach((item, i) => {
    const e = toExpense({ ...(item as object), date: today, createdAt: now + i })
    if (e) expenses.push({ ...e, category: guessCategory(e.description, expenses) ?? 'other' })
  })
  return {
    version: 1,
    currency: 'USD',
    budgets: Number.isFinite(legacyBudget) && legacyBudget > 0 ? { [monthKey(today)]: legacyBudget } : {},
    expenses,
    incomes: [],
    assets: [],
  }
}

/** Merge imported data into the current data without losing anything. */
function mergeById<T extends { id: string }>(current: T[], incoming: T[]): { merged: T[]; added: number } {
  const ids = new Set(current.map((x) => x.id))
  const fresh = incoming.filter((x) => !ids.has(x.id))
  return { merged: [...current, ...fresh], added: fresh.length }
}

export function mergeStates(current: AppState, incoming: AppState): { state: AppState; added: number } {
  const expenses = mergeById(current.expenses, incoming.expenses)
  const incomes = mergeById(current.incomes, incoming.incomes)
  const assets = mergeById(current.assets, incoming.assets)
  const isEmpty =
    current.expenses.length + current.incomes.length + current.assets.length === 0 && Object.keys(current.budgets).length === 0
  return {
    added: expenses.added + incomes.added + assets.added,
    state: {
      version: 1,
      currency: isEmpty ? incoming.currency : current.currency,
      budgets: { ...incoming.budgets, ...current.budgets },
      expenses: expenses.merged,
      incomes: incomes.merged,
      assets: assets.merged,
    },
  }
}
