import type { Asset } from '../lib/types'
import { getAssetKind, isAccount, summarizeAssets } from '../lib/assets'
import { formatMoney } from '../lib/money'
import { useI18n } from '../i18n'

interface Props {
  /** All assets with current values. */
  assets: Asset[]
  currency: string
  onOpen: () => void
}

/** "Total money" across everything you own, shown above the spending page. */
export function TotalBar({ assets, currency, onOpen }: Props) {
  const { t } = useI18n()
  const money = (n: number) => (n < 0 ? `−${formatMoney(-n, currency)}` : formatMoney(n, currency))

  if (assets.length === 0) {
    return (
      <section className="total-bar total-bar-empty">
        <span>{t('totalMoneyEmpty')}</span>
        <button type="button" className="btn btn-small" onClick={onOpen}>
          {t('addBalances')}
        </button>
      </section>
    )
  }

  const { total } = summarizeAssets(assets)
  const accounts = assets.filter(isAccount)

  return (
    <button type="button" className="total-bar" onClick={onOpen}>
      <span className="total-main">
        <span className="total-label">{t('totalMoney')}</span>
        <span className={`total-value${total < 0 ? ' danger-text' : ''}`}>{money(total)}</span>
      </span>
      {accounts.length > 0 && (
        <span className="total-accounts">
          {accounts.map((a) => (
            <span key={a.id} className="total-account">
              <span aria-hidden="true">{getAssetKind(a.kind).emoji}</span> {a.name}{' '}
              <strong className={a.value < 0 ? 'danger-text' : ''}>{money(a.value)}</strong>
            </span>
          ))}
        </span>
      )}
      <span className="total-more" aria-hidden="true">
        {t('details')} ›
      </span>
    </button>
  )
}
