interface AppNoticeProps {
  message: string
  isStorageWarning?: boolean
  onDismiss: () => void
}

export function AppNotice({ message, isStorageWarning = false, onDismiss }: AppNoticeProps) {
  if (!message) return null

  return (
    <div
      className={`app-notice${isStorageWarning ? ' app-notice--warning' : ''}`}
      role={isStorageWarning ? 'alert' : 'status'}
    >
      <span>{message}</span>
      <button type="button" onClick={onDismiss} aria-label="Hinweis schließen">
        ×
      </button>
    </div>
  )
}
