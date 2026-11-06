import { useMemo } from 'react'
import type { Asset } from '../lib/types'
import { ASSET_KINDS, ASSET_PRESETS, formatUpdated, getAssetKind, summarizeAssets } from '../lib/assets'
import { formatMoney } from '../lib/money'
import type { AssetDraft } from './AssetDialog'

interface Props {
  assets: Asset[]
  currency: string
  savedThisMonth: number | null
  onOpen: (draft: AssetDraft) => void
}

const ORDER = new Map(ASSET_KINDS.map((k, i) => [k.id, i]))

export function AssetsView({ assets, currency, savedThisMonth, onOpen }: Props) {
  const summary = useMemo(() => summarizeAssets(assets), [assets])
  const sorted = useMemo(
    () => [...assets].sort((a, b) => ORDER.get(a.kind)! - ORDER.get(b.kind)! || b.value - a.value),
    [assets],
  )
  const money = (n: number) => formatMoney(n, currency)
  const now = Date.now()
  const max = Math.max(...summary.byKind.map((k) => k.total), 0)

  if (assets.length === 0) {
    return (
      <main className="layout">
        <section className="card">
          <h2>What I own</h2>
          <p className="hint" style={{ marginTop: 8 }}>
            Add your cash, bank accounts, savings, gold and anything else of value, plus what you owe or are owed (for example on Splitwise). You’ll
            see your total in one place. Update the values whenever they change.
          </p>
          <div className="chips">
            {ASSET_PRESETS.map((p) => (
              <button key={p.name} type="button" className="chip" onClick={() => onOpen({ name: p.name, kind: p.kind })}>
                <span aria-hidden="true">{getAssetKind(p.kind).emoji}</span> {p.name}
              </button>
            ))}
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="layout">
      <div className="col">
        <section className={`card summary${summary.total < 0 ? ' summary-over' : ''}`}>
          <p className="summary-label">{summary.owing > 0 ? 'Net worth (what I own − what I owe)' : 'Total I own'}</p>
          <p className="summary-big">{money(summary.total)}</p>
          {summary.owing > 0 && (
            <dl className="flow">
              <div>
                <dt>I own</dt>
                <dd className="income-text">{money(summary.owned)}</dd>
              </div>
              <div>
                <dt>I owe</dt>
                <dd className="danger-text">{money(summary.owing)}</dd>
              </div>
            </dl>
          )}
          {savedThisMonth !== null && (
            <p className="summary-daily">
              {savedThisMonth >= 0 ? (
                <>
                  You saved <strong>{money(savedThisMonth)}</strong> this month. Add it to your savings when you move it there.
                </>
              ) : (
                <>
                  You spent <strong>{money(-savedThisMonth)}</strong> more than you earned this month.
                </>
              )}
            </p>
          )}
        </section>

        <section className="card" aria-labelledby="kinds-title">
          <div className="section-head">
            <h2 id="kinds-title">By type</h2>
          </div>
          <ul className="bars">
            {summary.byKind.map(({ kind, total, count }) => {
              const k = getAssetKind(kind)
              return (
                <li key={kind} className="bar-row bar-static">
                  <span className="bar-label">
                    <span aria-hidden="true">{k.emoji}</span> {k.label}
                    <span className="muted"> · {count}</span>
                  </span>
                  <span className={`bar-value${k.liability ? ' danger-text' : ''}`}>
                    {k.liability ? '−' : ''}
                    {money(total)}
                  </span>
                  <span className="bar-track" aria-hidden="true">
                    <span className="bar-fill" style={{ width: `${max > 0 ? (total / max) * 100 : 0}%`, background: k.color }} />
                  </span>
                </li>
              )
            })}
          </ul>
        </section>
      </div>

      <div className="col">
        <section className="card" aria-labelledby="assets-title">
          <div className="section-head">
            <h2 id="assets-title">What I own</h2>
            <button type="button" className="btn btn-primary btn-small" onClick={() => onOpen({ name: '', kind: 'cash' })}>
              + Add
            </button>
          </div>
          <ul className="rows">
            {sorted.map((a) => {
              const k = getAssetKind(a.kind)
              const value = `${k.liability ? '−' : ''}${money(a.value)}`
              return (
                <li key={a.id}>
                  <button type="button" className="row" onClick={() => onOpen(a)} aria-label={`Update ${a.name}, ${value}`}>
                    <span className="row-icon" style={{ background: `color-mix(in srgb, ${k.color} 18%, transparent)` }} aria-hidden="true">
                      {k.emoji}
                    </span>
                    <span className="row-text">
                      <span className="row-title">{a.name}</span>
                      <span className="row-sub">
                        {k.label} · updated {formatUpdated(a.updatedAt, now)}
                      </span>
                    </span>
                    <span className={`row-amount${k.liability ? ' danger-text' : ''}`}>{value}</span>
                  </button>
                </li>
              )
            })}
          </ul>
          <p className="hint" style={{ marginTop: 12, marginBottom: 0 }}>
            Tap an item to update its value.
          </p>
        </section>
      </div>
    </main>
  )
}
