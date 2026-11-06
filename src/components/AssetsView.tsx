import { useMemo } from 'react'
import type { Asset } from '../lib/types'
import { ASSET_KINDS, ASSET_PRESETS, formatUpdated, getAssetKind, signedValue, summarizeAssets } from '../lib/assets'
import { formatMoney } from '../lib/money'
import type { AssetDraft } from './AssetDialog'
import { useI18n } from '../i18n'

interface Props {
  assets: Asset[]
  currency: string
  savedThisMonth: number | null
  onOpen: (draft: AssetDraft) => void
}

const ORDER = new Map(ASSET_KINDS.map((k, i) => [k.id, i]))

export function AssetsView({ assets, currency, savedThisMonth, onOpen }: Props) {
  const { t, rich, assetKind, lang } = useI18n()
  const summary = useMemo(() => summarizeAssets(assets), [assets])
  const sorted = useMemo(
    () => [...assets].sort((a, b) => ORDER.get(a.kind)! - ORDER.get(b.kind)! || Math.abs(b.value) - Math.abs(a.value)),
    [assets],
  )
  const money = (n: number) => formatMoney(n, currency)
  /** Shows −€10 for negative values and, when asked, +€10 for positive ones. */
  const signedMoney = (n: number, plus = false) => (n < 0 ? `−${money(-n)}` : `${plus && n > 0 ? '+' : ''}${money(n)}`)
  const now = Date.now()
  const max = Math.max(...summary.byKind.map((k) => Math.abs(k.total)), 0)

  if (assets.length === 0) {
    return (
      <main className="layout">
        <section className="card">
          <h2>{t('tabOwn')}</h2>
          <p className="hint" style={{ marginTop: 8 }}>
            {t('ownIntro')}
          </p>
          <div className="chips">
            {ASSET_PRESETS.map((k) => (
              <button key={k} type="button" className="chip" onClick={() => onOpen({ name: assetKind(k), kind: k })}>
                <span aria-hidden="true">{getAssetKind(k).emoji}</span> {assetKind(k)}
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
          <p className="summary-label">{t(summary.owing > 0 ? 'totalMoneyOwing' : 'totalMoney')}</p>
          <p className="summary-big">{signedMoney(summary.total)}</p>
          {summary.owing > 0 && (
            <dl className="flow">
              <div>
                <dt>{t('iOwn')}</dt>
                <dd className="income-text">{money(summary.owned)}</dd>
              </div>
              <div>
                <dt>{t('iOwe')}</dt>
                <dd className="danger-text">{money(summary.owing)}</dd>
              </div>
            </dl>
          )}
          {savedThisMonth !== null && (
            <p className="summary-daily">
              {savedThisMonth >= 0
                ? rich(t('savedMonth'), { amount: <strong>{money(savedThisMonth)}</strong> })
                : rich(t('overspentMonth'), { amount: <strong>{money(-savedThisMonth)}</strong> })}
            </p>
          )}
        </section>

        <section className="card" aria-labelledby="kinds-title">
          <div className="section-head">
            <h2 id="kinds-title">{t('byType')}</h2>
          </div>
          <ul className="bars">
            {summary.byKind.map(({ kind, total, count }) => {
              const k = getAssetKind(kind)
              return (
                <li key={kind} className="bar-row bar-static">
                  <span className="bar-label">
                    <span aria-hidden="true">{k.emoji}</span> {assetKind(kind)}
                    <span className="muted"> · {count}</span>
                  </span>
                  <span className={`bar-value${total < 0 ? ' danger-text' : ''}`}>{signedMoney(total)}</span>
                  <span className="bar-track" aria-hidden="true">
                    <span className="bar-fill" style={{ width: `${max > 0 ? (Math.abs(total) / max) * 100 : 0}%`, background: k.color }} />
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
            <h2 id="assets-title">{t('tabOwn')}</h2>
            <button type="button" className="btn btn-primary btn-small" onClick={() => onOpen({ name: '', kind: 'cash' })}>
              {t('addAsset')}
            </button>
          </div>
          <ul className="rows">
            {sorted.map((a) => {
              const k = getAssetKind(a.kind)
              const v = signedValue(a)
              const value = signedMoney(v, k.signed)
              const status = k.signed ? ` · ${t(a.value > 0 ? 'swStatusOwed' : a.value < 0 ? 'swStatusOwe' : 'swSettled')}` : ''
              return (
                <li key={a.id}>
                  <button type="button" className="row" onClick={() => onOpen(a)} aria-label={t('updateAria', { name: a.name, value })}>
                    <span className="row-icon" style={{ background: `color-mix(in srgb, ${k.color} 18%, transparent)` }} aria-hidden="true">
                      {k.emoji}
                    </span>
                    <span className="row-text">
                      <span className="row-title">{a.name}</span>
                      <span className="row-sub">
                        {t('updatedAgo', { kind: assetKind(a.kind) + status, when: formatUpdated(a.updatedAt, now, lang) })}
                      </span>
                    </span>
                    <span className={`row-amount${v < 0 ? ' danger-text' : k.signed && v > 0 ? ' income-text' : ''}`}>{value}</span>
                  </button>
                </li>
              )
            })}
          </ul>
          <p className="hint" style={{ marginTop: 12, marginBottom: 0 }}>
            {t('tapToUpdate')}
          </p>
        </section>
      </div>
    </main>
  )
}
