interface EmptyStateProps {
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({ title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <section className="empty-state">
      <div className="empty-state__art" aria-hidden="true">
        <span>あ</span>
        <span>A</span>
      </div>
      <h2>{title}</h2>
      <p className="muted-copy">{description}</p>
      {actionLabel && onAction ? (
        <button className="button button--primary" type="button" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </section>
  )
}
