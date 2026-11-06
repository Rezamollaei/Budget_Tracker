import { useEffect, useState } from 'react'
import type { Asset, AssetKind } from '../lib/types'
import { ASSET_KINDS, ASSET_PRESETS, getAssetKind } from '../lib/assets'
import { parseAmount } from '../lib/money'
import { Modal } from './Modal'

export type AssetDraft = Pick<Asset, 'name' | 'kind'> & { value?: number; id?: string }

interface Props {
  /** null = closed. A draft without an id creates a new item. */
  draft: AssetDraft | null
  onClose: () => void
  onSave: (a: { id?: string; name: string; kind: AssetKind; value: number }) => void
  onDelete: (id: string) => void
}

const HINTS: Partial<Record<AssetKind, string>> = {
  owed: 'Money friends owe you. In Splitwise, copy the “you are owed” total.',
  debt: 'Money you owe others. In Splitwise, copy the “you owe” total. This is subtracted from your total.',
  gold: 'Type what your gold is worth today. Update it when the price changes.',
}

export function AssetDialog({ draft, onClose, onSave, onDelete }: Props) {
  const [name, setName] = useState('')
  const [kind, setKind] = useState<AssetKind>('cash')
  const [value, setValue] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!draft) return
    setName(draft.name)
    setKind(draft.kind)
    setValue(draft.value !== undefined ? String(draft.value) : '')
    setError('')
  }, [draft])

  const isNew = !draft?.id

  function save(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = value.trim()
    const amount = trimmed === '0' ? 0 : parseAmount(trimmed)
    if (amount === null) return setError('Enter a value, for example 1200. Use 0 if it’s empty right now.')
    onSave({ id: draft?.id, name: name.trim() || getAssetKind(kind).label, kind, value: amount })
  }

  return (
    <Modal open={draft !== null} title={isNew ? 'Add to what I own' : 'Update value'} onClose={onClose}>
      <form className="form" onSubmit={save}>
        {isNew && (
          <div>
            <span className="field-label">Quick start</span>
            <div className="chips">
              {ASSET_PRESETS.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  className={`chip${name === p.name ? ' chip-on' : ''}`}
                  style={{ ['--chip' as string]: getAssetKind(p.kind).color }}
                  onClick={() => {
                    setName(p.name)
                    setKind(p.kind)
                  }}
                >
                  <span aria-hidden="true">{getAssetKind(p.kind).emoji}</span> {p.name}
                </button>
              ))}
            </div>
          </div>
        )}
        <label>
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={getAssetKind(kind).example} />
        </label>
        <label>
          Type
          <select value={kind} onChange={(e) => setKind(e.target.value as AssetKind)}>
            {ASSET_KINDS.map((k) => (
              <option key={k.id} value={k.id}>
                {k.emoji} {k.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          {getAssetKind(kind).liability ? 'Amount you owe' : 'Current value'}
          <input value={value} onChange={(e) => setValue(e.target.value)} inputMode="decimal" placeholder="0" autoFocus={!isNew} />
          {HINTS[kind] && <span className="hint">{HINTS[kind]}</span>}
        </label>
        {error && (
          <p className="entry-error" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions">
          {!isNew && (
            <button type="button" className="btn btn-danger" onClick={() => draft?.id && onDelete(draft.id)}>
              Delete
            </button>
          )}
          <span className="spacer" />
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            {isNew ? 'Add' : 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
