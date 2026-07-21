import { describe, expect, it } from 'vitest'
import type { Card, MasteryLevel } from '../../types/models'
import {
  createStudySession,
  getStudyProgress,
  orderCardsForStudy,
  rateCurrentCard,
  updateCardMastery,
} from './studySession'

const timestamp = '2026-01-01T00:00:00.000Z'

function makeCard(id: string, masteryLevel: MasteryLevel = 0): Card {
  return {
    id,
    frontText: `Vorderseite ${id}`,
    backText: `Rückseite ${id}`,
    createdAt: timestamp,
    updatedAt: timestamp,
    correctCount: 0,
    incorrectCount: 0,
    currentStreak: 0,
    masteryLevel,
  }
}

describe('study session', () => {
  it('reiht eine falsche Karte erst nach anderen Karten erneut ein', () => {
    const cards = ['a', 'b', 'c', 'd'].map((id) => makeCard(id))
    const initial = createStudySession(cards, 'front-to-back', () => 0.5)
    const result = rateCurrentCard(
      initial,
      cards[0],
      false,
      '2026-01-02T00:00:00.000Z',
    )

    expect(result.session.queue.map((item) => item.cardId)).toEqual([
      'b',
      'c',
      'a',
      'd',
    ])
    expect(result.session.incorrectAnswers).toBe(1)
    expect(getStudyProgress(result.session).percent).toBe(0)
  })

  it('ordnet schwache Karten vor starken Karten ein', () => {
    const strongCard = makeCard('stark', 5)
    const weakCard = makeCard('schwach', 0)

    expect(
      orderCardsForStudy([strongCard, weakCard], () => 0.5).map(
        (card) => card.id,
      ),
    ).toEqual(['schwach', 'stark'])
  })
})

describe('updateCardMastery', () => {
  it('begrenzt Mastery auf 0 bis 5 und aktualisiert Zähler und Streak', () => {
    const masteredCard = {
      ...makeCard('oben', 5),
      correctCount: 2,
      currentStreak: 2,
    }
    const correct = updateCardMastery(masteredCard, true, timestamp)
    const failed = updateCardMastery(makeCard('unten', 0), false, timestamp)

    expect(correct).toMatchObject({
      masteryLevel: 5,
      correctCount: 3,
      currentStreak: 3,
      lastReviewedAt: timestamp,
    })
    expect(failed).toMatchObject({
      masteryLevel: 0,
      incorrectCount: 1,
      currentStreak: 0,
      lastReviewedAt: timestamp,
    })
  })
})
