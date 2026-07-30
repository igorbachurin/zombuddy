import { useEffect, useRef, type ReactNode } from 'react'
import { Icon } from './Icon'

interface ModalProps {
  open: boolean
  title: string
  eyebrow?: string
  onClose?: () => void
  children: ReactNode
  dismissible?: boolean
}

export function Modal({ open, title, eyebrow, onClose, children, dismissible = true }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      className="modal"
      onCancel={(event) => {
        if (!dismissible) event.preventDefault()
        else onClose?.()
      }}
      onClick={(event) => {
        if (dismissible && event.target === ref.current) onClose?.()
      }}
    >
      <div className="modal__paper">
        <div className="modal__head">
          <div>
            {eyebrow && <p className="eyebrow">{eyebrow}</p>}
            <h2>{title}</h2>
          </div>
          {dismissible && (
            <button className="icon-button" aria-label="Close dialog" onClick={onClose}>
              <Icon name="close" />
            </button>
          )}
        </div>
        {children}
      </div>
    </dialog>
  )
}
