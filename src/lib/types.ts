export type CategoryId =
  | 'food'
  | 'groceries'
  | 'transport'
  | 'shopping'
  | 'bills'
  | 'home'
  | 'health'
  | 'fun'
  | 'travel'
  | 'other'

export interface Category {
  id: CategoryId
  label: string
  emoji: string
  color: string
}

export interface Expense {
  id: string
  amount: number
  description: string
  category: CategoryId
  /** Local calendar date, YYYY-MM-DD */
  date: string
  createdAt: number
}

export interface Income {
  id: string
  amount: number
  description: string
  /** Local calendar date, YYYY-MM-DD */
  date: string
  createdAt: number
}

export type AssetKind = 'cash' | 'bank' | 'savings' | 'gold' | 'investment' | 'owed' | 'debt' | 'other'

/** Something you own (or owe, for kind 'debt'), with its current value. Values are never negative. */
export interface Asset {
  id: string
  name: string
  kind: AssetKind
  value: number
  updatedAt: number
}

export interface AppState {
  version: 1
  currency: string
  /** Budget keyed by the month it starts applying from (YYYY-MM). */
  budgets: Record<string, number>
  expenses: Expense[]
  incomes: Income[]
  assets: Asset[]
}
