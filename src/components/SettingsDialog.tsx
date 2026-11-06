import { useEffect, useRef, useState } from 'react'
import { CURRENCIES, amountForInput, parseAmount } from '../lib/money'
import { formatMonth } from '../lib/dates'
import { Modal } from './Modal'
import { useI18n } from '../i18n'

interface Props {
  open: boolean
  month: string
  currency: string
  budget: number
  itemCount: number
  onClose: () => void
  onSave: (currency: string, budget: number) => void
  onExportCSV: () => void
  onBackup: () => void
  onImport: (file: File) => void
  onEraseAll: () => void
}

export function SettingsDialog(props: Props) {
  const { open, month, currency, budget, itemCount, onClose, onSave, onExportCSV, onBackup, onImport, onEraseAll } = props
  const { t, tn } = useI18n()
  const [cur, setCur] = useState(currency)
  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setCur(currency)
    setAmount(budget > 0 ? amountForInput(budget) : '')
    setError('')
  }, [open, currency, budget])

  function save(e: React.FormEvent) {
    e.preventDefault()
    let value = 0
    if (amount.trim()) {
      const parsed = parseAmount(amount)
      if (parsed === null) return setError(t('errBudget'))
      value = parsed
    }
    onSave(cur, value)
  }

  const currencies = CURRENCIES.includes(cur) ? CURRENCIES : [cur, ...CURRENCIES]

  return (
    <Modal open={open} title={t('settingsTitle')} onClose={onClose}>
      <form className="form" onSubmit={save}>
        <label>
          {t('monthlyBudget')}
          <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder={t('budgetPlaceholder')} autoFocus />
          <span className="hint">{t('budgetHint', { month: formatMonth(month) })}</span>
        </label>
        <label>
          {t('currency')}
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
            {t('cancel')}
          </button>
          <button type="submit" className="btn btn-primary">
            {t('save')}
          </button>
        </div>
      </form>

      <hr />
      <h3>{t('yourData')}</h3>
      <p className="hint">
        {tn('dataHint', itemCount)}
      </p>
      <div className="data-actions">
        <button type="button" className="btn" onClick={onExportCSV} disabled={itemCount === 0}>
          {t('exportCsv')}
        </button>
        <button type="button" className="btn" onClick={onBackup}>
          {t('backup')}
        </button>
        <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
          {t('importBackup')}
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
      <p className="hint">{t('importHint')}</p>
      <button type="button" className="btn btn-danger btn-small" onClick={onEraseAll} disabled={itemCount === 0}>
        {t('eraseAll')}
      </button>
    </Modal>
  )
}
