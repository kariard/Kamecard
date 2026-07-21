interface AppHeaderProps {
  eyebrow?: string
  title?: string
  onBack?: () => void
}

export function AppHeader({
  eyebrow = 'Deine Karten. Dein Tempo.',
  title = 'KameCard',
  onBack,
}: AppHeaderProps) {
  return (
    <header className="app-header">
      <div className="app-header__inner">
        {onBack ? (
          <button
            className="icon-button app-header__back"
            type="button"
            onClick={onBack}
            aria-label="Zurück"
          >
            <span aria-hidden="true">←</span>
          </button>
        ) : (
          <span className="brand-mark" aria-hidden="true">
            か
          </span>
        )}
        <div className="app-header__copy">
          <p className="app-header__eyebrow">{eyebrow}</p>
          <p className="app-header__title">{title}</p>
        </div>
      </div>
    </header>
  )
}
