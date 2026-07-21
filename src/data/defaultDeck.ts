import { SCHEMA_VERSION, type AppData, type Deck } from '../types/models'
import { nowIsoString } from '../utils/date'
import { createCard, createDeck } from '../utils/records'

export const DEFAULT_DECK_NAME = 'Japanisch – Vokale & K-Reihe'

export const DEFAULT_CARD_PAIRS = [
  ['あ', 'a'],
  ['い', 'i'],
  ['う', 'u'],
  ['え', 'e'],
  ['お', 'o'],
  ['か', 'ka'],
  ['き', 'ki'],
  ['く', 'ku'],
  ['け', 'ke'],
  ['こ', 'ko'],
] as const

export function createDefaultDeck(): Deck {
  const timestamp = nowIsoString()
  const deck = createDeck(DEFAULT_DECK_NAME, timestamp)

  return {
    ...deck,
    cards: DEFAULT_CARD_PAIRS.map(([frontText, backText]) =>
      createCard(frontText, backText, timestamp),
    ),
  }
}

export function createDefaultAppData(): AppData {
  return {
    schemaVersion: SCHEMA_VERSION,
    decks: [createDefaultDeck()],
  }
}

export function createEmptyAppData(): AppData {
  return {
    schemaVersion: SCHEMA_VERSION,
    decks: [],
  }
}
