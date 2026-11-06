import { useMemo, useState } from 'react'
import type { CategoryId, Expense } from '../lib/types'
import { getCategory, normalizeText } from '../lib/categories'
import { formatDayHeading } from '../lib/dates'
import { formatMoney } from '../lib/money'
import { groupByDay } from '../lib/stats'

interface Props {
  items: Expense[]
  currency: string
  today: string
  category: CategoryId | null
  onEdit: (e: Expense) => void
}

export function ExpenseList({ items, currency, today, category, onEdit }: Props) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = normalizeText(query)
    return items.filter(
      (e) =>
        (!category || e.category === category) &&
        (!q || normalizeText(e.description).includes(q) || getCategory(e.category).label.toLowerCase().includes(q)),
    )
  }, [items, query, category])
  const groups = useMemo(() => groupByDay(filtered), [filtered])

  return (
    <section className="card" aria-labelledby="list-title">
      <div className="section-head">
        <h2 id="list-title">
          Expenses{category ? ` · ${getCategory(category).label}` : ''}
        </h2>
        {items.length > 0 && (
          <input
            type="search"
            className="search"
            placeholder="Search"
            aria-label="Search expenses"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        )}
      </div>

      {items.length === 0 ? (
        <p className="empty">Nothing here yet. Add your first expense above, e.g. “groceries 32.40”.</p>
      ) : groups.length === 0 ? (
        <p className="empty">No expenses match.</p>
      ) : (
        groups.map((g) => (
          <div key={g.date} className="day">
            <div className="day-head">
              <span>{formatDayHeading(g.date, today)}</span>
              <span>{formatMoney(g.total, currency)}</span>
            </div>
            <ul className="rows">
              {g.items.map((e) => {
                const c = getCategory(e.category)
                return (
                  <li key={e.id}>
                    <button type="button" className="row" onClick={() => onEdit(e)} aria-label={`Edit ${e.description}, ${formatMoney(e.amount, currency)}`}>
                      <span className="row-icon" style={{ background: `color-mix(in srgb, ${c.color} 18%, transparent)` }} aria-hidden="true">
                        {c.emoji}
                      </span>
                      <span className="row-text">
                        <span className="row-title">{e.description}</span>
                        <span className="row-sub">{c.label}</span>
                      </span>
                      <span className="row-amount">{formatMoney(e.amount, currency)}</span>
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
