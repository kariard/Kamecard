import {
  SCHEMA_VERSION,
  type AppData,
  type Card,
  type CardMediaSlots,
  type Deck,
  type FutureMediaReference,
  type MasteryLevel,
} from '../types/models'

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: string[] }

export interface RecoveredAppData {
  data: AppData
  errors: string[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readNonEmptyString(
  value: unknown,
  path: string,
  errors: string[],
): string | undefined {
  if (typeof value !== 'string' || value.trim().length === 0) {
    errors.push(`${path} muss ein nicht leerer Text sein.`)
    return undefined
  }

  return value
}

function readDateString(
  value: unknown,
  path: string,
  errors: string[],
): string | undefined {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    Number.isNaN(Date.parse(value))
  ) {
    errors.push(`${path} muss ein gültiges Datum sein.`)
    return undefined
  }

  return value
}

function readNonNegativeInteger(
  value: unknown,
  path: string,
  errors: string[],
): number | undefined {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    errors.push(`${path} muss eine nicht negative Ganzzahl sein.`)
    return undefined
  }

  return value as number
}

function readMasteryLevel(
  value: unknown,
  path: string,
  errors: string[],
): MasteryLevel | undefined {
  if (!Number.isInteger(value) || (value as number) < 0 || (value as number) > 5) {
    errors.push(`${path} muss zwischen 0 und 5 liegen.`)
    return undefined
  }

  return value as MasteryLevel
}

function parseMediaReference(
  value: unknown,
  path: string,
  errors: string[],
): FutureMediaReference | undefined {
  const initialErrorCount = errors.length

  if (!isRecord(value)) {
    errors.push(`${path} muss ein Objekt sein.`)
    return undefined
  }

  const id = readNonEmptyString(value.id, `${path}.id`, errors)
  const source = readNonEmptyString(value.source, `${path}.source`, errors)
  const kind = value.kind

  if (kind !== 'image' && kind !== 'audio') {
    errors.push(`${path}.kind muss "image" oder "audio" sein.`)
  }

  if (value.description !== undefined && typeof value.description !== 'string') {
    errors.push(`${path}.description muss ein Text sein.`)
  }

  if (
    errors.length !== initialErrorCount ||
    id === undefined ||
    source === undefined ||
    (kind !== 'image' && kind !== 'audio')
  ) {
    return undefined
  }

  return {
    id,
    source,
    kind,
    ...(value.description === undefined
      ? {}
      : { description: value.description as string }),
  }
}

function parseMediaList(
  value: unknown,
  path: string,
  errors: string[],
): FutureMediaReference[] | undefined {
  if (!Array.isArray(value)) {
    errors.push(`${path} muss eine Liste sein.`)
    return undefined
  }

  const media = value.map((item, index) =>
    parseMediaReference(item, `${path}[${index}]`, errors),
  )

  if (media.some((item) => item === undefined)) {
    return undefined
  }

  return media as FutureMediaReference[]
}

function parseMediaSlots(
  value: unknown,
  path: string,
  errors: string[],
): CardMediaSlots | undefined {
  const initialErrorCount = errors.length

  if (!isRecord(value)) {
    errors.push(`${path} muss ein Objekt sein.`)
    return undefined
  }

  const front =
    value.front === undefined
      ? undefined
      : parseMediaList(value.front, `${path}.front`, errors)
  const back =
    value.back === undefined
      ? undefined
      : parseMediaList(value.back, `${path}.back`, errors)

  if (errors.length !== initialErrorCount) {
    return undefined
  }

  return {
    ...(front === undefined ? {} : { front }),
    ...(back === undefined ? {} : { back }),
  }
}

function parseCard(
  value: unknown,
  path: string,
  errors: string[],
): Card | undefined {
  const initialErrorCount = errors.length

  if (!isRecord(value)) {
    errors.push(`${path} muss ein Objekt sein.`)
    return undefined
  }

  const id = readNonEmptyString(value.id, `${path}.id`, errors)
  const frontText = readNonEmptyString(
    value.frontText,
    `${path}.frontText`,
    errors,
  )
  const backText = readNonEmptyString(
    value.backText,
    `${path}.backText`,
    errors,
  )
  const createdAt = readDateString(value.createdAt, `${path}.createdAt`, errors)
  const updatedAt = readDateString(value.updatedAt, `${path}.updatedAt`, errors)
  const correctCount = readNonNegativeInteger(
    value.correctCount,
    `${path}.correctCount`,
    errors,
  )
  const incorrectCount = readNonNegativeInteger(
    value.incorrectCount,
    `${path}.incorrectCount`,
    errors,
  )
  const currentStreak = readNonNegativeInteger(
    value.currentStreak,
    `${path}.currentStreak`,
    errors,
  )
  const masteryLevel = readMasteryLevel(
    value.masteryLevel,
    `${path}.masteryLevel`,
    errors,
  )
  const lastReviewedAt =
    value.lastReviewedAt === undefined
      ? undefined
      : readDateString(
          value.lastReviewedAt,
          `${path}.lastReviewedAt`,
          errors,
        )
  const media =
    value.media === undefined
      ? undefined
      : parseMediaSlots(value.media, `${path}.media`, errors)

  if (
    errors.length !== initialErrorCount ||
    id === undefined ||
    frontText === undefined ||
    backText === undefined ||
    createdAt === undefined ||
    updatedAt === undefined ||
    correctCount === undefined ||
    incorrectCount === undefined ||
    currentStreak === undefined ||
    masteryLevel === undefined
  ) {
    return undefined
  }

  return {
    id,
    frontText,
    backText,
    createdAt,
    updatedAt,
    correctCount,
    incorrectCount,
    currentStreak,
    masteryLevel,
    ...(lastReviewedAt === undefined ? {} : { lastReviewedAt }),
    ...(media === undefined ? {} : { media }),
  }
}

function parseDeck(
  value: unknown,
  path: string,
  errors: string[],
): Deck | undefined {
  const initialErrorCount = errors.length

  if (!isRecord(value)) {
    errors.push(`${path} muss ein Objekt sein.`)
    return undefined
  }

  const id = readNonEmptyString(value.id, `${path}.id`, errors)
  const name = readNonEmptyString(value.name, `${path}.name`, errors)
  const createdAt = readDateString(value.createdAt, `${path}.createdAt`, errors)
  const updatedAt = readDateString(value.updatedAt, `${path}.updatedAt`, errors)

  if (!Array.isArray(value.cards)) {
    errors.push(`${path}.cards muss eine Liste sein.`)
  }

  const cards = Array.isArray(value.cards)
    ? value.cards.map((card, index) =>
        parseCard(card, `${path}.cards[${index}]`, errors),
      )
    : []
  const seenCardIds = new Set<string>()

  for (const card of cards) {
    if (card === undefined) {
      continue
    }

    if (seenCardIds.has(card.id)) {
      errors.push(`${path}.cards enthält die Karten-ID ${card.id} mehrfach.`)
    }
    seenCardIds.add(card.id)
  }

  if (
    errors.length !== initialErrorCount ||
    id === undefined ||
    name === undefined ||
    createdAt === undefined ||
    updatedAt === undefined ||
    cards.some((card) => card === undefined)
  ) {
    return undefined
  }

  return {
    id,
    name,
    createdAt,
    updatedAt,
    cards: cards as Card[],
  }
}

export function validateCard(value: unknown): ValidationResult<Card> {
  const errors: string[] = []
  const card = parseCard(value, 'card', errors)

  return card === undefined
    ? { ok: false, errors }
    : { ok: true, value: card }
}

export function validateDeck(value: unknown): ValidationResult<Deck> {
  const errors: string[] = []
  const deck = parseDeck(value, 'deck', errors)

  return deck === undefined
    ? { ok: false, errors }
    : { ok: true, value: deck }
}

export function validateAppData(value: unknown): ValidationResult<AppData> {
  const errors: string[] = []

  if (!isRecord(value)) {
    return { ok: false, errors: ['Die App-Daten müssen ein Objekt sein.'] }
  }

  if (value.schemaVersion !== SCHEMA_VERSION) {
    errors.push(`schemaVersion muss ${SCHEMA_VERSION} sein.`)
  }

  if (!Array.isArray(value.decks)) {
    errors.push('decks muss eine Liste sein.')
  }

  const decks = Array.isArray(value.decks)
    ? value.decks.map((deck, index) =>
        parseDeck(deck, `decks[${index}]`, errors),
      )
    : []
  const seenDeckIds = new Set<string>()

  for (const deck of decks) {
    if (deck === undefined) {
      continue
    }

    if (seenDeckIds.has(deck.id)) {
      errors.push(`decks enthält die Deck-ID ${deck.id} mehrfach.`)
    }
    seenDeckIds.add(deck.id)
  }

  if (errors.length > 0 || decks.some((deck) => deck === undefined)) {
    return { ok: false, errors }
  }

  return {
    ok: true,
    value: {
      schemaVersion: SCHEMA_VERSION,
      decks: decks as Deck[],
    },
  }
}

export function recoverAppData(value: unknown): RecoveredAppData | undefined {
  if (
    !isRecord(value) ||
    value.schemaVersion !== SCHEMA_VERSION ||
    !Array.isArray(value.decks)
  ) {
    return undefined
  }

  const errors: string[] = []
  const decks: Deck[] = []
  const seenDeckIds = new Set<string>()

  value.decks.forEach((candidate, index) => {
    const result = validateDeck(candidate)

    if (!result.ok) {
      errors.push(
        ...result.errors.map((error) => `decks[${index}]: ${error}`),
      )
      return
    }

    if (seenDeckIds.has(result.value.id)) {
      errors.push(`decks[${index}] hat eine bereits verwendete ID.`)
      return
    }

    seenDeckIds.add(result.value.id)
    decks.push(result.value)
  })

  return {
    data: { schemaVersion: SCHEMA_VERSION, decks },
    errors,
  }
}
