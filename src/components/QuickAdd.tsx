import { forwardRef, useMemo, useState } from 'react'
import type { CategoryId, Expense } from '../lib/types'
import { parseEntry } from '../lib/parse'
import { getCategory, guessCategory } from '../lib/categories'
import { addDays, formatDayHeading } from '../lib/dates'
import { formatMoney } from '../lib/money'
import { favorites } from '../lib/stats'
import { CategoryPicker } from './CategoryPicker'

export type NewExpense = Omit<Expense, 'id' | 'createdAt'>

interface Props {
  expenses: Expense[]
  currency: string
  today: string
  onAdd: (e: NewExpense) => void
}

export const QuickAdd = forwardRef<HTMLInputElement, Props>(function QuickAdd({ expenses, currency, today, onAdd }, inputRef) {
  const [text, setText] = useState('')
  const [manualCategory, setManualCategory] = useState<CategoryId | null>(null)
  const [manualDate, setManualDate] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [showDetails, setShowDetails] = useState(false)

  const parsed = useMemo(() => parseEntry(text), [text])
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
      setError(text.trim() ? 'Add an amount, for example “lunch 12.50”.' : 'Type what you spent, for example “coffee 4.50”.')
      return
    }
    onAdd({
      amount: parsed.amount,
      description: parsed.description || getCategory(category).label,
      category,
      date,
    })
    reset()
  }

  const cat = getCategory(category)

  return (
    <section className="card quick-add" aria-labelledby="quick-add-title">
      <h2 id="quick-add-title" className="sr-only">
        Add an expense
      </h2>
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
            placeholder="coffee 4.50"
            aria-label="What did you spend? Type a description and an amount"
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
            <span aria-hidden="true">{cat.emoji}</span> <strong>{parsed.description || cat.label}</strong>
            {' · '}
            {parsed.amount !== null ? formatMoney(parsed.amount, currency) : <em>no amount yet</em>}
            {' · '}
            <button type="button" className="link-btn" onClick={() => setShowDetails((v) => !v)}>
              {cat.label}
            </button>
            {' · '}
            <button type="button" className="link-btn" onClick={() => setShowDetails((v) => !v)}>
              {formatDayHeading(date, today)}
            </button>
          </p>
        ) : (
          <p className="entry-help" id="entry-help">
            Type a description and amount, then press Enter. Add “yesterday” for yesterday. Press <kbd>/</kbd> to jump here.
          </p>
        )}

        {(showDetails || (text.trim() !== '' && guessed === null && manualCategory === null)) && (
          <div className="details">
            <CategoryPicker value={category} onChange={setManualCategory} guessed={manualCategory === null && guessed !== null} />
            <label className="date-field">
              Date
              <input type="date" value={date} max={today} onChange={(e) => setManualDate(e.target.value || null)} />
            </label>
          </div>
        )}
      </form>

      {favs.length > 0 && (
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
