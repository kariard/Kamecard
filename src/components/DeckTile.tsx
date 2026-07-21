import type { Deck } from '../types/models'
import { ProgressBar } from './ProgressBar'

interface DeckTileProps {
  deck: Deck
  progress: number
  onOpen: () => void
}

export function DeckTile({ deck, progress, onOpen }: DeckTileProps) {
  const cardLabel = deck.cards.length === 1 ? '1 Karte' : `${deck.cards.length} Karten`

  return (
    <article className="deck-tile">
      <button className="deck-tile__button" type="button" onClick={onOpen}>
        <span className="deck-tile__topline">
          <span className="deck-tile__icon" aria-hidden="true">
            文
          </span>
          <span className="deck-tile__arrow" aria-hidden="true">
            →
          </span>
        </span>
        <span className="deck-tile__name">{deck.name}</span>
        <span className="deck-tile__count">{cardLabel}</span>
        <ProgressBar value={progress} compact />
      </button>
    </article>
  )
}
