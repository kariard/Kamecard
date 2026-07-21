import type {
  Card,
  MasteryLevel,
  StudyDirection,
} from '../../types/models'
import { nowIsoString } from '../../utils/date'

export type ResolvedStudyDirection = Exclude<StudyDirection, 'mixed'>

export interface StudyQueueItem {
  cardId: string
  direction: ResolvedStudyDirection
}

export interface StudySession {
  direction: StudyDirection
  queue: StudyQueueItem[]
  totalCards: number
  completedCardIds: string[]
  correctAnswers: number
  incorrectAnswers: number
  incorrectByCardId: Record<string, number>
}

export interface CurrentStudyCard {
  card: Card
  queueItem: StudyQueueItem
  promptText: string
  answerText: string
}

export interface StudyAnswerResult {
  session: StudySession
  updatedCard: Card
}

export interface StudyProgress {
  completedCards: number
  totalCards: number
  remainingCards: number
  percent: number
}

const WRONG_ANSWER_RETRY_DELAY = 2

function safeRandom(random: () => number): number {
  try {
    const value = random()

    if (!Number.isFinite(value)) {
      return 0.5
    }

    return Math.min(Math.max(value, 0), 0.999_999)
  } catch {
    return 0.5
  }
}

function cardStrength(card: Card): number {
  const answerCount = card.correctCount + card.incorrectCount
  const successRate = answerCount === 0 ? 0 : card.correctCount / answerCount

  return (
    card.masteryLevel * 100 +
    card.currentStreak * 2 +
    successRate * 5 -
    Math.min(card.incorrectCount, 20)
  )
}

export function orderCardsForStudy(
  cards: readonly Card[],
  random: () => number = Math.random,
): Card[] {
  const uniqueCards = Array.from(
    new Map(cards.map((card) => [card.id, card])).values(),
  )

  return uniqueCards
    .map((card) => ({ card, tieBreaker: safeRandom(random) }))
    .sort(
      (left, right) =>
        cardStrength(left.card) - cardStrength(right.card) ||
        left.tieBreaker - right.tieBreaker,
    )
    .map(({ card }) => card)
}

function resolveDirection(
  direction: StudyDirection,
  random: () => number,
): ResolvedStudyDirection {
  if (direction !== 'mixed') {
    return direction
  }

  return safeRandom(random) < 0.5 ? 'front-to-back' : 'back-to-front'
}

export function createStudySession(
  cards: readonly Card[],
  direction: StudyDirection,
  random: () => number = Math.random,
): StudySession {
  const queue = orderCardsForStudy(cards, random).map((card) => ({
    cardId: card.id,
    direction: resolveDirection(direction, random),
  }))

  return {
    direction,
    queue,
    totalCards: queue.length,
    completedCardIds: [],
    correctAnswers: 0,
    incorrectAnswers: 0,
    incorrectByCardId: {},
  }
}

export function getCurrentStudyCard(
  session: StudySession,
  cards: readonly Card[],
): CurrentStudyCard | undefined {
  const queueItem = session.queue[0]

  if (queueItem === undefined) {
    return undefined
  }

  const card = cards.find((candidate) => candidate.id === queueItem.cardId)

  if (card === undefined) {
    return undefined
  }

  return {
    card,
    queueItem,
    promptText:
      queueItem.direction === 'front-to-back' ? card.frontText : card.backText,
    answerText:
      queueItem.direction === 'front-to-back' ? card.backText : card.frontText,
  }
}

export function updateCardMastery(
  card: Card,
  knewAnswer: boolean,
  reviewedAt: string = nowIsoString(),
): Card {
  const masteryLevel = Math.min(
    5,
    Math.max(0, card.masteryLevel + (knewAnswer ? 1 : -1)),
  ) as MasteryLevel

  return {
    ...card,
    correctCount: card.correctCount + (knewAnswer ? 1 : 0),
    incorrectCount: card.incorrectCount + (knewAnswer ? 0 : 1),
    currentStreak: knewAnswer ? card.currentStreak + 1 : 0,
    masteryLevel,
    lastReviewedAt: reviewedAt,
    updatedAt: reviewedAt,
  }
}

function incrementMistakeCount(
  counts: Record<string, number>,
  cardId: string,
): Record<string, number> {
  const currentCount = Object.prototype.hasOwnProperty.call(counts, cardId)
    ? counts[cardId]
    : 0

  return {
    ...counts,
    [cardId]: (currentCount ?? 0) + 1,
  }
}

export function rateCurrentCard(
  session: StudySession,
  card: Card,
  knewAnswer: boolean,
  reviewedAt: string = nowIsoString(),
): StudyAnswerResult {
  const currentItem = session.queue[0]

  if (currentItem === undefined || currentItem.cardId !== card.id) {
    return { session, updatedCard: card }
  }

  const updatedCard = updateCardMastery(card, knewAnswer, reviewedAt)
  let remainingQueue = session.queue
    .slice(1)
    .filter((item) => item.cardId !== card.id)

  if (!knewAnswer) {
    const retryIndex = Math.min(WRONG_ANSWER_RETRY_DELAY, remainingQueue.length)
    remainingQueue = [
      ...remainingQueue.slice(0, retryIndex),
      currentItem,
      ...remainingQueue.slice(retryIndex),
    ]
  }

  const completedCardIds = knewAnswer
    ? Array.from(new Set([...session.completedCardIds, card.id]))
    : session.completedCardIds

  return {
    updatedCard,
    session: {
      ...session,
      queue: remainingQueue,
      completedCardIds,
      correctAnswers: session.correctAnswers + (knewAnswer ? 1 : 0),
      incorrectAnswers: session.incorrectAnswers + (knewAnswer ? 0 : 1),
      incorrectByCardId: knewAnswer
        ? session.incorrectByCardId
        : incrementMistakeCount(session.incorrectByCardId, card.id),
    },
  }
}

export function getStudyProgress(session: StudySession): StudyProgress {
  const completedCards = Math.min(
    session.completedCardIds.length,
    session.totalCards,
  )

  return {
    completedCards,
    totalCards: session.totalCards,
    remainingCards: Math.max(0, session.totalCards - completedCards),
    percent:
      session.totalCards === 0
        ? 100
        : Math.round((completedCards / session.totalCards) * 100),
  }
}

export function getDifficultCardIds(session: StudySession): string[] {
  return Object.entries(session.incorrectByCardId)
    .filter(([, count]) => count > 0)
    .sort(([leftId, leftCount], [rightId, rightCount]) =>
      rightCount === leftCount
        ? leftId.localeCompare(rightId)
        : rightCount - leftCount,
    )
    .map(([cardId]) => cardId)
}

export function isStudySessionComplete(session: StudySession): boolean {
  return (
    session.queue.length === 0 &&
    session.completedCardIds.length >= session.totalCards
  )
}
