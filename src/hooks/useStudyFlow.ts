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
import type { StudyQueueItem } from '../features/study'
import { activateStudyItem, nextBrowsableItem } from '../features/study/navigation'

interface Visit {
  item: StudyQueueItem
  revealed: boolean
  flipped: boolean
  rating?: boolean
}

export function useStudyFlow(
  cards: Card[],
  random: () => number = Math.random,
) {
  const [session, setSession] = useState<StudySession | null>(null)
  const [isFlipped, setIsFlipped] = useState(false)
  const [hasRevealed, setHasRevealed] = useState(false)
  const lastRatedSessionRef = useRef<StudySession | null>(null)
  const [visits, setVisits] = useState<Visit[]>([])
  const [visitIndex, setVisitIndex] = useState(0)
  const selfAssessment = session?.answerMethod === 'self-assessment'
  const visit = selfAssessment ? visits[visitIndex] : undefined

  const current = useMemo(
    () => (session ? getCurrentStudyCard(visit ? { ...session, currentItem: visit.item } : session, cards) : undefined),
    [cards, session, visit],
  )
  const progress = session ? getStudyProgress(session) : undefined
  const difficultCardIds = session ? getDifficultCardIds(session) : []

  function begin(
    direction: StudyDirection,
    selectedCards: Card[] = cards,
    answerMethod: StudyAnswerMethod = 'self-assessment',
  ) {
    lastRatedSessionRef.current = null
    const next = createStudySession(selectedCards, direction, random, answerMethod)
    setSession(next)
    setVisits(next.currentItem ? [{ item: next.currentItem, revealed: false, flipped: false }] : [])
    setVisitIndex(0)
    setIsFlipped(false)
    setHasRevealed(false)
  }

  function rate(knew: boolean): StudyAnswerResult | undefined {
    if (
      !session ||
      !current ||
      (selfAssessment && (!visit?.revealed || visit.rating !== undefined)) ||
      lastRatedSessionRef.current === session
    ) {
      return undefined
    }

    lastRatedSessionRef.current = session
    const result = rateCurrentCard(
      selfAssessment && visit ? activateStudyItem(session, visit.item) : session,
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
    if (selfAssessment) {
      const updatedVisits = visits.map((entry) => entry.item.cardId === current.card.id && entry.rating === undefined
        ? { ...entry, rating: knew } : entry)
      if (result.session.currentItem) updatedVisits.push({ item: result.session.currentItem, revealed: false, flipped: false })
      setVisits(updatedVisits)
      setVisitIndex(updatedVisits.length - 1)
    }
    setIsFlipped(false)
    setHasRevealed(false)
    return result
  }

  function reset() {
    lastRatedSessionRef.current = null
    setSession(null)
    setVisits([])
    setVisitIndex(0)
    setIsFlipped(false)
    setHasRevealed(false)
  }

  return {
    session,
    current,
    progress,
    difficultCardIds,
    isFlipped: visit?.flipped ?? isFlipped,
    hasRevealed: visit?.revealed ?? hasRevealed,
    previousRating: visit?.rating,
    canPrevious: selfAssessment && visitIndex > 0,
    canNext: !!(selfAssessment && session && (visitIndex < visits.length - 1 || nextBrowsableItem(session))),
    navigate: (direction: -1 | 1) => {
      if (!selfAssessment || !session) return
      const index = visitIndex + direction
      if (index < 0) return
      if (index < visits.length) {
        setVisitIndex(index)
      } else {
        const item = nextBrowsableItem(session)
        if (!item) return
        setSession(activateStudyItem(session, item))
        setVisits([...visits, { item, revealed: false, flipped: false }])
        setVisitIndex(index)
      }
    },
    flip: () => {
      if (visit) {
        setVisits(visits.map((entry, index) => index === visitIndex
          ? { ...entry, flipped: !entry.flipped, revealed: true } : entry))
        return
      }
      setIsFlipped((flipped) => !flipped)
      setHasRevealed(true)
    },
    begin,
    rate,
    reset,
  }
}
