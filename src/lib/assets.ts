import type { Asset, AssetKind } from './types'
import { roundMoney } from './money'

export interface AssetKindInfo {
  id: AssetKind
  label: string
  emoji: string
  color: string
  example: string
  /** Money you owe: subtracted from the total. */
  liability?: boolean
}

export const ASSET_KINDS: AssetKindInfo[] = [
  { id: 'cash', label: 'Cash', emoji: '💵', color: '#22c55e', example: 'Wallet' },
  { id: 'bank', label: 'Bank account', emoji: '🏦', color: '#3b82f6', example: 'Main account' },
  { id: 'savings', label: 'Savings', emoji: '🐖', color: '#ec4899', example: 'Emergency fund' },
  { id: 'gold', label: 'Gold', emoji: '🪙', color: '#eab308', example: 'Gold coins' },
  { id: 'investment', label: 'Investments', emoji: '📈', color: '#8b5cf6', example: 'Stocks' },
  { id: 'owed', label: 'Owed to me', emoji: '🤝', color: '#14b8a6', example: 'Splitwise' },
  { id: 'debt', label: 'I owe', emoji: '🧾', color: '#ef4444', example: 'Splitwise', liability: true },
  { id: 'other', label: 'Other', emoji: '💼', color: '#94a3b8', example: 'Car' },
]

/** One-tap starting points in the "add" form. */
export const ASSET_PRESETS: { name: string; kind: AssetKind }[] = [
  { name: 'Cash', kind: 'cash' },
  { name: 'Bank account', kind: 'bank' },
  { name: 'Savings', kind: 'savings' },
  { name: 'Gold', kind: 'gold' },
  { name: 'Splitwise – owed to me', kind: 'owed' },
  { name: 'Splitwise – I owe', kind: 'debt' },
]

const BY_ID = new Map(ASSET_KINDS.map((k) => [k.id, k]))

export function getAssetKind(id: AssetKind): AssetKindInfo {
  return BY_ID.get(id) ?? BY_ID.get('other')!
}

export function isAssetKind(value: unknown): value is AssetKind {
  return typeof value === 'string' && BY_ID.has(value as AssetKind)
}

export interface AssetSummary {
  /** Everything you own, including money owed to you. */
  owned: number
  /** Everything you owe. */
  owing: number
  /** owned - owing */
  total: number
  byKind: { kind: AssetKind; total: number; count: number }[]
}

export function summarizeAssets(assets: Asset[]): AssetSummary {
  let owned = 0
  let owing = 0
  for (const a of assets) {
    if (getAssetKind(a.kind).liability) owing += a.value
    else owned += a.value
  }
  const totals = new Map<AssetKind, { total: number; count: number }>()
  for (const a of assets) {
    const t = totals.get(a.kind) ?? { total: 0, count: 0 }
    t.total += a.value
    t.count += 1
    totals.set(a.kind, t)
  }
  return {
    owned: roundMoney(owned),
    owing: roundMoney(owing),
    total: roundMoney(owned - owing),
    byKind: [...totals.entries()]
      .map(([kind, t]) => ({ kind, total: roundMoney(t.total), count: t.count }))
      .sort((a, b) => b.total - a.total),
  }
}

/** "today", "yesterday", "5 days ago", "3 months ago" */
export function formatUpdated(updatedAt: number, now: number): string {
  const days = Math.floor((now - updatedAt) / 86_400_000)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days} days ago`
  const months = Math.floor(days / 30)
  return months === 1 ? '1 month ago' : `${months} months ago`
}
