import { useEffect, useState } from 'react'
import type { CategoryId } from '../lib/types'
import type { Entry } from '../lib/stats'
import { parseAmount } from '../lib/money'
import { CategoryPicker } from './CategoryPicker'
import { Modal } from './Modal'

interface Props {
  entry: Entry | null
  onClose: () => void
  onSave: (e: Entry) => void
  onDelete: (e: Entry) => void
}

export function EditDialog({ entry, onClose, onSave, onDelete }: Props) {
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<CategoryId>('other')
  const [date, setDate] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!entry) return
    setAmount(String(entry.amount))
    setDescription(entry.description)
    setCategory(entry.type === 'expense' ? entry.category : 'other')
    setDate(entry.date)
    setError('')
  }, [entry])

  function save(e: React.FormEvent) {
    e.preventDefault()
    if (!entry) return
    const value = parseAmount(amount)
    if (value === null) return setError('Enter an amount greater than zero.')
    if (!date) return setError('Pick a date.')
    const common = { amount: value, description: description.trim() || entry.description, date }
    onSave(entry.type === 'expense' ? { ...entry, ...common, category } : { ...entry, ...common })
  }

  const isIncome = entry?.type === 'income'

  return (
    <Modal open={entry !== null} title={isIncome ? 'Edit income' : 'Edit expense'} onClose={onClose}>
      <form className="form" onSubmit={save}>
        <label>
          Amount
          <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" autoFocus />
        </label>
        <label>
          Description
          <input value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
        <label>
          Date
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        {!isIncome && (
          <div>
            <span className="field-label">Category</span>
            <CategoryPicker value={category} onChange={setCategory} />
          </div>
        )}
        {error && (
          <p className="entry-error" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions">
          <button type="button" className="btn btn-danger" onClick={() => entry && onDelete(entry)}>
            Delete
          </button>
          <span className="spacer" />
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            Save
          </button>
        </div>
      </form>
    </Modal>
  )
}
