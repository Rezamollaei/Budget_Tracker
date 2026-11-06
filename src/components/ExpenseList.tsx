import { useMemo, useState } from 'react'
import type { CategoryId } from '../lib/types'
import { getCategory, normalizeText } from '../lib/categories'
import { formatDayHeading } from '../lib/dates'
import { formatMoney } from '../lib/money'
import { groupByDay, type Entry } from '../lib/stats'

interface Props {
  items: Entry[]
  currency: string
  today: string
  category: CategoryId | null
  onEdit: (e: Entry) => void
}

export function ExpenseList({ items, currency, today, category, onEdit }: Props) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = normalizeText(query)
    return items.filter((e) => {
      if (category && (e.type !== 'expense' || e.category !== category)) return false
      if (!q) return true
      const label = e.type === 'income' ? 'income' : getCategory(e.category).label.toLowerCase()
      return normalizeText(e.description).includes(q) || label.includes(q)
    })
  }, [items, query, category])
  const groups = useMemo(() => groupByDay(filtered), [filtered])

  return (
    <section className="card" aria-labelledby="list-title">
      <div className="section-head">
        <h2 id="list-title">{category ? `Expenses · ${getCategory(category).label}` : 'Money in & out'}</h2>
        {items.length > 0 && (
          <input type="search" className="search" placeholder="Search" aria-label="Search" value={query} onChange={(e) => setQuery(e.target.value)} />
        )}
      </div>

      {items.length === 0 ? (
        <p className="empty">Nothing here yet. Add your first expense above, e.g. “groceries 32.40”.</p>
      ) : groups.length === 0 ? (
        <p className="empty">Nothing matches.</p>
      ) : (
        groups.map((g) => (
          <div key={g.date} className="day">
            <div className="day-head">
              <span>{formatDayHeading(g.date, today)}</span>
              <span>
                {g.earned > 0 && <span className="income-text">+{formatMoney(g.earned, currency)}</span>}
                {g.earned > 0 && g.spent > 0 && ' · '}
                {g.spent > 0 && formatMoney(g.spent, currency)}
              </span>
            </div>
            <ul className="rows">
              {g.items.map((e) => {
                const isIncome = e.type === 'income'
                const c = isIncome ? null : getCategory(e.category)
                const color = c ? c.color : '#16a34a'
                const amount = `${isIncome ? '+' : ''}${formatMoney(e.amount, currency)}`
                return (
                  <li key={e.id}>
                    <button type="button" className="row" onClick={() => onEdit(e)} aria-label={`Edit ${e.description}, ${amount}`}>
                      <span className="row-icon" style={{ background: `color-mix(in srgb, ${color} 18%, transparent)` }} aria-hidden="true">
                        {c ? c.emoji : '💰'}
                      </span>
                      <span className="row-text">
                        <span className="row-title">{e.description}</span>
                        <span className="row-sub">{c ? c.label : 'Income'}</span>
                      </span>
                      <span className={`row-amount${isIncome ? ' income-text' : ''}`}>{amount}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ))
      )}
    </section>
  )
}
