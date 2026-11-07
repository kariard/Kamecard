import { describe, expect, it } from 'vitest'
import { activateStudyItem, nextBrowsableItem, swipeAction } from './navigation'
import { createStudySession, rateCurrentCard } from './studySession'
import type { Card } from '../../types/models'

const cards: Card[] = ['a', 'b', 'c'].map((id) => ({
  id, frontText: id, backText: `Antwort ${id}`, createdAt: '', updatedAt: '',
  correctCount: 0, incorrectCount: 0, currentStreak: 0, masteryLevel: 0,
}))

describe('swipeAction', () => {
  it.each([
    [80, 5, 'correct'], [-80, 5, 'incorrect'], [5, 80, 'previous'], [5, -80, 'next'],
    [20, 0, undefined], [90, 90, undefined], [0, 0, undefined],
  ] as const)('interprets movement %s/%s as %s', (x, y, action) => {
    expect(swipeAction(x, y)).toBe(action)
  })
})

describe('browsing without rating', () => {
  it('keeps skipped cards pending without changing scores or mastery', () => {
    const original = createStudySession(cards, 'front-to-back', () => 0.9)
    const next = activateStudyItem(original, nextBrowsableItem(original)!)
    expect(next.currentItem?.cardId).not.toBe(original.currentItem?.cardId)
    expect(next.remainingFirstPass).toContainEqual(original.currentItem)
    expect(next.attemptCount).toBe(0)
    expect(next.correctAnswers).toBe(0)
    expect(next.incorrectAnswers).toBe(0)
    expect(next.completedCardIds).toEqual([])
    expect(original.remainingFirstPass).toHaveLength(2)
  })

  it('allows returning to a skipped card without losing the current card', () => {
    const original = createStudySession(cards, 'mixed', () => 0.9)
    const browsed = activateStudyItem(original, nextBrowsableItem(original)!)
    const returned = activateStudyItem(browsed, original.currentItem!)
    expect(returned.currentItem).toEqual(original.currentItem)
    expect(returned.remainingFirstPass).toContainEqual(browsed.currentItem)
    expect(returned.remainingFirstPass).not.toContainEqual(original.currentItem)
    const result = rateCurrentCard(returned, cards.find((card) => card.id === returned.currentItem?.cardId)!, true)
    expect(result.session.attemptCount).toBe(1)
    expect(result.session.correctAnswers).toBe(1)
  })

  it('does not browse beyond the only remaining card', () => {
    expect(nextBrowsableItem(createStudySession(cards.slice(0, 1), 'front-to-back'))).toBeUndefined()
  })
})
