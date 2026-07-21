export const SCHEMA_VERSION = 1 as const

export type MasteryLevel = 0 | 1 | 2 | 3 | 4 | 5

export type FutureMediaKind = 'image' | 'audio'

export interface FutureMediaReference {
  id: string
  kind: FutureMediaKind
  source: string
  description?: string
}

export interface CardMediaSlots {
  front?: FutureMediaReference[]
  back?: FutureMediaReference[]
}

export interface Card {
  id: string
  frontText: string
  backText: string
  createdAt: string
  updatedAt: string
  correctCount: number
  incorrectCount: number
  currentStreak: number
  masteryLevel: MasteryLevel
  lastReviewedAt?: string
  /** Reserved for a later version. The MVP neither creates nor renders media. */
  media?: CardMediaSlots
}

export interface Deck {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  cards: Card[]
}

export interface AppData {
  schemaVersion: typeof SCHEMA_VERSION
  decks: Deck[]
}

export type StudyDirection = 'front-to-back' | 'back-to-front' | 'mixed'

export interface ImportedCardDraft {
  frontText: string
  backText: string
}
