import type { MonthSummary } from '../lib/stats'
import { formatMoney, formatSpend } from '../lib/money'
import { useI18n } from '../i18n'

interface Props {
  summary: MonthSummary
  currency: string
  isCurrentMonth: boolean
  onSetBudget: () => void
}

function MonthFlow({ summary, currency }: { summary: MonthSummary; currency: string }) {
  const { t } = useI18n()
  if (summary.income <= 0) return null
  const money = (n: number) => formatMoney(n, currency)
  const negative = summary.saved < 0
  return (
    <dl className="flow">
      <div>
        <dt>{t('flowIncome')}</dt>
        <dd className="income-text">{money(summary.income)}</dd>
      </div>
      <div>
        <dt>{t('flowSpent')}</dt>
        <dd className="danger-text">{formatSpend(summary.spent, currency)}</dd>
      </div>
      <div>
        <dt>{t(negative ? 'flowOverspent' : 'flowSaved')}</dt>
        <dd className={negative ? 'danger-text' : 'income-text'}>{money(Math.abs(summary.saved))}</dd>
      </div>
    </dl>
  )
}

export function Summary({ summary, currency, isCurrentMonth, onSetBudget }: Props) {
  const { t, tn, rich } = useI18n()
  const { spent, budget, remaining, daysLeft, perDay } = summary
  const money = (n: number) => formatMoney(n, currency)

  if (budget <= 0) {
    return (
      <section className="card summary">
        <p className="summary-label">{t('spentThisMonth')}</p>
        <p className="summary-big">{money(spent)}</p>
        <MonthFlow summary={summary} currency={currency} />
        <p className="summary-sub">
          {t('setBudgetHint')}{' '}
          <button type="button" className="link-btn" onClick={onSetBudget}>
            {t('setBudget')}
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
      <p className="summary-label">{t(over ? 'overBy' : 'leftToSpend')}</p>
      <p className="summary-big">{money(Math.abs(remaining))}</p>
      <div
        className="progress"
        role="progressbar"
        aria-label={t('budgetUsedAria')}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(Math.min(ratio, 1) * 100)}
      >
        <div className="progress-fill" style={{ width: `${Math.min(ratio, 1) * 100}%` }} />
      </div>
      <p className="summary-sub">
        {t('spentOf', { spent: money(spent), budget: money(budget) })} ·{' '}
        <button type="button" className="link-btn" onClick={onSetBudget}>
          {t('editBudget')}
        </button>
      </p>
      {isCurrentMonth && daysLeft > 0 && (
        <p className="summary-daily">
          {over ? tn('overDays', daysLeft) : rich(tn('perDay', daysLeft, { amount: '{amount}' }), { amount: <strong>{money(perDay)}</strong> })}
        </p>
      )}
      <MonthFlow summary={summary} currency={currency} />
    </section>
  )
}
