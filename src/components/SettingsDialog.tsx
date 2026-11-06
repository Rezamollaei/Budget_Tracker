import { useEffect, useRef, useState } from 'react'
import { CURRENCIES, parseAmount } from '../lib/money'
import { formatMonth } from '../lib/dates'
import { Modal } from './Modal'

interface Props {
  open: boolean
  month: string
  currency: string
  budget: number
  expenseCount: number
  onClose: () => void
  onSave: (currency: string, budget: number) => void
  onExportCSV: () => void
  onBackup: () => void
  onImport: (file: File) => void
  onEraseAll: () => void
}

export function SettingsDialog(props: Props) {
  const { open, month, currency, budget, expenseCount, onClose, onSave, onExportCSV, onBackup, onImport, onEraseAll } = props
  const [cur, setCur] = useState(currency)
  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setCur(currency)
    setAmount(budget > 0 ? String(budget) : '')
    setError('')
  }, [open, currency, budget])

  function save(e: React.FormEvent) {
    e.preventDefault()
    let value = 0
    if (amount.trim()) {
      const parsed = parseAmount(amount)
      if (parsed === null) return setError('Enter a budget greater than zero, or leave it empty for no budget.')
      value = parsed
    }
    onSave(cur, value)
  }

  const currencies = CURRENCIES.includes(cur) ? CURRENCIES : [cur, ...CURRENCIES]

  return (
    <Modal open={open} title="Budget & settings" onClose={onClose}>
      <form className="form" onSubmit={save}>
        <label>
          Monthly budget
          <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="e.g. 1500" autoFocus />
          <span className="hint">Applies from {formatMonth(month)} onwards, until you change it again.</span>
        </label>
        <label>
          Currency
          <select value={cur} onChange={(e) => setCur(e.target.value)}>
            {currencies.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        {error && (
          <p className="entry-error" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions">
          <span className="spacer" />
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            Save
          </button>
        </div>
      </form>

      <hr />
      <h3>Your data</h3>
      <p className="hint">
        Everything is stored privately in this browser ({expenseCount} {expenseCount === 1 ? 'expense' : 'expenses'}). Download a backup now and then,
        or to move to another device.
      </p>
      <div className="data-actions">
        <button type="button" className="btn" onClick={onExportCSV} disabled={expenseCount === 0}>
          Export CSV (Excel)
        </button>
        <button type="button" className="btn" onClick={onBackup}>
          Download backup
        </button>
        <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
          Import backup
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) onImport(f)
            e.target.value = ''
          }}
        />
      </div>
      <p className="hint">Import also accepts the <code>budget_data.json</code> file from the old Python version.</p>
      <button type="button" className="btn btn-danger btn-small" onClick={onEraseAll} disabled={expenseCount === 0}>
        Erase all data…
      </button>
    </Modal>
  )
}
