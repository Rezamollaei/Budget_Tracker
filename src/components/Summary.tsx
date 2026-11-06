import type { MonthSummary } from '../lib/stats'
import { formatMoney } from '../lib/money'

interface Props {
  summary: MonthSummary
  currency: string
  isCurrentMonth: boolean
  onSetBudget: () => void
}

export function Summary({ summary, currency, isCurrentMonth, onSetBudget }: Props) {
  const { spent, budget, remaining, daysLeft, perDay } = summary
  const money = (n: number) => formatMoney(n, currency)

  if (budget <= 0) {
    return (
      <section className="card summary">
        <p className="summary-label">Spent this month</p>
        <p className="summary-big">{money(spent)}</p>
        <p className="summary-sub">
          Set a monthly budget to see how much you have left each day.{' '}
          <button type="button" className="link-btn" onClick={onSetBudget}>
            Set budget
          </button>
        </p>
      </section>
    )
  }

  const ratio = spent / budget
  const level = ratio > 1 ? 'over' : ratio > 0.85 ? 'warn' : 'ok'
  const over = remaining < 0

  return (
    <section className={`card summary summary-${level}`}>
      <p className="summary-label">{over ? 'Over budget by' : 'Left to spend'}</p>
      <p className="summary-big">{money(Math.abs(remaining))}</p>
      <div
        className="progress"
        role="progressbar"
        aria-label="Budget used"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(Math.min(ratio, 1) * 100)}
      >
        <div className="progress-fill" style={{ width: `${Math.min(ratio, 1) * 100}%` }} />
      </div>
      <p className="summary-sub">
        {money(spent)} of {money(budget)} spent ·{' '}
        <button type="button" className="link-btn" onClick={onSetBudget}>
          Edit budget
        </button>
      </p>
      {isCurrentMonth && daysLeft > 0 && (
        <p className="summary-daily">
          {over ? (
            <>You’re over budget with {daysLeft} {daysLeft === 1 ? 'day' : 'days'} to go.</>
          ) : (
            <>
              You can spend about <strong>{money(perDay)}</strong> a day for the next {daysLeft} {daysLeft === 1 ? 'day' : 'days'}.
            </>
          )}
        </p>
      )}
    </section>
  )
}
