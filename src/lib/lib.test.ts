import { describe, expect, it } from 'vitest'
import { parseEntry } from './parse'
import { parseAmount } from './money'
import { guessCategory } from './categories'
import { budgetFor, favorites, groupByDay, summarizeMonth, toEntries } from './stats'
import { summarizeAssets, formatUpdated } from './assets'
import { mergeStates, parseImport, emptyState } from './storage'
import { toCSV } from './csv'
import { addDays, shiftMonth, daysInMonth } from './dates'
import type { Expense, Income } from './types'

const exp = (over: Partial<Expense>): Expense => ({
  id: Math.random().toString(36),
  amount: 10,
  description: 'Thing',
  category: 'other',
  date: '2026-11-06',
  createdAt: 1,
  ...over,
})

const inc = (over: Partial<Income>): Income => ({
  id: Math.random().toString(36),
  amount: 100,
  description: 'Salary',
  date: '2026-11-06',
  createdAt: 1,
  ...over,
})

describe('parseEntry', () => {
  it('reads amount after the description', () => {
    expect(parseEntry('coffee 4.50')).toEqual({ amount: 4.5, description: 'Coffee', dayOffset: 0, income: false })
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
    expect(parseEntry('taxi 18 yesterday')).toEqual({ amount: 18, description: 'Taxi', dayOffset: -1, income: false })
  })
  it('treats a leading + as income', () => {
    expect(parseEntry('+salary 2500')).toMatchObject({ amount: 2500, description: 'Salary', income: true })
    expect(parseEntry('+ 300 freelance')).toMatchObject({ amount: 300, description: 'Freelance', income: true })
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
    const s = summarizeMonth(items, [], '2026-11', 1000, '2026-11-06')
    expect(s.spent).toBe(150.3)
    expect(s.remaining).toBe(849.7)
    expect(s.daysLeft).toBe(25)
    expect(s.perDay).toBe(33.99)
    expect(s.byCategory.map((c) => c.category)).toEqual(['food', 'bills'])
  })

  it('has no days left in past months and no per-day when over budget', () => {
    expect(summarizeMonth([], [], '2026-10', 100, '2026-11-06').daysLeft).toBe(0)
    expect(summarizeMonth([exp({ amount: 200 })], [], '2026-11', 100, '2026-11-06').perDay).toBe(0)
  })

  it('adds up income and savings for the month', () => {
    const s = summarizeMonth(
      [exp({ amount: 300 }), exp({ amount: 50, date: '2026-10-02' })],
      [inc({ amount: 2000 }), inc({ amount: 150.5 }), inc({ amount: 999, date: '2026-10-01' })],
      '2026-11',
      0,
      '2026-11-06',
    )
    expect([s.income, s.spent, s.saved]).toEqual([2150.5, 300, 1850.5])
    expect(summarizeMonth([exp({ amount: 300 })], [inc({ amount: 100 })], '2026-11', 0, '2026-11-06').saved).toBe(-200)
  })

  it('groups by day, newest first, with spent and earned per day', () => {
    const g = groupByDay(
      toEntries(
        [
          exp({ date: '2026-11-01', createdAt: 1, amount: 1 }),
          exp({ date: '2026-11-05', createdAt: 2, amount: 2 }),
          exp({ date: '2026-11-05', createdAt: 3, amount: 3 }),
        ],
        [inc({ date: '2026-11-05', createdAt: 4, amount: 100 })],
      ),
    )
    expect(g.map((d) => [d.date, d.spent, d.earned, d.items.map((i) => i.amount)])).toEqual([
      ['2026-11-05', 5, 100, [100, 3, 2]],
      ['2026-11-01', 1, 0, [1]],
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

describe('what I own', () => {
  it('subtracts what I owe (e.g. Splitwise) from what I own', () => {
    const s = summarizeAssets([
      { id: '1', name: 'Bank', kind: 'bank', value: 1000, updatedAt: 1 },
      { id: '2', name: 'Gold', kind: 'gold', value: 400.5, updatedAt: 1 },
      { id: '3', name: 'Splitwise – owed to me', kind: 'owed', value: 60, updatedAt: 1 },
      { id: '4', name: 'Splitwise – I owe', kind: 'debt', value: 85.25, updatedAt: 1 },
    ])
    expect([s.owned, s.owing, s.total]).toEqual([1460.5, 85.25, 1375.25])
    expect(s.byKind[0]).toEqual({ kind: 'bank', total: 1000, count: 1 })
  })
  it('describes when a value was last updated', () => {
    const day = 86_400_000
    expect(formatUpdated(10 * day, 10 * day + 5)).toBe('today')
    expect(formatUpdated(0, day)).toBe('yesterday')
    expect(formatUpdated(0, 45 * day)).toBe('1 month ago')
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
    const incoming = parseImport(
      JSON.stringify({ ...current, budgets: { '2026-10': 100, '2026-11': 1 }, expenses: [exp({ id: 'a' }), exp({ id: 'b' })] }),
      '2026-11-06',
    )!
    const { state, added } = mergeStates(current, incoming)
    expect(added).toBe(1)
    expect(state.expenses.map((e) => e.id)).toEqual(['a', 'b'])
    expect(state.budgets).toEqual({ '2026-10': 100, '2026-11': 900 })
    expect(state.currency).toBe('EUR')
  })

  it('loads backups made before income and assets existed', () => {
    const old = JSON.stringify({ version: 1, currency: 'EUR', budgets: {}, expenses: [exp({ id: 'x' })] })
    const s = parseImport(old, '2026-11-06')!
    expect(s.incomes).toEqual([])
    expect(s.assets).toEqual([])
    expect(s.expenses).toHaveLength(1)
  })

  it('merges income and assets too', () => {
    const a = { ...emptyState(), incomes: [inc({ id: 'i1' })], assets: [{ id: 'g', name: 'Gold', kind: 'gold' as const, value: 500, updatedAt: 1 }] }
    const b = {
      ...emptyState(),
      incomes: [inc({ id: 'i1' }), inc({ id: 'i2' })],
      assets: [{ id: 'c', name: 'Cash', kind: 'cash' as const, value: 50, updatedAt: 1 }],
    }
    const { state, added } = mergeStates(a, b)
    expect(added).toBe(2)
    expect(state.incomes.map((i) => i.id)).toEqual(['i1', 'i2'])
    expect(state.assets.map((x) => x.id)).toEqual(['g', 'c'])
  })

  it('rejects files that are not budget data', () => {
    expect(parseImport('not json', '2026-11-06')).toBeNull()
    expect(parseImport('{"hello":1}', '2026-11-06')).toBeNull()
  })
})

describe('csv and dates', () => {
  it('escapes CSV cells and includes income', () => {
    expect(toCSV([exp({ description: 'Dinner, "fancy"', category: 'food', amount: 30 })], [inc({ amount: 2000, createdAt: 2 })])).toBe(
      'Date,Type,Description,Category,Amount\n2026-11-06,Expense,"Dinner, ""fancy""",Food & drink,30.00\n2026-11-06,Income,Salary,Income,2000.00\n',
    )
  })
  it('handles month and day arithmetic', () => {
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
    expect(shiftMonth('2026-01', -1)).toBe('2025-12')
    expect(daysInMonth('2028-02')).toBe(29)
  })
})
