import { useMemo, useRef, useState } from 'react'
import {
  createStudySession,
  getCurrentStudyCard,
  getDifficultCardIds,
  getStudyProgress,
  rateCurrentCard,
  type StudyAnswerMethod,
  type StudyAnswerResult,
  type StudySession,
} from '../features/study'
import type { Card, StudyDirection } from '../types/models'

export function useStudyFlow(
  cards: Card[],
  random: () => number = Math.random,
) {
  const [session, setSession] = useState<StudySession | null>(null)
  const [isFlipped, setIsFlipped] = useState(false)
  const lastRatedSessionRef = useRef<StudySession | null>(null)

  const current = useMemo(
    () => (session ? getCurrentStudyCard(session, cards) : undefined),
    [cards, session],
  )
  const progress = session ? getStudyProgress(session) : undefined
  const difficultCardIds = session ? getDifficultCardIds(session) : []

  function begin(
    direction: StudyDirection,
    selectedCards: Card[] = cards,
    answerMethod: StudyAnswerMethod = 'self-assessment',
  ) {
    lastRatedSessionRef.current = null
    setSession(
      createStudySession(selectedCards, direction, random, answerMethod),
    )
    setIsFlipped(false)
  }

  function rate(knew: boolean): StudyAnswerResult | undefined {
    if (
      !session ||
      !current ||
      lastRatedSessionRef.current === session
    ) {
      return undefined
    }

    lastRatedSessionRef.current = session
    const result = rateCurrentCard(
      session,
      current.card,
      knew,
      undefined,
      random,
    )

    if (result.session === session) {
      lastRatedSessionRef.current = null
      return undefined
    }

    setSession(result.session)
    setIsFlipped(false)
    return result
  }

  function reset() {
    lastRatedSessionRef.current = null
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
