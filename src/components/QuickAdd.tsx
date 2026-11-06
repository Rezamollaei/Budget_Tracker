import { forwardRef, useMemo, useState } from 'react'
import type { CategoryId, Expense, Income } from '../lib/types'
import { parseEntry } from '../lib/parse'
import { getCategory, guessCategory } from '../lib/categories'
import { addDays, formatDayHeading } from '../lib/dates'
import { formatMoney } from '../lib/money'
import { favorites } from '../lib/stats'
import { CategoryPicker } from './CategoryPicker'

export type NewExpense = Omit<Expense, 'id' | 'createdAt'>
export type NewIncome = Omit<Income, 'id' | 'createdAt'>

interface Props {
  expenses: Expense[]
  currency: string
  today: string
  onAdd: (e: NewExpense) => void
  onAddIncome: (i: NewIncome) => void
}

type Mode = 'expense' | 'income'

export const QuickAdd = forwardRef<HTMLInputElement, Props>(function QuickAdd({ expenses, currency, today, onAdd, onAddIncome }, inputRef) {
  const [mode, setMode] = useState<Mode>('expense')
  const [text, setText] = useState('')
  const [manualCategory, setManualCategory] = useState<CategoryId | null>(null)
  const [manualDate, setManualDate] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [showDetails, setShowDetails] = useState(false)

  const parsed = useMemo(() => parseEntry(text), [text])
  const isIncome = mode === 'income' || parsed.income
  const guessed = useMemo(() => guessCategory(parsed.description, expenses), [parsed.description, expenses])
  const category: CategoryId = manualCategory ?? guessed ?? 'other'
  const date = manualDate ?? addDays(today, parsed.dayOffset)
  const favs = useMemo(() => favorites(expenses), [expenses])

  function reset() {
    setText('')
    setManualCategory(null)
    setManualDate(null)
    setError('')
    setShowDetails(false)
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (parsed.amount === null) {
      const example = isIncome ? '“salary 2500”' : '“lunch 12.50”'
      setError(text.trim() ? `Add an amount, for example ${example}.` : `Type a description and amount, for example ${example}.`)
      return
    }
    if (isIncome) {
      onAddIncome({ amount: parsed.amount, description: parsed.description || 'Income', date })
    } else {
      onAdd({ amount: parsed.amount, description: parsed.description || getCategory(category).label, category, date })
    }
    reset()
  }

  const cat = getCategory(category)
  const icon = isIncome ? '💰' : cat.emoji
  const label = parsed.description || (isIncome ? 'Income' : cat.label)

  return (
    <section className={`card quick-add${isIncome ? ' quick-add-income' : ''}`} aria-labelledby="quick-add-title">
      <h2 id="quick-add-title" className="sr-only">
        Add an expense or income
      </h2>
      <div className="segmented" role="radiogroup" aria-label="Type">
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
            {m === 'expense' ? 'Expense' : 'Income'}
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
            placeholder={mode === 'income' ? 'salary 2500' : 'coffee 4.50'}
            aria-label={mode === 'income' ? 'What money came in? Type a description and an amount' : 'What did you spend? Type a description and an amount'}
            aria-describedby="entry-help"
            autoComplete="off"
            enterKeyHint="done"
          />
          <button type="submit" className="btn btn-primary">
            Add
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
              <span className={isIncome ? 'income-text' : ''}>
                {isIncome ? '+' : ''}
                {formatMoney(parsed.amount, currency)}
              </span>
            ) : (
              <em>no amount yet</em>
            )}
            {' · '}
            {isIncome ? (
              'Income'
            ) : (
              <button type="button" className="link-btn" onClick={() => setShowDetails((v) => !v)}>
                {cat.label}
              </button>
            )}
            {' · '}
            <button type="button" className="link-btn" onClick={() => setShowDetails((v) => !v)}>
              {formatDayHeading(date, today)}
            </button>
          </p>
        ) : (
          <p className="entry-help" id="entry-help">
            {mode === 'income' ? (
              <>Salary, freelance work, gifts… type a description and amount, then press Enter.</>
            ) : (
              <>
                Type a description and amount, then press Enter. Add “yesterday” for yesterday. Start with <kbd>+</kbd> for income, like “+salary 2500”.
              </>
            )}
          </p>
        )}

        {(showDetails || (!isIncome && text.trim() !== '' && guessed === null && manualCategory === null)) && (
          <div className="details">
            {!isIncome && <CategoryPicker value={category} onChange={setManualCategory} guessed={manualCategory === null && guessed !== null} />}
            <label className="date-field">
              Date
              <input type="date" value={date} max={today} onChange={(e) => setManualDate(e.target.value || null)} />
            </label>
          </div>
        )}
      </form>

      {mode === 'expense' && favs.length > 0 && (
        <div className="favorites">
          <span className="favorites-label">Add again with one tap</span>
          <div className="chips">
            {favs.map((f) => {
              const c = getCategory(f.category)
              return (
                <button
                  key={`${f.description}|${f.amount}`}
                  type="button"
                  className="chip"
                  onClick={() => onAdd({ amount: f.amount, description: f.description, category: f.category, date: today })}
                >
                  <span aria-hidden="true">{c.emoji}</span> {f.description} <span className="muted">{formatMoney(f.amount, currency)}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
})
