import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { AppState, Asset, CategoryId, Expense, Income } from './lib/types'
import { emptyState, loadState, mergeStates, newId, parseImport, saveState, STORAGE_EVENT_KEY } from './lib/storage'
import { formatMonth, monthKey, shiftMonth, todayISO } from './lib/dates'
import { budgetFor, summarizeMonth, toEntries, type Entry } from './lib/stats'
import { formatEarn, formatSpend } from './lib/money'
import { isAccount, withActivity } from './lib/assets'
import { TotalBar } from './components/TotalBar'
import { downloadFile, toCSV } from './lib/csv'
import { QuickAdd, type NewExpense, type NewIncome } from './components/QuickAdd'
import { Summary } from './components/Summary'
import { Breakdown } from './components/Breakdown'
import { ExpenseList } from './components/ExpenseList'
import { EditDialog } from './components/EditDialog'
import { SettingsDialog } from './components/SettingsDialog'
import { Toast, type ToastData } from './components/Toast'
import { AssetsView } from './components/AssetsView'
import { AssetDialog, type AssetDraft } from './components/AssetDialog'
import { I18nProvider, makeI18n } from './i18n'
import { LANGS } from './lib/i18n'
import { setFormatLocale } from './lib/locale'
import { applyTheme, loadPrefs, savePrefs, type Prefs, type Theme } from './lib/prefs'

const NEXT_THEME: Record<Theme, Theme> = { auto: 'light', light: 'dark', dark: 'auto' }
const THEME_ICON: Record<Theme, string> = { auto: '🌗', light: '☀️', dark: '🌙' }

type Tab = 'spending' | 'own'
const tabFromHash = (): Tab => (window.location.hash === '#own' ? 'own' : 'spending')

export default function App() {
  const [state, setState] = useState<AppState>(loadState)
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs)
  const i18n = useMemo(() => makeI18n(prefs.lang), [prefs.lang])
  const { t, tn } = i18n
  // Number and date formatting follow the chosen language.
  setFormatLocale(i18n.locale)
  const [today, setToday] = useState(todayISO)
  const [month, setMonth] = useState(() => monthKey(todayISO()))
  const [category, setCategory] = useState<CategoryId | null>(null)
  const [editing, setEditing] = useState<Entry | null>(null)
  const [assetDraft, setAssetDraft] = useState<AssetDraft | null>(null)
  const [tab, setTab] = useState<Tab>(tabFromHash)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [toast, setToast] = useState<ToastData | null>(null)
  const [saveFailed, setSaveFailed] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const skipSave = useRef(false)

  // Persist every change; skip writes that came from another tab.
  useEffect(() => {
    if (skipSave.current) {
      skipSave.current = false
      return
    }
    setSaveFailed(!saveState(state))
  }, [state])

  useEffect(() => {
    savePrefs(prefs)
    applyTheme(prefs.theme)
    document.documentElement.lang = prefs.lang
  }, [prefs])

  // Keep "today" fresh if the tab stays open past midnight, and sync between tabs.
  useEffect(() => {
    const refresh = () => setToday(todayISO())
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_EVENT_KEY) {
        skipSave.current = true
        setState(loadState())
      }
    }
    const onHash = () => setTab(tabFromHash())
    window.addEventListener('hashchange', onHash)
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    window.addEventListener('storage', onStorage)
    const timer = setInterval(refresh, 60_000)
    return () => {
      window.removeEventListener('hashchange', onHash)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
      window.removeEventListener('storage', onStorage)
      clearInterval(timer)
    }
  }, [])

  // Press "/" or "n" anywhere to jump to the entry box.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (el.closest('input, textarea, select, [contenteditable], dialog')) return
      if ((e.key === '/' || e.key === 'n') && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault()
        window.location.hash = ''
        setTab('spending')
        setMonth(monthKey(todayISO()))
        setTimeout(() => inputRef.current?.focus())
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const showToast = useCallback((message: string, action?: ToastData['action']) => {
    setToast({ id: Date.now(), message, action })
  }, [])
  const clearToast = useCallback(() => setToast(null), [])

  const budget = budgetFor(state.budgets, month)
  const summary = useMemo(
    () => summarizeMonth(state.expenses, state.incomes, month, budget, today),
    [state.expenses, state.incomes, month, budget, today],
  )
  const entries = useMemo(() => toEntries(summary.items, summary.incomeItems), [summary])
  const thisMonth = useMemo(
    () => summarizeMonth(state.expenses, state.incomes, monthKey(today), 0, today),
    [state.expenses, state.incomes, today],
  )
  const isCurrentMonth = month === monthKey(today)
  // Account balances include expenses and income linked to them.
  const assets = useMemo(() => withActivity(state.assets, state.expenses, state.incomes), [state.assets, state.expenses, state.incomes])
  const accounts = useMemo(() => assets.filter(isAccount), [assets])

  function addExpense(input: NewExpense) {
    const expense: Expense = { ...input, id: newId(), createdAt: Date.now() }
    setState((s) => ({ ...s, expenses: [...s.expenses, expense] }))
    setMonth(monthKey(expense.date))
    showToast(t('toastAdded', { name: expense.description, amount: formatSpend(expense.amount, state.currency) }), {
      label: t('undo'),
      run: () => setState((s) => ({ ...s, expenses: s.expenses.filter((e) => e.id !== expense.id) })),
    })
  }

  function addIncome(input: NewIncome) {
    const income: Income = { ...input, id: newId(), createdAt: Date.now() }
    setState((s) => ({ ...s, incomes: [...s.incomes, income] }))
    setMonth(monthKey(income.date))
    showToast(t('toastAddedIncome', { name: income.description, amount: formatEarn(income.amount, state.currency) }), {
      label: t('undo'),
      run: () => setState((s) => ({ ...s, incomes: s.incomes.filter((i) => i.id !== income.id) })),
    })
  }

  function saveEntry(entry: Entry) {
    if (entry.type === 'expense') {
      const { type: _t, ...updated } = entry
      setState((s) => ({ ...s, expenses: s.expenses.map((e) => (e.id === updated.id ? updated : e)) }))
    } else {
      const { type: _t, ...updated } = entry
      setState((s) => ({ ...s, incomes: s.incomes.map((i) => (i.id === updated.id ? updated : i)) }))
    }
    setEditing(null)
    showToast(t('toastSaved'))
  }

  function deleteEntry(entry: Entry) {
    if (entry.type === 'expense') {
      const { type: _t, ...expense } = entry
      setState((s) => ({ ...s, expenses: s.expenses.filter((e) => e.id !== expense.id) }))
      showToast(t('toastDeleted', { name: expense.description }), { label: t('undo'), run: () => setState((s) => ({ ...s, expenses: [...s.expenses, expense] })) })
    } else {
      const { type: _t, ...income } = entry
      setState((s) => ({ ...s, incomes: s.incomes.filter((i) => i.id !== income.id) }))
      showToast(t('toastDeleted', { name: income.description }), { label: t('undo'), run: () => setState((s) => ({ ...s, incomes: [...s.incomes, income] })) })
    }
    setEditing(null)
  }

  function saveAsset(input: { id?: string; name: string; kind: Asset['kind']; value: number }) {
    const updatedAt = Date.now()
    if (input.id) {
      setState((s) => ({ ...s, assets: s.assets.map((a) => (a.id === input.id ? { ...a, ...input, id: a.id, updatedAt } : a)) }))
      showToast(t('toastUpdated', { name: input.name }))
    } else {
      const asset: Asset = { ...input, id: newId(), updatedAt }
      setState((s) => ({ ...s, assets: [...s.assets, asset] }))
      showToast(t('toastUpdated', { name: asset.name }))
    }
    setAssetDraft(null)
  }

  function deleteAsset(id: string) {
    const asset = state.assets.find((a) => a.id === id)
    setState((s) => ({ ...s, assets: s.assets.filter((a) => a.id !== id) }))
    setAssetDraft(null)
    if (asset) showToast(t('toastDeleted', { name: asset.name }), { label: t('undo'), run: () => setState((s) => ({ ...s, assets: [...s.assets, asset] })) })
  }

  function switchTab(next: Tab) {
    window.location.hash = next === 'own' ? 'own' : ''
    setTab(next)
  }

  function saveSettings(currency: string, newBudget: number) {
    setState((s) => {
      const budgets = { ...s.budgets }
      if (newBudget > 0 || budgetFor(s.budgets, month) > 0) budgets[month] = newBudget
      return { ...s, currency, budgets }
    })
    setSettingsOpen(false)
    showToast(t('toastSettings'))
  }

  async function importFile(file: File) {
    const incoming = parseImport(await file.text(), today)
    if (!incoming) {
      showToast(t('importBad'))
      return
    }
    const { state: merged, added } = mergeStates(state, incoming)
    setState(merged)
    setSettingsOpen(false)
    showToast(tn('imported', added))
  }

  function eraseAll() {
    if (!window.confirm(t('eraseConfirm'))) return
    const previous = state
    setState({ ...emptyState(), currency: state.currency })
    setSettingsOpen(false)
    showToast(t('eraseDone'), { label: t('undo'), run: () => setState(previous) })
  }

  const themeName = t(prefs.theme === 'auto' ? 'themeAuto' : prefs.theme === 'light' ? 'themeLight' : 'themeDark')

  return (
    <I18nProvider value={i18n}>
    <div className="app">
      <header className="topbar">
        <h1 className="brand">
          <span aria-hidden="true">💸</span> {t('appName')}
        </h1>
        <div className="topbar-actions">
          <div className="segmented segmented-small" role="radiogroup" aria-label={t('languageAria')}>
            {LANGS.map((l) => (
              <button
                key={l.id}
                type="button"
                role="radio"
                aria-checked={prefs.lang === l.id}
                lang={l.id}
                className={prefs.lang === l.id ? 'on' : ''}
                onClick={() => setPrefs((p) => ({ ...p, lang: l.id }))}
              >
                {l.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="icon-btn"
            onClick={() => setPrefs((p) => ({ ...p, theme: NEXT_THEME[p.theme] }))}
            aria-label={t('themeAria', { mode: themeName })}
            title={t('themeAria', { mode: themeName })}
          >
            {THEME_ICON[prefs.theme]}
          </button>
          <button type="button" className="icon-btn" onClick={() => setSettingsOpen(true)} aria-label={t('settingsAria')} title={t('settingsAria')}>
            ⚙️
          </button>
        </div>
      </header>

      <nav className="tabs" aria-label={t('sectionsAria')}>
        <button type="button" className={tab === 'spending' ? 'on' : ''} aria-current={tab === 'spending' ? 'page' : undefined} onClick={() => switchTab('spending')}>
          {t('tabSpending')}
        </button>
        <button type="button" className={tab === 'own' ? 'on' : ''} aria-current={tab === 'own' ? 'page' : undefined} onClick={() => switchTab('own')}>
          {t('tabOwn')}
        </button>
      </nav>

      {saveFailed && (
        <p className="banner" role="alert">
          {t('saveFailed')}
        </p>
      )}

      {tab === 'spending' ? (
        <>
          <nav className="month-nav" aria-label={t('monthAria')}>
            <button type="button" className="icon-btn" onClick={() => setMonth((m) => shiftMonth(m, -1))} aria-label={t('prevMonth')}>
              ‹
            </button>
            <span className="month-label">{formatMonth(month)}</span>
            <button type="button" className="icon-btn" onClick={() => setMonth((m) => shiftMonth(m, 1))} aria-label={t('nextMonth')}>
              ›
            </button>
            {!isCurrentMonth && (
              <button type="button" className="link-btn" onClick={() => setMonth(monthKey(today))}>
                {t('thisMonth')}
              </button>
            )}
          </nav>
          <TotalBar assets={assets} currency={state.currency} onOpen={() => switchTab('own')} />
          <main className="layout">
            <div className="col">
              <QuickAdd ref={inputRef} expenses={state.expenses} incomes={state.incomes} accounts={accounts} currency={state.currency} today={today} onAdd={addExpense} onAddIncome={addIncome} />
              <Summary summary={summary} currency={state.currency} isCurrentMonth={isCurrentMonth} onSetBudget={() => setSettingsOpen(true)} />
              <Breakdown summary={summary} currency={state.currency} selected={category} onSelect={setCategory} />
            </div>
            <div className="col">
              <ExpenseList items={entries} currency={state.currency} today={today} category={category} onEdit={setEditing} />
            </div>
          </main>
        </>
      ) : (
        <AssetsView
          assets={assets}
          currency={state.currency}
          savedThisMonth={thisMonth.income > 0 ? thisMonth.saved : null}
          onOpen={setAssetDraft}
        />
      )}

      <EditDialog entry={editing} accounts={accounts} onClose={() => setEditing(null)} onSave={saveEntry} onDelete={deleteEntry} />
      <AssetDialog draft={assetDraft} onClose={() => setAssetDraft(null)} onSave={saveAsset} onDelete={deleteAsset} />
      <SettingsDialog
        open={settingsOpen}
        month={month}
        currency={state.currency}
        budget={budget}
        itemCount={state.expenses.length + state.incomes.length + state.assets.length}
        onClose={() => setSettingsOpen(false)}
        onSave={saveSettings}
        onExportCSV={() => downloadFile(`expenses-${today}.csv`, toCSV(state.expenses, state.incomes, prefs.lang), 'text/csv;charset=utf-8')}
        onBackup={() => downloadFile(`budget-backup-${today}.json`, JSON.stringify(state, null, 2), 'application/json')}
        onImport={importFile}
        onEraseAll={eraseAll}
      />
      <Toast toast={toast} onDone={clearToast} />
    </div>
    </I18nProvider>
  )
}
