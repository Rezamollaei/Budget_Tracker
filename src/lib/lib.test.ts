import { describe, expect, it } from 'vitest'
import { parseEntry } from './parse'
import { parseAmount } from './money'
import { guessCategory } from './categories'
import { budgetFor, favorites, groupByDay, summarizeMonth } from './stats'
import { mergeStates, parseImport, emptyState } from './storage'
import { toCSV } from './csv'
import { addDays, shiftMonth, daysInMonth } from './dates'
import type { Expense } from './types'

const exp = (over: Partial<Expense>): Expense => ({
  id: Math.random().toString(36),
  amount: 10,
  description: 'Thing',
  category: 'other',
  date: '2026-11-06',
  createdAt: 1,
  ...over,
})

describe('parseEntry', () => {
  it('reads amount after the description', () => {
    expect(parseEntry('coffee 4.50')).toEqual({ amount: 4.5, description: 'Coffee', dayOffset: 0 })
  })
  it('reads amount before the description', () => {
    expect(parseEntry('12 lunch with Sam')).toMatchObject({ amount: 12, description: 'Lunch with Sam' })
  })
  it('uses the last number and keeps earlier numbers in the text', () => {
    expect(parseEntry('2 coffees 7.50')).toMatchObject({ amount: 7.5, description: '2 coffees' })
  })
  it('understands comma decimals, thousands and currency symbols', () => {
    expect(parseEntry('lunch 12,50').amount).toBe(12.5)
    expect(parseEntry('rent 1,200').amount).toBe(1200)
    expect(parseEntry('taxi $18').amount).toBe(18)
  })
  it('understands "yesterday"', () => {
    expect(parseEntry('taxi 18 yesterday')).toEqual({ amount: 18, description: 'Taxi', dayOffset: -1 })
  })
  it('does not treat words with digits as amounts', () => {
    expect(parseEntry('7up')).toMatchObject({ amount: null, description: '7up' })
  })
})

describe('parseAmount', () => {
  it('rejects zero, negatives and junk', () => {
    expect(parseAmount('0')).toBeNull()
    expect(parseAmount('-5')).toBeNull()
    expect(parseAmount('abc')).toBeNull()
    expect(parseAmount('0.1')).toBe(0.1)
  })
})

describe('guessCategory', () => {
  it('uses keywords', () => {
    expect(guessCategory('Morning coffee', [])).toBe('food')
    expect(guessCategory('Uber home', [])).toBe('transport')
    expect(guessCategory('Mystery', [])).toBeNull()
  })
  it('prefers your own most recent choice', () => {
    const history = [
      exp({ description: 'Coffee', category: 'fun', createdAt: 1 }),
      exp({ description: 'coffee ', category: 'groceries', createdAt: 2 }),
    ]
    expect(guessCategory('COFFEE', history)).toBe('groceries')
  })
})

describe('budgets and summaries', () => {
  it('carries a budget forward until changed', () => {
    const b = { '2026-09': 500, '2026-11': 800 }
    expect(budgetFor(b, '2026-08')).toBe(0)
    expect(budgetFor(b, '2026-10')).toBe(500)
    expect(budgetFor(b, '2027-02')).toBe(800)
  })

  it('computes remaining and safe daily spend for the current month', () => {
    const items = [exp({ amount: 100.1, category: 'food' }), exp({ amount: 50.2, category: 'bills' }), exp({ amount: 99, date: '2026-10-31' })]
    const s = summarizeMonth(items, '2026-11', 1000, '2026-11-06')
    expect(s.spent).toBe(150.3)
    expect(s.remaining).toBe(849.7)
    expect(s.daysLeft).toBe(25)
    expect(s.perDay).toBe(33.99)
    expect(s.byCategory.map((c) => c.category)).toEqual(['food', 'bills'])
  })

  it('has no days left in past months and no per-day when over budget', () => {
    expect(summarizeMonth([], '2026-10', 100, '2026-11-06').daysLeft).toBe(0)
    expect(summarizeMonth([exp({ amount: 200 })], '2026-11', 100, '2026-11-06').perDay).toBe(0)
  })

  it('groups by day, newest first', () => {
    const g = groupByDay([
      exp({ date: '2026-11-01', createdAt: 1, amount: 1 }),
      exp({ date: '2026-11-05', createdAt: 2, amount: 2 }),
      exp({ date: '2026-11-05', createdAt: 3, amount: 3 }),
    ])
    expect(g.map((d) => [d.date, d.total, d.items.map((i) => i.amount)])).toEqual([
      ['2026-11-05', 5, [3, 2]],
      ['2026-11-01', 1, [1]],
    ])
  })

  it('finds repeated purchases for one-tap adding', () => {
    const f = favorites([
      exp({ description: 'Coffee', amount: 4.5, createdAt: 1 }),
      exp({ description: 'coffee', amount: 4.5, createdAt: 2, category: 'food' }),
      exp({ description: 'Once', amount: 9 }),
    ])
    expect(f).toEqual([{ description: 'coffee', amount: 4.5, category: 'food', count: 2 }])
  })
})

describe('import', () => {
  it('reads the old Python budget_data.json, including the trailing-space key', () => {
    const legacy = JSON.stringify({ 'initial_budget ': 300, expenses: [{ description: 'coffee', amount: 5 }, { description: 'bad', amount: 'x' }] })
    const s = parseImport(legacy, '2026-11-06')!
    expect(s.budgets).toEqual({ '2026-11': 300 })
    expect(s.expenses).toHaveLength(1)
    expect(s.expenses[0]).toMatchObject({ description: 'coffee', amount: 5, category: 'food', date: '2026-11-06' })
  })

  it('round-trips its own backups and merges without duplicates', () => {
    const current = { ...emptyState(), currency: 'EUR', budgets: { '2026-11': 900 }, expenses: [exp({ id: 'a' })] }
    const incoming = parseImport(JSON.stringify({ ...current, budgets: { '2026-10': 100, '2026-11': 1 }, expenses: [exp({ id: 'a' }), exp({ id: 'b' })] }), '2026-11-06')!
    const { state, added } = mergeStates(current, incoming)
    expect(added).toBe(1)
    expect(state.expenses.map((e) => e.id)).toEqual(['a', 'b'])
    expect(state.budgets).toEqual({ '2026-10': 100, '2026-11': 900 })
    expect(state.currency).toBe('EUR')
  })

  it('rejects files that are not budget data', () => {
    expect(parseImport('not json', '2026-11-06')).toBeNull()
    expect(parseImport('{"hello":1}', '2026-11-06')).toBeNull()
  })
})

describe('csv and dates', () => {
  it('escapes CSV cells', () => {
    expect(toCSV([exp({ description: 'Dinner, "fancy"', category: 'food', amount: 30 })])).toBe(
      'Date,Description,Category,Amount\n2026-11-06,"Dinner, ""fancy""",Food & drink,30.00\n',
    )
  })
  it('handles month and day arithmetic', () => {
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
    expect(shiftMonth('2026-01', -1)).toBe('2025-12')
    expect(daysInMonth('2028-02')).toBe(29)
  })
})
