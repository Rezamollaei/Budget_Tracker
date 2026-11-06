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
  /** The account (an Asset id) this was paid from, if linked. */
  accountId?: string
}

export interface Income {
  id: string
  amount: number
  description: string
  /** Local calendar date, YYYY-MM-DD */
  date: string
  createdAt: number
  /** The account (an Asset id) this went into, if linked. */
  accountId?: string
}

export type AssetKind = 'cash' | 'bank' | 'savings' | 'gold' | 'investment' | 'splitwise' | 'debt' | 'other'

/**
 * Something you own, with its current value.
 * 'debt' values are amounts you owe (subtracted from the total).
 * 'splitwise' is your Splitwise balance: positive when friends owe you, negative when you owe.
 * All other values are zero or more.
 */
export interface Asset {
  id: string
  name: string
  kind: AssetKind
  /**
   * The value you last typed in. For accounts, expenses and income linked to it
   * and added after `updatedAt` are applied on top (see `withActivity`).
   */
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
