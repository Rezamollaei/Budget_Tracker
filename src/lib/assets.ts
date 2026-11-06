import type { Asset, AssetKind, Expense, Income } from './types'
import { roundMoney } from './money'
import { translate, type Lang } from './i18n'

export interface AssetKindInfo {
  id: AssetKind
  emoji: string
  color: string
  /** Money you owe: always subtracted from the total. */
  liability?: boolean
  /** The value can be positive or negative. */
  signed?: boolean
}

export const ASSET_KINDS: AssetKindInfo[] = [
  { id: 'cash', emoji: '💵', color: '#22c55e' },
  { id: 'bank', emoji: '🏦', color: '#3b82f6' },
  { id: 'savings', emoji: '🐖', color: '#ec4899' },
  { id: 'gold', emoji: '🪙', color: '#eab308' },
  { id: 'investment', emoji: '📈', color: '#8b5cf6' },
  { id: 'splitwise', emoji: '🤝', color: '#14b8a6', signed: true },
  { id: 'debt', emoji: '🧾', color: '#ef4444', liability: true },
  { id: 'other', emoji: '💼', color: '#94a3b8' },
]

/** Kinds that expenses can be paid from and income paid into. */
export const ACCOUNT_KINDS: AssetKind[] = ['cash', 'bank', 'savings']

export function isAccount(a: Asset): boolean {
  return ACCOUNT_KINDS.includes(a.kind)
}

/**
 * Current values: each account's typed-in balance, plus income paid into it and
 * minus expenses paid from it since that balance was typed in.
 */
export function withActivity(assets: Asset[], expenses: Expense[], incomes: Income[]): Asset[] {
  const delta = new Map<string, number>()
  const since = new Map(assets.filter(isAccount).map((a) => [a.id, a.updatedAt]))
  const apply = (accountId: string | undefined, createdAt: number, amount: number) => {
    if (!accountId) return
    const from = since.get(accountId)
    if (from === undefined || createdAt <= from) return
    delta.set(accountId, (delta.get(accountId) ?? 0) + amount)
  }
  for (const e of expenses) apply(e.accountId, e.createdAt, -e.amount)
  for (const i of incomes) apply(i.accountId, i.createdAt, i.amount)
  return assets.map((a) => (delta.has(a.id) ? { ...a, value: roundMoney(a.value + delta.get(a.id)!) } : a))
}

/**
 * The account to pre-select: the one you used last for this kind of entry, if it
 * still exists, otherwise the first cash account (expenses) or bank account (income).
 */
export function defaultAccountId(accounts: Asset[], history: { accountId?: string; createdAt: number }[], prefer: AssetKind): string | undefined {
  const ids = new Set(accounts.map((a) => a.id))
  let latest: { accountId?: string; createdAt: number } | undefined
  for (const h of history) {
    if (h.accountId && ids.has(h.accountId) && (!latest || h.createdAt > latest.createdAt)) latest = h
  }
  if (latest) return latest.accountId
  return (accounts.find((a) => a.kind === prefer) ?? accounts[0])?.id
}

/** Kinds offered as one-tap starting points in the "add" form. */
export const ASSET_PRESETS: AssetKind[] = ['cash', 'bank', 'savings', 'gold', 'splitwise']

const BY_ID = new Map(ASSET_KINDS.map((k) => [k.id, k]))

export function getAssetKind(id: AssetKind): AssetKindInfo {
  return BY_ID.get(id) ?? BY_ID.get('other')!
}

export function isAssetKind(value: unknown): value is AssetKind {
  return typeof value === 'string' && BY_ID.has(value as AssetKind)
}

/** What this item adds to (positive) or takes away from (negative) the total. */
export function signedValue(a: Asset): number {
  return getAssetKind(a.kind).liability ? -a.value : a.value
}

export interface AssetSummary {
  /** Everything you own, including money owed to you. */
  owned: number
  /** Everything you owe, as a positive number. */
  owing: number
  /** owned - owing */
  total: number
  /** Signed totals per kind, largest effect first. */
  byKind: { kind: AssetKind; total: number; count: number }[]
}

export function summarizeAssets(assets: Asset[]): AssetSummary {
  let owned = 0
  let owing = 0
  const totals = new Map<AssetKind, { total: number; count: number }>()
  for (const a of assets) {
    const v = signedValue(a)
    if (v >= 0) owned += v
    else owing -= v
    const t = totals.get(a.kind) ?? { total: 0, count: 0 }
    t.total += v
    t.count += 1
    totals.set(a.kind, t)
  }
  return {
    owned: roundMoney(owned),
    owing: roundMoney(owing),
    total: roundMoney(owned - owing),
    byKind: [...totals.entries()]
      .map(([kind, t]) => ({ kind, total: roundMoney(t.total), count: t.count }))
      .sort((a, b) => Math.abs(b.total) - Math.abs(a.total)),
  }
}

/** "today", "yesterday", "5 days ago", "3 months ago" */
export function formatUpdated(updatedAt: number, now: number, lang: Lang = 'en'): string {
  const days = Math.floor((now - updatedAt) / 86_400_000)
  if (days <= 0) return translate(lang, 'when.today')
  if (days === 1) return translate(lang, 'when.yesterday')
  if (days < 30) return translate(lang, 'when.days', { n: days })
  const months = Math.floor(days / 30)
  return months === 1 ? translate(lang, 'when.month') : translate(lang, 'when.months', { n: months })
}
