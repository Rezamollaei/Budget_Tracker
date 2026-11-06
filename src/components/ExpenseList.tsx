import { useMemo, useState } from 'react'
import type { CategoryId } from '../lib/types'
import { getCategory, normalizeText } from '../lib/categories'
import { formatDayHeading } from '../lib/dates'
import { formatMoney } from '../lib/money'
import { groupByDay, type Entry } from '../lib/stats'
import { useI18n } from '../i18n'

interface Props {
  items: Entry[]
  currency: string
  today: string
  category: CategoryId | null
  onEdit: (e: Entry) => void
}

export function ExpenseList({ items, currency, today, category, onEdit }: Props) {
  const { t, category: categoryName } = useI18n()
  const [query, setQuery] = useState('')
  const dayLabels = { today: t('today'), yesterday: t('yesterday') }

  const filtered = useMemo(() => {
    const q = normalizeText(query)
    return items.filter((e) => {
      if (category && (e.type !== 'expense' || e.category !== category)) return false
      if (!q) return true
      const label = (e.type === 'income' ? t('income') : categoryName(e.category)).toLowerCase()
      return normalizeText(e.description).includes(q) || label.includes(q)
    })
  }, [items, query, category, t, categoryName])
  const groups = useMemo(() => groupByDay(filtered), [filtered])

  return (
    <section className="card" aria-labelledby="list-title">
      <div className="section-head">
        <h2 id="list-title">{category ? t('listTitleCat', { cat: categoryName(category) }) : t('listTitle')}</h2>
        {items.length > 0 && (
          <input type="search" className="search" placeholder={t('search')} aria-label={t('search')} value={query} onChange={(e) => setQuery(e.target.value)} />
        )}
      </div>

      {items.length === 0 ? (
        <p className="empty">{t('emptyList')}</p>
      ) : groups.length === 0 ? (
        <p className="empty">{t('noMatch')}</p>
      ) : (
        groups.map((g) => (
          <div key={g.date} className="day">
            <div className="day-head">
              <span>{formatDayHeading(g.date, today, dayLabels)}</span>
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
                    <button type="button" className="row" onClick={() => onEdit(e)} aria-label={t('editAria', { name: e.description, amount })}>
                      <span className="row-icon" style={{ background: `color-mix(in srgb, ${color} 18%, transparent)` }} aria-hidden="true">
                        {c ? c.emoji : '💰'}
                      </span>
                      <span className="row-text">
                        <span className="row-title">{e.description}</span>
                        <span className="row-sub">{c ? categoryName(c.id) : t('income')}</span>
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
