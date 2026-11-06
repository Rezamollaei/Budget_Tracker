import { useEffect, useState } from 'react'
import type { Asset, CategoryId } from '../lib/types'
import { getAssetKind } from '../lib/assets'
import type { Entry } from '../lib/stats'
import { amountForInput, parseAmount } from '../lib/money'
import { CategoryPicker } from './CategoryPicker'
import { Modal } from './Modal'
import { useI18n } from '../i18n'

interface Props {
  entry: Entry | null
  accounts: Asset[]
  onClose: () => void
  onSave: (e: Entry) => void
  onDelete: (e: Entry) => void
}

export function EditDialog({ entry, accounts, onClose, onSave, onDelete }: Props) {
  const { t } = useI18n()
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<CategoryId>('other')
  const [date, setDate] = useState('')
  const [accountId, setAccountId] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!entry) return
    setAmount(amountForInput(entry.amount))
    setDescription(entry.description)
    setCategory(entry.type === 'expense' ? entry.category : 'other')
    setDate(entry.date)
    setAccountId(entry.accountId ?? '')
    setError('')
  }, [entry])

  function save(e: React.FormEvent) {
    e.preventDefault()
    if (!entry) return
    const value = parseAmount(amount)
    if (value === null) return setError(t('errAmount'))
    if (!date) return setError(t('errDate'))
    const common = { amount: value, description: description.trim() || entry.description, date, accountId: accountId || undefined }
    onSave(entry.type === 'expense' ? { ...entry, ...common, category } : { ...entry, ...common })
  }

  const isIncome = entry?.type === 'income'

  return (
    <Modal open={entry !== null} title={t(isIncome ? 'editIncome' : 'editExpense')} onClose={onClose}>
      <form className="form" onSubmit={save}>
        <label>
          {t('amount')}
          <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" autoFocus />
        </label>
        <label>
          {t('description')}
          <input value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
        <label>
          {t('date')}
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        {(accounts.length > 0 || accountId) && (
          <label>
            {t(isIncome ? 'paidInto' : 'paidFrom')}
            <select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
              <option value="">{t('noAccount')}</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {getAssetKind(a.kind).emoji} {a.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {!isIncome && (
          <div>
            <span className="field-label">{t('category')}</span>
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
            {t('delete')}
          </button>
          <span className="spacer" />
          <button type="button" className="btn" onClick={onClose}>
            {t('cancel')}
          </button>
          <button type="submit" className="btn btn-primary">
            {t('save')}
          </button>
        </div>
      </form>
    </Modal>
  )
}
