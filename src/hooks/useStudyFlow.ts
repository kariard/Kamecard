import { useMemo, useState } from 'react'
import {
  createStudySession,
  getCurrentStudyCard,
  getDifficultCardIds,
  getStudyProgress,
  rateCurrentCard,
  type StudyAnswerResult,
  type StudySession,
} from '../features/study'
import type { Card, StudyDirection } from '../types/models'

export function useStudyFlow(cards: Card[]) {
  const [session, setSession] = useState<StudySession | null>(null)
  const [isFlipped, setIsFlipped] = useState(false)

  const current = useMemo(
    () => (session ? getCurrentStudyCard(session, cards) : undefined),
    [cards, session],
  )
  const progress = session ? getStudyProgress(session) : undefined
  const difficultCardIds = session ? getDifficultCardIds(session) : []

  function begin(direction: StudyDirection, selectedCards: Card[] = cards) {
    setSession(createStudySession(selectedCards, direction))
    setIsFlipped(false)
  }

  function rate(knew: boolean): StudyAnswerResult | undefined {
    if (!session || !current) return undefined
    const result = rateCurrentCard(session, current.card, knew)
    setSession(result.session)
    setIsFlipped(false)
    return result
  }

  function reset() {
    setSession(null)
    setIsFlipped(false)
  }

  return {
    session,
    current,
    progress,
    difficultCardIds,
    isFlipped,
    reveal: () => setIsFlipped(true),
    begin,
    rate,
    reset,
  }
}
