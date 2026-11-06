import { useEffect, useState } from 'react'
import type { Asset, AssetKind } from '../lib/types'
import type { MessageKey } from '../lib/i18n'
import { ASSET_KINDS, ASSET_PRESETS, getAssetKind } from '../lib/assets'
import { amountForInput, parseAmount } from '../lib/money'
import { Modal } from './Modal'
import { useI18n } from '../i18n'

export type AssetDraft = Pick<Asset, 'name' | 'kind'> & { value?: number; id?: string }

interface Props {
  /** null = closed. A draft without an id creates a new item. */
  draft: AssetDraft | null
  onClose: () => void
  onSave: (a: { id?: string; name: string; kind: AssetKind; value: number }) => void
  onDelete: (id: string) => void
}

const HINTS: Partial<Record<AssetKind, MessageKey>> = {
  splitwise: 'hint.splitwise',
  debt: 'hint.debt',
  gold: 'hint.gold',
}

export function AssetDialog({ draft, onClose, onSave, onDelete }: Props) {
  const { t, assetKind } = useI18n()
  const [name, setName] = useState('')
  const [kind, setKind] = useState<AssetKind>('cash')
  const [value, setValue] = useState('')
  /** Splitwise only: true when you owe (negative balance). */
  const [iOwe, setIOwe] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!draft) return
    setName(draft.name)
    setKind(draft.kind)
    setValue(draft.value !== undefined ? amountForInput(Math.abs(draft.value)) : '')
    setIOwe((draft.value ?? 0) < 0)
    setError('')
  }, [draft])

  const isNew = !draft?.id
  const info = getAssetKind(kind)

  function save(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = value.trim().replace(/^-/, '')
    const amount = /^0+([.,]0+)?$/.test(trimmed) ? 0 : parseAmount(trimmed)
    if (amount === null) return setError(t('errValue'))
    const signed = info.signed && iOwe ? -amount : amount
    onSave({ id: draft?.id, name: name.trim() || assetKind(kind), kind, value: signed })
  }

  return (
    <Modal open={draft !== null} title={t(isNew ? 'addAssetTitle' : 'updateValue')} onClose={onClose}>
      <form className="form" onSubmit={save}>
        {isNew && (
          <div>
            <span className="field-label">{t('quickStart')}</span>
            <div className="chips">
              {ASSET_PRESETS.map((k) => (
                <button
                  key={k}
                  type="button"
                  className={`chip${kind === k && name === assetKind(k) ? ' chip-on' : ''}`}
                  style={{ ['--chip' as string]: getAssetKind(k).color }}
                  onClick={() => {
                    setName(assetKind(k))
                    setKind(k)
                  }}
                >
                  <span aria-hidden="true">{getAssetKind(k).emoji}</span> {assetKind(k)}
                </button>
              ))}
            </div>
          </div>
        )}
        <label>
          {t('name')}
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t(`example.${kind}` as MessageKey)} />
        </label>
        <label>
          {t('type')}
          <select value={kind} onChange={(e) => setKind(e.target.value as AssetKind)}>
            {ASSET_KINDS.map((k) => (
              <option key={k.id} value={k.id}>
                {k.emoji} {assetKind(k.id)}
              </option>
            ))}
          </select>
        </label>
        {info.signed && (
          <div>
            <span className="field-label">{t('swDirection')}</span>
            <div className="segmented" role="radiogroup" aria-label={t('swDirection')}>
              <button type="button" role="radio" aria-checked={!iOwe} className={!iOwe ? 'on' : ''} onClick={() => setIOwe(false)}>
                {t('swTheyOwe')}
              </button>
              <button type="button" role="radio" aria-checked={iOwe} className={iOwe ? 'on on-danger' : ''} onClick={() => setIOwe(true)}>
                {t('swIOwe')}
              </button>
            </div>
          </div>
        )}
        <label>
          {t(info.liability ? 'amountOwe' : info.signed ? 'balance' : 'currentValue')}
          <input value={value} onChange={(e) => setValue(e.target.value)} inputMode="decimal" placeholder="0" autoFocus={!isNew} />
          {HINTS[kind] && <span className="hint">{t(HINTS[kind]!)}</span>}
        </label>
        {error && (
          <p className="entry-error" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions">
          {!isNew && (
            <button type="button" className="btn btn-danger" onClick={() => draft?.id && onDelete(draft.id)}>
              {t('delete')}
            </button>
          )}
          <span className="spacer" />
          <button type="button" className="btn" onClick={onClose}>
            {t('cancel')}
          </button>
          <button type="submit" className="btn btn-primary">
            {t(isNew ? 'add' : 'save')}
          </button>
        </div>
      </form>
    </Modal>
  )
}
