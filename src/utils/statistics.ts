import type { Deck } from '../types/models'

export interface DeckStatistics {
  cardCount: number
  reviewedCardCount: number
  masteredCardCount: number
  averageMastery: number
  progressPercent: number
}

export function getDeckProgress(deck: Deck): number {
  if (deck.cards.length === 0) {
    return 0
  }

  const masteryTotal = deck.cards.reduce(
    (total, card) => total + card.masteryLevel,
    0,
  )

  return Math.round((masteryTotal / (deck.cards.length * 5)) * 100)
}

export function getDeckStatistics(deck: Deck): DeckStatistics {
  const cardCount = deck.cards.length
  const masteryTotal = deck.cards.reduce(
    (total, card) => total + card.masteryLevel,
    0,
  )

  return {
    cardCount,
    reviewedCardCount: deck.cards.filter(
      (card) => card.correctCount + card.incorrectCount > 0,
    ).length,
    masteredCardCount: deck.cards.filter((card) => card.masteryLevel === 5)
      .length,
    averageMastery: cardCount === 0 ? 0 : masteryTotal / cardCount,
    progressPercent: getDeckProgress(deck),
  }
}
