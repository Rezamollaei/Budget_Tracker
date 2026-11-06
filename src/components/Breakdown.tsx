import type { MonthSummary } from '../lib/stats'
import { getCategory } from '../lib/categories'
import { formatMoney } from '../lib/money'
import type { CategoryId } from '../lib/types'
import { useI18n } from '../i18n'

interface Props {
  summary: MonthSummary
  currency: string
  selected: CategoryId | null
  onSelect: (id: CategoryId | null) => void
}

export function Breakdown({ summary, currency, selected, onSelect }: Props) {
  const { t, category: categoryName } = useI18n()
  if (summary.byCategory.length === 0) return null
  const max = summary.byCategory[0].total

  return (
    <section className="card" aria-labelledby="breakdown-title">
      <div className="section-head">
        <h2 id="breakdown-title">{t('whereItWent')}</h2>
        {selected && (
          <button type="button" className="link-btn" onClick={() => onSelect(null)}>
            {t('showAll')}
          </button>
        )}
      </div>
      <ul className="bars">
        {summary.byCategory.map(({ category, total, count }) => {
          const c = getCategory(category)
          const share = summary.spent > 0 ? Math.round((total / summary.spent) * 100) : 0
          return (
            <li key={category}>
              <button
                type="button"
                className={`bar-row${selected === category ? ' bar-row-on' : ''}`}
                aria-pressed={selected === category}
                onClick={() => onSelect(selected === category ? null : category)}
              >
                <span className="bar-label">
                  <span aria-hidden="true">{c.emoji}</span> {categoryName(c.id)}
                  <span className="muted"> · {count}</span>
                </span>
                <span className="bar-value">
                  {formatMoney(total, currency)} <span className="muted">{share}%</span>
                </span>
                <span className="bar-track" aria-hidden="true">
                  <span className="bar-fill" style={{ width: `${(total / max) * 100}%`, background: c.color }} />
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
