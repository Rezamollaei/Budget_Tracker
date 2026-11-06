import { useEffect } from 'react'

export interface ToastData {
  id: number
  message: string
  action?: { label: string; run: () => void }
}

export function Toast({ toast, onDone }: { toast: ToastData | null; onDone: () => void }) {
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(onDone, 6000)
    return () => clearTimeout(t)
  }, [toast, onDone])

  return (
    <div className="toast-region" role="status" aria-live="polite">
      {toast && (
        <div className="toast" key={toast.id}>
          <span>{toast.message}</span>
          {toast.action && (
            <button
              type="button"
              className="toast-action"
              onClick={() => {
                toast.action!.run()
                onDone()
              }}
            >
              {toast.action.label}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
