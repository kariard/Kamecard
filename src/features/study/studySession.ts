import type {
  Card,
  MasteryLevel,
  StudyDirection,
} from '../../types/models'
import { nowIsoString } from '../../utils/date'

export type ResolvedStudyDirection = Exclude<StudyDirection, 'mixed'>

export type StudyAnswerMethod = 'self-assessment' | 'typed-answer'

export type StudyRoundPhase = 'first-pass' | 'adaptive'

export type StudyCardClassification =
  | 'new'
  | 'uncertain'
  | 'historically-strong'

export interface StudyQueueItem {
  cardId: string
  direction: ResolvedStudyDirection
}

export interface StudyCardSessionState {
  cardId: string
  direction: ResolvedStudyDirection
  classification: StudyCardClassification
  hasBeenSeen: boolean
  incorrectAnswers: number
  correctSinceLastIncorrect: number
  requiredCorrectAnswers: number
  completed: boolean
  lastAttemptIndex: number | null
  startingMasteryLevel: MasteryLevel
  historicalSuccessRate: number
}

export interface StudySession {
  direction: StudyDirection
  answerMethod: StudyAnswerMethod
  phase: StudyRoundPhase
  currentItem?: StudyQueueItem
  remainingFirstPass: StudyQueueItem[]
  cardStates: Record<string, StudyCardSessionState>
  totalCards: number
  attemptCount: number
  completedCardIds: string[]
  correctAnswers: number
  incorrectAnswers: number
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

export const HISTORICALLY_STRONG_MIN_MASTERY_LEVEL = 3
export const HISTORICALLY_STRONG_MIN_STREAK = 2
export const HISTORICALLY_STRONG_MIN_ATTEMPTS = 3
export const HISTORICALLY_STRONG_MIN_SUCCESS_RATE = 0.75
export const MIN_OTHER_ATTEMPTS_BETWEEN_REPEATS = 4

const STRONG_CARD_REQUIRED_CORRECT_ANSWERS = 1
const DEFAULT_REQUIRED_CORRECT_ANSWERS = 2
const BASE_ADAPTIVE_WEIGHT = 1
const ERROR_WEIGHT_PER_MISTAKE = 3
const MAX_WEIGHTED_MISTAKES = 3
const MASTERY_DEFICIT_WEIGHT = 0.5
const HISTORICAL_FAILURE_WEIGHT = 2

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

function historicalAttemptCount(card: Card): number {
  return card.correctCount + card.incorrectCount
}

function historicalSuccessRate(card: Card): number {
  const attemptCount = historicalAttemptCount(card)
  return attemptCount === 0 ? 0 : card.correctCount / attemptCount
}

export function classifyStudyCard(card: Card): StudyCardClassification {
  const attemptCount = historicalAttemptCount(card)

  if (attemptCount === 0) {
    return 'new'
  }

  if (
    card.masteryLevel >= HISTORICALLY_STRONG_MIN_MASTERY_LEVEL &&
    card.currentStreak >= HISTORICALLY_STRONG_MIN_STREAK &&
    attemptCount >= HISTORICALLY_STRONG_MIN_ATTEMPTS &&
    historicalSuccessRate(card) >= HISTORICALLY_STRONG_MIN_SUCCESS_RATE
  ) {
    return 'historically-strong'
  }

  return 'uncertain'
}

function shuffleItems<T>(
  items: readonly T[],
  random: () => number,
): T[] {
  const shuffled = [...items]

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(safeRandom(random) * (index + 1))
    const current = shuffled[index]
    shuffled[index] = shuffled[swapIndex]
    shuffled[swapIndex] = current
  }

  return shuffled
}

function interleaveFirstPassGroups(
  otherCards: readonly Card[],
  strongCards: readonly Card[],
): Card[] {
  if (otherCards.length === 0) return [...strongCards]
  if (strongCards.length === 0) return [...otherCards]

  const result: Card[] = []
  let otherIndex = 0
  let strongIndex = 0

  while (
    otherIndex < otherCards.length ||
    strongIndex < strongCards.length
  ) {
    if (otherIndex >= otherCards.length) {
      result.push(strongCards[strongIndex])
      strongIndex += 1
      continue
    }

    if (strongIndex >= strongCards.length) {
      result.push(otherCards[otherIndex])
      otherIndex += 1
      continue
    }

    const nextOtherPosition =
      (otherIndex + 0.5) / otherCards.length
    const nextStrongPosition =
      (strongIndex + 0.5) / strongCards.length

    if (nextOtherPosition <= nextStrongPosition) {
      result.push(otherCards[otherIndex])
      otherIndex += 1
    } else {
      result.push(strongCards[strongIndex])
      strongIndex += 1
    }
  }

  return result
}

export function orderCardsForStudy(
  cards: readonly Card[],
  random: () => number = Math.random,
): Card[] {
  const uniqueCards = Array.from(
    new Map(cards.map((card) => [card.id, card])).values(),
  )
  const strongCards = uniqueCards.filter(
    (card) => classifyStudyCard(card) === 'historically-strong',
  )
  const otherCards = uniqueCards.filter(
    (card) => classifyStudyCard(card) !== 'historically-strong',
  )

  return interleaveFirstPassGroups(
    shuffleItems(otherCards, random),
    shuffleItems(strongCards, random),
  )
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

function requiredCorrectAnswers(
  classification: StudyCardClassification,
): number {
  return classification === 'historically-strong'
    ? STRONG_CARD_REQUIRED_CORRECT_ANSWERS
    : DEFAULT_REQUIRED_CORRECT_ANSWERS
}

function toQueueItem(state: StudyCardSessionState): StudyQueueItem {
  return {
    cardId: state.cardId,
    direction: state.direction,
  }
}

function markItemAsSeen(
  states: Record<string, StudyCardSessionState>,
  item: StudyQueueItem | undefined,
): Record<string, StudyCardSessionState> {
  if (!item) return states

  const state = states[item.cardId]
  if (!state || state.hasBeenSeen) return states

  return {
    ...states,
    [item.cardId]: {
      ...state,
      hasBeenSeen: true,
    },
  }
}

export function createStudySession(
  cards: readonly Card[],
  direction: StudyDirection,
  random: () => number = Math.random,
  answerMethod: StudyAnswerMethod = 'self-assessment',
): StudySession {
  const orderedCards = orderCardsForStudy(cards, random)
  const cardStates = Object.fromEntries(
    orderedCards.map((card) => {
      const classification = classifyStudyCard(card)
      const state: StudyCardSessionState = {
        cardId: card.id,
        direction: resolveDirection(direction, random),
        classification,
        hasBeenSeen: false,
        incorrectAnswers: 0,
        correctSinceLastIncorrect: 0,
        requiredCorrectAnswers: requiredCorrectAnswers(classification),
        completed: false,
        lastAttemptIndex: null,
        startingMasteryLevel: card.masteryLevel,
        historicalSuccessRate: historicalSuccessRate(card),
      }

      return [card.id, state]
    }),
  )
  const firstPass = orderedCards.map((card) =>
    toQueueItem(cardStates[card.id]),
  )
  const currentItem = firstPass[0]

  return {
    direction,
    answerMethod,
    phase: firstPass.length === 0 ? 'adaptive' : 'first-pass',
    currentItem,
    remainingFirstPass: firstPass.slice(1),
    cardStates: markItemAsSeen(cardStates, currentItem),
    totalCards: firstPass.length,
    attemptCount: 0,
    completedCardIds: [],
    correctAnswers: 0,
    incorrectAnswers: 0,
  }
}

export function getCurrentStudyCard(
  session: StudySession,
  cards: readonly Card[],
): CurrentStudyCard | undefined {
  const queueItem = session.currentItem

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

export function getAdaptiveStudyWeight(
  state: StudyCardSessionState,
): number {
  const mistakeBonus =
    Math.min(state.incorrectAnswers, MAX_WEIGHTED_MISTAKES) *
    ERROR_WEIGHT_PER_MISTAKE
  const masteryBonus =
    (5 - state.startingMasteryLevel) * MASTERY_DEFICIT_WEIGHT
  const successRateBonus =
    state.classification === 'new'
      ? 0
      : (1 - state.historicalSuccessRate) * HISTORICAL_FAILURE_WEIGHT

  return BASE_ADAPTIVE_WEIGHT + mistakeBonus + masteryBonus + successRateBonus
}

function otherAttemptsSinceLastAttempt(
  state: StudyCardSessionState,
  attemptCount: number,
): number {
  if (state.lastAttemptIndex === null) {
    return Number.POSITIVE_INFINITY
  }

  return Math.max(0, attemptCount - state.lastAttemptIndex - 1)
}

function chooseWeightedState(
  states: readonly StudyCardSessionState[],
  random: () => number,
): StudyCardSessionState | undefined {
  if (states.length === 0) return undefined

  const totalWeight = states.reduce(
    (sum, state) => sum + getAdaptiveStudyWeight(state),
    0,
  )
  const target = safeRandom(random) * totalWeight
  let accumulatedWeight = 0

  for (const state of states) {
    accumulatedWeight += getAdaptiveStudyWeight(state)
    if (target < accumulatedWeight) {
      return state
    }
  }

  return states[states.length - 1]
}

export function selectNextAdaptiveStudyItem(
  session: StudySession,
  random: () => number = Math.random,
): StudyQueueItem | undefined {
  const activeStates = Object.values(session.cardStates).filter(
    (state) => !state.completed,
  )

  if (activeStates.length === 0) return undefined

  const unseenState = activeStates.find((state) => !state.hasBeenSeen)
  if (unseenState) return toQueueItem(unseenState)

  const eligibleStates = activeStates.filter(
    (state) =>
      otherAttemptsSinceLastAttempt(state, session.attemptCount) >=
      MIN_OTHER_ATTEMPTS_BETWEEN_REPEATS,
  )
  const weightedChoice = chooseWeightedState(eligibleStates, random)

  if (weightedChoice) return toQueueItem(weightedChoice)
  if (activeStates.length === 1) return toQueueItem(activeStates[0])

  const alternatives = activeStates.filter(
    (state) => state.cardId !== session.currentItem?.cardId,
  )
  const fallbackPool = alternatives.length > 0 ? alternatives : activeStates
  const leastRecentlyAttempted = [...fallbackPool].sort(
    (left, right) =>
      (left.lastAttemptIndex ?? -1) - (right.lastAttemptIndex ?? -1),
  )[0]

  return leastRecentlyAttempted
    ? toQueueItem(leastRecentlyAttempted)
    : undefined
}

function completedCardIds(
  states: Record<string, StudyCardSessionState>,
): string[] {
  return Object.values(states)
    .filter((state) => state.completed)
    .map((state) => state.cardId)
}

export function rateCurrentCard(
  session: StudySession,
  card: Card,
  knewAnswer: boolean,
  reviewedAt: string = nowIsoString(),
  random: () => number = Math.random,
): StudyAnswerResult {
  const currentItem = session.currentItem
  const currentState = session.cardStates[card.id]

  if (
    currentItem === undefined ||
    currentItem.cardId !== card.id ||
    currentState === undefined
  ) {
    return { session, updatedCard: card }
  }

  const updatedCard = updateCardMastery(card, knewAnswer, reviewedAt)
  const nextRequiredCorrectAnswers = knewAnswer
    ? currentState.requiredCorrectAnswers
    : DEFAULT_REQUIRED_CORRECT_ANSWERS
  const nextCorrectSeries = knewAnswer
    ? currentState.correctSinceLastIncorrect + 1
    : 0
  const updatedState: StudyCardSessionState = {
    ...currentState,
    hasBeenSeen: true,
    incorrectAnswers:
      currentState.incorrectAnswers + (knewAnswer ? 0 : 1),
    correctSinceLastIncorrect: nextCorrectSeries,
    requiredCorrectAnswers: nextRequiredCorrectAnswers,
    completed:
      knewAnswer && nextCorrectSeries >= nextRequiredCorrectAnswers,
    lastAttemptIndex: session.attemptCount,
  }
  const cardStates = {
    ...session.cardStates,
    [card.id]: updatedState,
  }
  const attemptCount = session.attemptCount + 1
  const hasRemainingFirstPass =
    session.phase === 'first-pass' &&
    session.remainingFirstPass.length > 0
  const nextFirstPassItem = hasRemainingFirstPass
    ? session.remainingFirstPass[0]
    : undefined
  const cardStatesAfterScheduling = markItemAsSeen(
    cardStates,
    nextFirstPassItem,
  )
  const sessionAfterAttempt: StudySession = {
    ...session,
    phase: hasRemainingFirstPass ? 'first-pass' : 'adaptive',
    currentItem: nextFirstPassItem ?? currentItem,
    remainingFirstPass: hasRemainingFirstPass
      ? session.remainingFirstPass.slice(1)
      : [],
    cardStates: cardStatesAfterScheduling,
    attemptCount,
    completedCardIds: completedCardIds(cardStatesAfterScheduling),
    correctAnswers: session.correctAnswers + (knewAnswer ? 1 : 0),
    incorrectAnswers: session.incorrectAnswers + (knewAnswer ? 0 : 1),
  }
  const nextItem = hasRemainingFirstPass
    ? sessionAfterAttempt.currentItem
    : selectNextAdaptiveStudyItem(sessionAfterAttempt, random)

  return {
    updatedCard,
    session: {
      ...sessionAfterAttempt,
      currentItem: nextItem,
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
  return Object.values(session.cardStates)
    .filter((state) => state.incorrectAnswers > 0)
    .sort((left, right) =>
      right.incorrectAnswers === left.incorrectAnswers
        ? left.cardId.localeCompare(right.cardId)
        : right.incorrectAnswers - left.incorrectAnswers,
    )
    .map((state) => state.cardId)
}

export function isStudySessionComplete(session: StudySession): boolean {
  return (
    session.currentItem === undefined &&
    session.completedCardIds.length >= session.totalCards
  )
}
