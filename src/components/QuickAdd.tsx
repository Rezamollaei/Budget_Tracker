import { forwardRef, useMemo, useState } from 'react'
import type { Asset, CategoryId, Expense, Income } from '../lib/types'
import { parseEntry } from '../lib/parse'
import { getCategory, guessCategory } from '../lib/categories'
import { addDays, formatDayHeading } from '../lib/dates'
import { formatEarn, formatMoney, formatSpend } from '../lib/money'
import { defaultAccountId, getAssetKind } from '../lib/assets'
import { favorites } from '../lib/stats'
import { CategoryPicker } from './CategoryPicker'
import { useI18n } from '../i18n'

export type NewExpense = Omit<Expense, 'id' | 'createdAt'>
export type NewIncome = Omit<Income, 'id' | 'createdAt'>

interface Props {
  expenses: Expense[]
  incomes: Income[]
  /** Cash, bank and savings accounts with their current balances. */
  accounts: Asset[]
  currency: string
  today: string
  onAdd: (e: NewExpense) => void
  onAddIncome: (i: NewIncome) => void
}

type Mode = 'expense' | 'income'

export const QuickAdd = forwardRef<HTMLInputElement, Props>(function QuickAdd({ expenses, incomes, accounts, currency, today, onAdd, onAddIncome }, inputRef) {
  const { t, category: categoryName } = useI18n()
  const [mode, setMode] = useState<Mode>('expense')
  const [text, setText] = useState('')
  const [manualCategory, setManualCategory] = useState<CategoryId | null>(null)
  const [manualDate, setManualDate] = useState<string | null>(null)
  /** undefined = use the default account; null = not linked. */
  const [manualAccount, setManualAccount] = useState<string | null | undefined>(undefined)
  const [error, setError] = useState('')
  const [showDetails, setShowDetails] = useState(false)

  const parsed = useMemo(() => parseEntry(text), [text])
  const isIncome = mode === 'income' || parsed.income
  const guessed = useMemo(() => guessCategory(parsed.description, expenses), [parsed.description, expenses])
  const category: CategoryId = manualCategory ?? guessed ?? 'other'
  const date = manualDate ?? addDays(today, parsed.dayOffset)
  const favs = useMemo(() => favorites(expenses), [expenses])
  const defaultExpenseAccount = useMemo(() => defaultAccountId(accounts, expenses, 'cash'), [accounts, expenses])
  const defaultIncomeAccount = useMemo(() => defaultAccountId(accounts, incomes, 'bank'), [accounts, incomes])
  const accountId = manualAccount === undefined ? (isIncome ? defaultIncomeAccount : defaultExpenseAccount) : (manualAccount ?? undefined)

  function reset() {
    setText('')
    setManualCategory(null)
    setManualDate(null)
    setManualAccount(undefined)
    setError('')
    setShowDetails(false)
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (parsed.amount === null) {
      const example = t(isIncome ? 'exampleIncome' : 'exampleExpense')
      setError(t(text.trim() ? 'errNoAmount' : 'errEmpty', { example }))
      return
    }
    if (isIncome) {
      onAddIncome({ amount: parsed.amount, description: parsed.description || t('income'), date, accountId })
    } else {
      onAdd({ amount: parsed.amount, description: parsed.description || categoryName(category), category, date, accountId })
    }
    reset()
  }

  const cat = getCategory(category)
  const icon = isIncome ? '💰' : cat.emoji
  const label = parsed.description || (isIncome ? t('income') : categoryName(cat.id))
  const dayLabels = { today: t('today'), yesterday: t('yesterday') }

  return (
    <section className={`card quick-add${isIncome ? ' quick-add-income' : ''}`} aria-labelledby="quick-add-title">
      <h2 id="quick-add-title" className="sr-only">
        {t('addTitle')}
      </h2>
      <div className="segmented" role="radiogroup" aria-label={t('typeAria')}>
        {(['expense', 'income'] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={mode === m}
            className={mode === m ? 'on' : ''}
            onClick={() => {
              setMode(m)
              setError('')
              if (typeof inputRef !== 'function') inputRef?.current?.focus()
            }}
          >
            {t(m)}
          </button>
        ))}
      </div>
      <form onSubmit={submit}>
        <div className="entry-row">
          <input
            ref={inputRef}
            className="entry-input"
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              setError('')
            }}
            placeholder={t(mode === 'income' ? 'placeholderIncome' : 'placeholderExpense')}
            aria-label={t(mode === 'income' ? 'ariaIncome' : 'ariaExpense')}
            aria-describedby="entry-help"
            autoComplete="off"
            enterKeyHint="done"
          />
          <button type="submit" className="btn btn-primary">
            {t('add')}
          </button>
        </div>

        {error ? (
          <p className="entry-error" role="alert">
            {error}
          </p>
        ) : text.trim() ? (
          <p className="entry-preview" id="entry-help">
            <span aria-hidden="true">{icon}</span> <strong>{label}</strong>
            {' · '}
            {parsed.amount !== null ? (
              <span className={isIncome ? 'income-text' : 'danger-text'}>
                {isIncome ? formatEarn(parsed.amount, currency) : formatSpend(parsed.amount, currency)}
              </span>
            ) : (
              <em>{t('noAmountYet')}</em>
            )}
            {' · '}
            {isIncome ? (
              t('income')
            ) : (
              <button type="button" className="link-btn" onClick={() => setShowDetails((v) => !v)}>
                {categoryName(cat.id)}
              </button>
            )}
            {' · '}
            <button type="button" className="link-btn" onClick={() => setShowDetails((v) => !v)}>
              {formatDayHeading(date, today, dayLabels)}
            </button>
          </p>
        ) : (
          <p className="entry-help" id="entry-help">
            {t(mode === 'income' ? 'helpIncome' : 'helpExpense')}
          </p>
        )}

        {(showDetails || (!isIncome && text.trim() !== '' && guessed === null && manualCategory === null)) && (
          <div className="details">
            {!isIncome && <CategoryPicker value={category} onChange={setManualCategory} guessed={manualCategory === null && guessed !== null} />}
            <label className="date-field">
              {t('date')}
              <input type="date" value={date} max={today} onChange={(e) => setManualDate(e.target.value || null)} />
            </label>
          </div>
        )}
        {accounts.length > 0 && (
          <div className="accounts-row">
            <span className="favorites-label">{t(isIncome ? 'paidInto' : 'paidFrom')}</span>
            <div className="chips" role="radiogroup" aria-label={t(isIncome ? 'paidInto' : 'paidFrom')}>
              {accounts.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  role="radio"
                  aria-checked={accountId === a.id}
                  className={`chip chip-small${accountId === a.id ? ' chip-on' : ''}`}
                  style={{ ['--chip' as string]: getAssetKind(a.kind).color }}
                  onClick={() => setManualAccount(a.id)}
                >
                  <span aria-hidden="true">{getAssetKind(a.kind).emoji}</span> {a.name}{' '}
                  <span className={a.value < 0 ? 'danger-text' : 'muted'}>{formatMoney(a.value, currency)}</span>
                </button>
              ))}
              <button
                type="button"
                role="radio"
                aria-checked={accountId === undefined}
                className={`chip chip-small${accountId === undefined ? ' chip-on' : ''}`}
                onClick={() => setManualAccount(null)}
              >
                {t('noAccount')}
              </button>
            </div>
          </div>
        )}
      </form>

      {mode === 'expense' && favs.length > 0 && (
        <div className="favorites">
          <span className="favorites-label">{t('favorites')}</span>
          <div className="chips">
            {favs.map((f) => {
              const c = getCategory(f.category)
              return (
                <button
                  key={`${f.description}|${f.amount}`}
                  type="button"
                  className="chip"
                  onClick={() => onAdd({ amount: f.amount, description: f.description, category: f.category, date: today, accountId: defaultExpenseAccount })}
                >
                  <span aria-hidden="true">{c.emoji}</span> {f.description} <span className="muted">{formatSpend(f.amount, currency)}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
})
