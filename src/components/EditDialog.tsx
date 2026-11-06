import { useEffect, useState } from 'react'
import type { CategoryId, Expense } from '../lib/types'
import { parseAmount } from '../lib/money'
import { CategoryPicker } from './CategoryPicker'
import { Modal } from './Modal'

interface Props {
  expense: Expense | null
  onClose: () => void
  onSave: (e: Expense) => void
  onDelete: (e: Expense) => void
}

export function EditDialog({ expense, onClose, onSave, onDelete }: Props) {
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<CategoryId>('other')
  const [date, setDate] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!expense) return
    setAmount(String(expense.amount))
    setDescription(expense.description)
    setCategory(expense.category)
    setDate(expense.date)
    setError('')
  }, [expense])

  function save(e: React.FormEvent) {
    e.preventDefault()
    if (!expense) return
    const value = parseAmount(amount)
    if (value === null) return setError('Enter an amount greater than zero.')
    if (!date) return setError('Pick a date.')
    onSave({ ...expense, amount: value, description: description.trim() || expense.description, category, date })
  }

  return (
    <Modal open={expense !== null} title="Edit expense" onClose={onClose}>
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
        <div>
          <span className="field-label">Category</span>
          <CategoryPicker value={category} onChange={setCategory} />
        </div>
        {error && (
          <p className="entry-error" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions">
          <button type="button" className="btn btn-danger" onClick={() => expense && onDelete(expense)}>
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
