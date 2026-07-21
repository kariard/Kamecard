import type { Card, Deck } from '../types/models'
import { nowIsoString } from './date'
import { createId } from './id'

function requireText(value: string, fieldName: string): string {
  const trimmedValue = value.trim()

  if (trimmedValue.length === 0) {
    throw new RangeError(`${fieldName} darf nicht leer sein.`)
  }

  return trimmedValue
}

export function createCard(
  frontText: string,
  backText: string,
  timestamp: string = nowIsoString(),
): Card {
  return {
    id: createId(),
    frontText: requireText(frontText, 'Die Vorderseite'),
    backText: requireText(backText, 'Die Rückseite'),
    createdAt: timestamp,
    updatedAt: timestamp,
    correctCount: 0,
    incorrectCount: 0,
    currentStreak: 0,
    masteryLevel: 0,
  }
}

export function createDeck(
  name: string,
  timestamp: string = nowIsoString(),
): Deck {
  return {
    id: createId(),
    name: requireText(name, 'Der Deckname'),
    createdAt: timestamp,
    updatedAt: timestamp,
    cards: [],
  }
}
