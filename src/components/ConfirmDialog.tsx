import { useEffect, useId, useRef } from 'react'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel = 'Bestätigen',
  cancelLabel = 'Abbrechen',
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLElement>(null)
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    if (!isOpen) return

    const previouslyFocused = document.activeElement
    cancelButtonRef.current?.focus()

    return () => {
      if (previouslyFocused instanceof HTMLElement) {
        previouslyFocused.focus()
      }
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div
      className="dialog-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel()
      }}
    >
      <section
        ref={dialogRef}
        className="dialog-card"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onKeyDown={(event) => {
          if (event.key === 'Escape') onCancel()
          if (event.key !== 'Tab') return

          const focusableElements = Array.from(
            dialogRef.current?.querySelectorAll<HTMLElement>(
              'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
            ) ?? [],
          )
          const firstElement = focusableElements[0]
          const lastElement = focusableElements.at(-1)

          if (!firstElement || !lastElement) return
          if (event.shiftKey && document.activeElement === firstElement) {
            event.preventDefault()
            lastElement.focus()
          } else if (!event.shiftKey && document.activeElement === lastElement) {
            event.preventDefault()
            firstElement.focus()
          }
        }}
      >
        <span className="dialog-card__symbol" aria-hidden="true">
          {destructive ? '!' : '✓'}
        </span>
        <h2 id={titleId}>{title}</h2>
        <p id={descriptionId} className="muted-copy">
          {description}
        </p>
        <div className="dialog-card__actions">
          <button
            ref={cancelButtonRef}
            className="button button--secondary"
            type="button"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            className={`button ${destructive ? 'button--danger' : 'button--primary'}`}
            type="button"
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  )
}
