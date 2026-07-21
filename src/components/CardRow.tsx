import type { Card } from '../types/models'

interface CardRowProps {
  card: Card
  onEdit: () => void
  onDelete: () => void
}

export function CardRow({ card, onEdit, onDelete }: CardRowProps) {
  return (
    <article className="card-row">
      <div className="card-row__content">
        <div>
          <span className="field-caption">Vorderseite</span>
          <p>{card.frontText}</p>
        </div>
        <span className="card-row__divider" aria-hidden="true">
          →
        </span>
        <div>
          <span className="field-caption">Rückseite</span>
          <p>{card.backText}</p>
        </div>
      </div>
      <div className="card-row__actions" aria-label={`Aktionen für ${card.frontText}`}>
        <button className="text-button" type="button" onClick={onEdit}>
          Bearbeiten
        </button>
        <button className="text-button text-button--danger" type="button" onClick={onDelete}>
          Löschen
        </button>
      </div>
    </article>
  )
}
