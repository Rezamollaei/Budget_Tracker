import { useEffect, useRef, type ReactNode } from 'react'
import { useI18n } from '../i18n'

interface Props {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}

export function Modal({ open, title, onClose, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const { t } = useI18n()

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      className="modal"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose()
      }}
    >
      {open && (
        <div className="modal-body">
          <header className="modal-header">
            <h2>{title}</h2>
            <button type="button" className="icon-btn" onClick={onClose} aria-label={t('close')}>
              ✕
            </button>
          </header>
          {children}
        </div>
      )}
    </dialog>
  )
}
