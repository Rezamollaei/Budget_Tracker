import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { AppState, CategoryId, Expense } from './lib/types'
import { emptyState, loadState, mergeStates, newId, parseImport, saveState, STORAGE_EVENT_KEY } from './lib/storage'
import { formatMonth, monthKey, shiftMonth, todayISO } from './lib/dates'
import { budgetFor, summarizeMonth } from './lib/stats'
import { formatMoney } from './lib/money'
import { downloadFile, toCSV } from './lib/csv'
import { QuickAdd, type NewExpense } from './components/QuickAdd'
import { Summary } from './components/Summary'
import { Breakdown } from './components/Breakdown'
import { ExpenseList } from './components/ExpenseList'
import { EditDialog } from './components/EditDialog'
import { SettingsDialog } from './components/SettingsDialog'
import { Toast, type ToastData } from './components/Toast'

export default function App() {
  const [state, setState] = useState<AppState>(loadState)
  const [today, setToday] = useState(todayISO)
  const [month, setMonth] = useState(() => monthKey(todayISO()))
  const [category, setCategory] = useState<CategoryId | null>(null)
  const [editing, setEditing] = useState<Expense | null>(null)
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

  // Keep "today" fresh if the tab stays open past midnight, and sync between tabs.
  useEffect(() => {
    const refresh = () => setToday(todayISO())
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_EVENT_KEY) {
        skipSave.current = true
        setState(loadState())
      }
    }
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    window.addEventListener('storage', onStorage)
    const timer = setInterval(refresh, 60_000)
    return () => {
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
        setMonth(monthKey(todayISO()))
        inputRef.current?.focus()
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
  const summary = useMemo(() => summarizeMonth(state.expenses, month, budget, today), [state.expenses, month, budget, today])
  const isCurrentMonth = month === monthKey(today)
  const money = (n: number) => formatMoney(n, state.currency)

  function addExpense(input: NewExpense) {
    const expense: Expense = { ...input, id: newId(), createdAt: Date.now() }
    setState((s) => ({ ...s, expenses: [...s.expenses, expense] }))
    setMonth(monthKey(expense.date))
    showToast(`Added ${expense.description} · ${money(expense.amount)}`, {
      label: 'Undo',
      run: () => setState((s) => ({ ...s, expenses: s.expenses.filter((e) => e.id !== expense.id) })),
    })
  }

  function saveExpense(updated: Expense) {
    setState((s) => ({ ...s, expenses: s.expenses.map((e) => (e.id === updated.id ? updated : e)) }))
    setEditing(null)
    showToast('Saved')
  }

  function deleteExpense(expense: Expense) {
    setState((s) => ({ ...s, expenses: s.expenses.filter((e) => e.id !== expense.id) }))
    setEditing(null)
    showToast(`Deleted ${expense.description}`, {
      label: 'Undo',
      run: () => setState((s) => ({ ...s, expenses: [...s.expenses, expense] })),
    })
  }

  function saveSettings(currency: string, newBudget: number) {
    setState((s) => {
      const budgets = { ...s.budgets }
      if (newBudget > 0 || budgetFor(s.budgets, month) > 0) budgets[month] = newBudget
      return { ...s, currency, budgets }
    })
    setSettingsOpen(false)
    showToast('Settings saved')
  }

  async function importFile(file: File) {
    const incoming = parseImport(await file.text(), today)
    if (!incoming) {
      showToast('That file doesn’t look like a Budget Tracker backup.')
      return
    }
    const { state: merged, added } = mergeStates(state, incoming)
    setState(merged)
    setSettingsOpen(false)
    showToast(`Imported ${added} ${added === 1 ? 'expense' : 'expenses'}`)
  }

  function eraseAll() {
    if (!window.confirm('Erase all expenses and budgets from this browser? Download a backup first if you might need them.')) return
    const previous = state
    setState({ ...emptyState(), currency: state.currency })
    setSettingsOpen(false)
    showToast('All data erased', { label: 'Undo', run: () => setState(previous) })
  }

  return (
    <div className="app">
      <header className="topbar">
        <h1 className="brand">
          <span aria-hidden="true">💸</span> Budget Tracker
        </h1>
        <button type="button" className="icon-btn" onClick={() => setSettingsOpen(true)} aria-label="Budget and settings">
          ⚙️
        </button>
      </header>

      <nav className="month-nav" aria-label="Month">
        <button type="button" className="icon-btn" onClick={() => setMonth((m) => shiftMonth(m, -1))} aria-label="Previous month">
          ‹
        </button>
        <span className="month-label">{formatMonth(month)}</span>
        <button type="button" className="icon-btn" onClick={() => setMonth((m) => shiftMonth(m, 1))} aria-label="Next month">
          ›
        </button>
        {!isCurrentMonth && (
          <button type="button" className="link-btn" onClick={() => setMonth(monthKey(today))}>
            This month
          </button>
        )}
      </nav>

      {saveFailed && (
        <p className="banner" role="alert">
          Your browser isn’t letting this page save data (private mode or storage disabled). Changes will be lost when you close the tab.
        </p>
      )}

      <main className="layout">
        <div className="col">
          <QuickAdd ref={inputRef} expenses={state.expenses} currency={state.currency} today={today} onAdd={addExpense} />
          <Summary summary={summary} currency={state.currency} isCurrentMonth={isCurrentMonth} onSetBudget={() => setSettingsOpen(true)} />
          <Breakdown summary={summary} currency={state.currency} selected={category} onSelect={setCategory} />
        </div>
        <div className="col">
          <ExpenseList items={summary.items} currency={state.currency} today={today} category={category} onEdit={setEditing} />
        </div>
      </main>

      <EditDialog expense={editing} onClose={() => setEditing(null)} onSave={saveExpense} onDelete={deleteExpense} />
      <SettingsDialog
        open={settingsOpen}
        month={month}
        currency={state.currency}
        budget={budget}
        expenseCount={state.expenses.length}
        onClose={() => setSettingsOpen(false)}
        onSave={saveSettings}
        onExportCSV={() => downloadFile(`expenses-${today}.csv`, toCSV(state.expenses), 'text/csv;charset=utf-8')}
        onBackup={() => downloadFile(`budget-backup-${today}.json`, JSON.stringify(state, null, 2), 'application/json')}
        onImport={importFile}
        onEraseAll={eraseAll}
      />
      <Toast toast={toast} onDone={clearToast} />
    </div>
  )
}
