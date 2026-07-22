import { describe, expect, it } from 'vitest'
import type { Card, MasteryLevel, StudyDirection } from '../../types/models'
import {
  MIN_OTHER_ATTEMPTS_BETWEEN_REPEATS,
  classifyStudyCard,
  createStudySession,
  getAdaptiveStudyWeight,
  getCurrentStudyCard,
  getDifficultCardIds,
  getStudyProgress,
  isStudySessionComplete,
  orderCardsForStudy,
  rateCurrentCard,
  selectNextAdaptiveStudyItem,
  updateCardMastery,
  type StudyCardSessionState,
  type StudySession,
} from './studySession'

const timestamp = '2026-01-01T00:00:00.000Z'

function makeCard(id: string, overrides: Partial<Card> = {}): Card {
  return {
    id,
    frontText: `Vorderseite ${id}`,
    backText: `Rückseite ${id}`,
    createdAt: timestamp,
    updatedAt: timestamp,
    correctCount: 0,
    incorrectCount: 0,
    currentStreak: 0,
    masteryLevel: 0,
    ...overrides,
  }
}

function makeStrongCard(id: string, overrides: Partial<Card> = {}): Card {
  return makeCard(id, {
    correctCount: 3,
    incorrectCount: 1,
    currentStreak: 2,
    masteryLevel: 3,
    ...overrides,
  })
}

function makeUncertainCard(id: string): Card {
  return makeCard(id, {
    correctCount: 1,
    incorrectCount: 1,
    currentStreak: 1,
    masteryLevel: 2,
  })
}

function randomSequence(values: readonly number[], fallback = 0.5) {
  let index = 0
  return () => values[index++] ?? fallback
}

interface StudyHarness {
  session: StudySession
  cards: Record<string, Card>
}

function startHarness(
  cards: readonly Card[],
  direction: StudyDirection = 'front-to-back',
  random: () => number = () => 0.999,
): StudyHarness {
  return {
    session: createStudySession(cards, direction, random),
    cards: Object.fromEntries(cards.map((card) => [card.id, card])),
  }
}

function answerCurrent(
  harness: StudyHarness,
  knewAnswer: boolean,
  random: () => number = () => 0.5,
): StudyHarness {
  const cardId = harness.session.currentItem?.cardId
  if (!cardId) throw new Error('Keine aktuelle Lernkarte vorhanden.')

  const card = harness.cards[cardId]
  if (!card) throw new Error(`Karte ${cardId} fehlt im Test.`)

  const result = rateCurrentCard(
    harness.session,
    card,
    knewAnswer,
    timestamp,
    random,
  )

  return {
    session: result.session,
    cards: {
      ...harness.cards,
      [cardId]: result.updatedCard,
    },
  }
}

function firstPassIds(session: StudySession): string[] {
  return [
    ...(session.currentItem ? [session.currentItem.cardId] : []),
    ...session.remainingFirstPass.map((item) => item.cardId),
  ]
}

function adaptiveSession(
  states: readonly StudyCardSessionState[],
  currentCardId = states[states.length - 1]?.cardId,
): StudySession {
  return {
    direction: 'front-to-back',
    answerMethod: 'self-assessment',
    phase: 'adaptive',
    currentItem: currentCardId
      ? { cardId: currentCardId, direction: 'front-to-back' }
      : undefined,
    remainingFirstPass: [],
    cardStates: Object.fromEntries(
      states.map((state) => [state.cardId, state]),
    ),
    totalCards: states.length,
    attemptCount: 10,
    completedCardIds: states
      .filter((state) => state.completed)
      .map((state) => state.cardId),
    correctAnswers: 0,
    incorrectAnswers: 0,
  }
}

const baseDistanceState: StudyCardSessionState = {
  cardId: 'distance',
  direction: 'front-to-back',
  classification: 'new',
  hasBeenSeen: true,
  incorrectAnswers: 0,
  correctSinceLastIncorrect: 0,
  requiredCorrectAnswers: 2,
  completed: false,
  lastAttemptIndex: 0,
  startingMasteryLevel: 0,
  historicalSuccessRate: 0,
}

describe('historische Karteneinstufung', () => {
  it('erkennt eine Karte ohne historische Antworten als neu', () => {
    expect(classifyStudyCard(makeCard('neu'))).toBe('new')
  })

  it('erkennt eine Karte an der Erfolgsquoten-Grenze als historisch stark', () => {
    expect(classifyStudyCard(makeStrongCard('stark'))).toBe(
      'historically-strong',
    )
  })

  it('akzeptiert genau drei historische Antworten für eine starke Karte', () => {
    expect(
      classifyStudyCard(
        makeStrongCard('drei-versuche', {
          correctCount: 3,
          incorrectCount: 0,
        }),
      ),
    ).toBe('historically-strong')
  })

  it('stuft jede Karte mit einer unterschrittenen Stärke-Bedingung als unsicher ein', () => {
    const belowMastery = makeStrongCard('mastery', { masteryLevel: 2 })
    const belowStreak = makeStrongCard('streak', { currentStreak: 1 })
    const belowAttempts = makeStrongCard('attempts', {
      correctCount: 2,
      incorrectCount: 0,
    })
    const belowSuccessRate = makeStrongCard('rate', {
      correctCount: 2,
      incorrectCount: 1,
    })

    for (const card of [
      belowMastery,
      belowStreak,
      belowAttempts,
      belowSuccessRate,
    ]) {
      expect(classifyStudyCard(card)).toBe('uncertain')
    }
  })
})

describe('garantierter erster Durchgang', () => {
  it('enthält jede eindeutige Karte genau einmal', () => {
    const a = makeCard('a')
    const b = makeCard('b')
    const session = createStudySession([a, b, a], 'front-to-back', () => 0.999)

    expect(firstPassIds(session)).toEqual(['a', 'b'])
    expect(session.totalCards).toBe(2)
  })

  it('wiederholt auch falsche Karten nicht vor allen Erstversuchen', () => {
    let harness = startHarness(['a', 'b', 'c', 'd'].map((id) => makeCard(id)))
    const shownCardIds: string[] = []

    for (let index = 0; index < 4; index += 1) {
      shownCardIds.push(harness.session.currentItem?.cardId ?? '')
      harness = answerCurrent(harness, false)
    }

    expect(shownCardIds).toEqual(['a', 'b', 'c', 'd'])
    expect(new Set(shownCardIds).size).toBe(4)
    expect(harness.session.phase).toBe('adaptive')
  })

  it('markiert eine Karte bereits beim Einplanen als erstmals gezeigt', () => {
    let harness = startHarness([makeCard('a'), makeCard('b')])

    expect(harness.session.cardStates.a.hasBeenSeen).toBe(true)
    expect(harness.session.cardStates.b.hasBeenSeen).toBe(false)

    harness = answerCurrent(harness, true)

    expect(harness.session.cardStates.b.hasBeenSeen).toBe(true)
  })

  it('mischt historisch starke und übrige Karten kontrolliert', () => {
    const cards = [
      makeCard('other-a'),
      makeCard('other-b'),
      makeCard('other-c'),
      makeCard('other-d'),
      makeStrongCard('strong-a'),
      makeStrongCard('strong-b'),
    ]

    expect(orderCardsForStudy(cards, () => 0.999).map((card) => card.id)).toEqual([
      'other-a',
      'strong-a',
      'other-b',
      'other-c',
      'strong-b',
      'other-d',
    ])
  })

  it('mischt eine einzelne vorhandene Gruppe normal und reproduzierbar', () => {
    const cards = ['a', 'b', 'c', 'd'].map((id) => makeCard(id))
    const values = [0.1, 0.8, 0.3]
    const firstOrder = orderCardsForStudy(cards, randomSequence(values))
    const secondOrder = orderCardsForStudy(cards, randomSequence(values))

    expect(firstOrder.map((card) => card.id)).toEqual(
      secondOrder.map((card) => card.id),
    )
    expect(new Set(firstOrder.map((card) => card.id)).size).toBe(4)
  })
})

describe('Richtung und Antwortmethode', () => {
  it('nutzt standardmäßig Selbstbewertung und übernimmt Texteingabe', () => {
    const card = makeCard('a')

    expect(
      createStudySession([card], 'front-to-back', () => 0.5).answerMethod,
    ).toBe('self-assessment')
    expect(
      createStudySession(
        [card],
        'front-to-back',
        () => 0.5,
        'typed-answer',
      ).answerMethod,
    ).toBe('typed-answer')
  })

  it('wendet dieselben Rundenziele in beiden vorhandenen Antwortmethoden an', () => {
    for (const answerMethod of [
      'self-assessment',
      'typed-answer',
    ] as const) {
      const card = makeCard(answerMethod)
      let harness: StudyHarness = {
        session: createStudySession(
          [card],
          'front-to-back',
          () => 0.5,
          answerMethod,
        ),
        cards: { [card.id]: card },
      }

      harness = answerCurrent(harness, true)
      expect(harness.session.cardStates[card.id].completed).toBe(false)
      harness = answerCurrent(harness, true)
      expect(isStudySessionComplete(harness.session)).toBe(true)
    }
  })

  it('liefert bei Vorderseite zu Rückseite die Rückseite als Antwort', () => {
    const card = makeCard('a')
    const currentCard = getCurrentStudyCard(
      createStudySession([card], 'front-to-back', () => 0.5),
      [card],
    )

    expect(currentCard).toMatchObject({
      promptText: card.frontText,
      answerText: card.backText,
    })
  })

  it('liefert bei Rückseite zu Vorderseite die Vorderseite als Antwort', () => {
    const card = makeCard('a')
    const currentCard = getCurrentStudyCard(
      createStudySession([card], 'back-to-front', () => 0.5),
      [card],
    )

    expect(currentCard).toMatchObject({
      promptText: card.backText,
      answerText: card.frontText,
    })
  })

  it('legt gemischte Richtungen einmal fest und behält sie bei Wiederholungen', () => {
    const cards = [makeCard('a'), makeCard('b')]
    let harness = startHarness(
      cards,
      'mixed',
      randomSequence([0.999, 0.25, 0.75]),
    )

    expect(harness.session.cardStates.a.direction).toBe('front-to-back')
    expect(harness.session.cardStates.b.direction).toBe('back-to-front')

    harness = answerCurrent(harness, false)
    harness = answerCurrent(harness, true)

    expect(harness.session.currentItem).toEqual({
      cardId: 'a',
      direction: 'front-to-back',
    })
  })
})

describe('individuelle Abschlusskriterien', () => {
  it('schließt eine historisch starke Karte nach dem ersten Erfolg ab', () => {
    let harness = startHarness([makeStrongCard('a')])
    harness = answerCurrent(harness, true)

    expect(harness.session.cardStates.a.completed).toBe(true)
    expect(harness.session.completedCardIds).toEqual(['a'])
    expect(isStudySessionComplete(harness.session)).toBe(true)
  })

  it('verlangt nach einem Fehler bei einer starken Karte zwei spätere Erfolge', () => {
    let harness = startHarness([makeStrongCard('a')])
    harness = answerCurrent(harness, false)

    expect(harness.session.cardStates.a).toMatchObject({
      completed: false,
      requiredCorrectAnswers: 2,
      correctSinceLastIncorrect: 0,
    })

    harness = answerCurrent(harness, true)
    expect(harness.session.cardStates.a.completed).toBe(false)

    harness = answerCurrent(harness, true)
    expect(harness.session.cardStates.a.completed).toBe(true)
    expect(harness.session.correctAnswers).toBe(2)
    expect(harness.session.incorrectAnswers).toBe(1)
  })

  it('schließt eine neue Karte erst nach zwei getrennten Erfolgen ab', () => {
    let harness = startHarness([makeCard('a')])
    harness = answerCurrent(harness, true)

    expect(harness.session.cardStates.a.completed).toBe(false)
    expect(harness.session.completedCardIds).toEqual([])
    expect(getStudyProgress(harness.session).percent).toBe(0)

    harness = answerCurrent(harness, true)
    expect(harness.session.cardStates.a.completed).toBe(true)
    expect(getStudyProgress(harness.session).percent).toBe(100)
  })

  it('verwendet für unsichere Karten ebenfalls das Zwei-Erfolge-Kriterium', () => {
    let harness = startHarness([makeUncertainCard('a')])
    harness = answerCurrent(harness, true)

    expect(harness.session.cardStates.a.classification).toBe('uncertain')
    expect(harness.session.cardStates.a.completed).toBe(false)

    harness = answerCurrent(harness, true)
    expect(harness.session.cardStates.a.completed).toBe(true)
  })

  it('setzt die korrekte Serie bei jedem erneuten Fehler zurück', () => {
    let harness = startHarness([makeCard('a')])

    for (const knewAnswer of [false, true, false]) {
      harness = answerCurrent(harness, knewAnswer)
    }

    expect(harness.session.cardStates.a).toMatchObject({
      completed: false,
      incorrectAnswers: 2,
      correctSinceLastIncorrect: 0,
    })

    harness = answerCurrent(harness, true)
    expect(harness.session.cardStates.a.completed).toBe(false)
    harness = answerCurrent(harness, true)

    expect(harness.session.cardStates.a.completed).toBe(true)
    expect(harness.session.correctAnswers).toBe(3)
    expect(harness.session.incorrectAnswers).toBe(2)
  })
})

describe('Mindestabstand und kleine Decks', () => {
  it('wartet bei genügend Karten vier andere Versuche bis zur Wiederholung', () => {
    expect(MIN_OTHER_ATTEMPTS_BETWEEN_REPEATS).toBe(4)
    let harness = startHarness(['a', 'b', 'c', 'd', 'e'].map((id) => makeCard(id)))
    const shownCardIds: string[] = []

    for (let index = 0; index < 6; index += 1) {
      shownCardIds.push(harness.session.currentItem?.cardId ?? '')
      harness = answerCurrent(harness, true, () => 0)
    }

    expect(shownCardIds).toEqual(['a', 'b', 'c', 'd', 'e', 'a'])
  })

  it('wiederholt nie direkt, solange eine andere aktive Karte vorhanden ist', () => {
    let harness = startHarness([makeCard('a'), makeCard('b')])
    harness = answerCurrent(harness, false)
    harness = answerCurrent(harness, false)
    expect(harness.session.currentItem?.cardId).toBe('a')

    harness = answerCurrent(harness, true)
    expect(harness.session.currentItem?.cardId).toBe('b')
  })

  it('verwendet ohne regulär freie Karte die am längsten nicht gezeigte Alternative', () => {
    let harness = startHarness(['a', 'b', 'c'].map((id) => makeCard(id)))
    harness = answerCurrent(harness, false)
    harness = answerCurrent(harness, false)
    harness = answerCurrent(harness, false)

    expect(harness.session.currentItem?.cardId).toBe('a')
  })

  it('lässt exakt vier, aber nicht erst drei andere Versuche regulär zu', () => {
    const exactlyFour = {
      ...baseDistanceState,
      cardId: 'four',
      lastAttemptIndex: 5,
    }
    const onlyThree = {
      ...baseDistanceState,
      cardId: 'three',
      incorrectAnswers: 3,
      lastAttemptIndex: 6,
    }
    const current = {
      ...baseDistanceState,
      cardId: 'current',
      lastAttemptIndex: 9,
    }

    expect(
      selectNextAdaptiveStudyItem(
        adaptiveSession([exactlyFour, onlyThree, current]),
        () => 0.999,
      )?.cardId,
    ).toBe('four')
  })

  it('lässt eine einzelne aktive Karte mangels Alternative erneut erscheinen', () => {
    let harness = startHarness([makeCard('a')])
    harness = answerCurrent(harness, true)

    expect(harness.session.currentItem?.cardId).toBe('a')

    harness = answerCurrent(harness, true)
    expect(isStudySessionComplete(harness.session)).toBe(true)
  })

  it('schließt ein kleines Deck ohne Blockade oder Endlosschleife ab', () => {
    let harness = startHarness(['a', 'b', 'c'].map((id) => makeCard(id)))
    let safetyCounter = 0

    while (!isStudySessionComplete(harness.session) && safetyCounter < 20) {
      harness = answerCurrent(harness, true)
      safetyCounter += 1
    }

    expect(isStudySessionComplete(harness.session)).toBe(true)
    expect(safetyCounter).toBe(6)
  })
})

describe('adaptive Auswahl', () => {
  const baseState: StudyCardSessionState = {
    cardId: 'base',
    direction: 'front-to-back',
    classification: 'uncertain',
    hasBeenSeen: true,
    incorrectAnswers: 0,
    correctSinceLastIncorrect: 0,
    requiredCorrectAnswers: 2,
    completed: false,
    lastAttemptIndex: 0,
    startingMasteryLevel: 3,
    historicalSuccessRate: 0.75,
  }

  it('gewichtet aktuelle Fehler höher', () => {
    expect(
      getAdaptiveStudyWeight({ ...baseState, incorrectAnswers: 1 }),
    ).toBeGreaterThan(getAdaptiveStudyWeight(baseState))
  })

  it('gewichtet schwächere Mastery und Erfolgsquote höher', () => {
    const weakMastery = { ...baseState, startingMasteryLevel: 1 as MasteryLevel }
    const weakSuccessRate = { ...baseState, historicalSuccessRate: 0.25 }

    expect(getAdaptiveStudyWeight(weakMastery)).toBeGreaterThan(
      getAdaptiveStudyWeight(baseState),
    )
    expect(getAdaptiveStudyWeight(weakSuccessRate)).toBeGreaterThan(
      getAdaptiveStudyWeight(baseState),
    )
  })

  it('gibt jeder aktiven Karte ein positives Gewicht und eine Auswahlchance', () => {
    const first = { ...baseState, cardId: 'a', lastAttemptIndex: 0 }
    const second = {
      ...baseState,
      cardId: 'b',
      incorrectAnswers: 2,
      lastAttemptIndex: 1,
    }
    const session = adaptiveSession([first, second])

    expect(getAdaptiveStudyWeight(first)).toBeGreaterThan(0)
    expect(getAdaptiveStudyWeight(second)).toBeGreaterThan(0)
    expect(selectNextAdaptiveStudyItem(session, () => 0)?.cardId).toBe('a')
    expect(selectNextAdaptiveStudyItem(session, () => 0.999)?.cardId).toBe('b')
  })

  it('ist mit derselben Zufallsquelle reproduzierbar', () => {
    const states = [
      { ...baseState, cardId: 'a', lastAttemptIndex: 0 },
      { ...baseState, cardId: 'b', lastAttemptIndex: 1 },
      { ...baseState, cardId: 'c', lastAttemptIndex: 2 },
    ]
    const session = adaptiveSession(states)

    expect(selectNextAdaptiveStudyItem(session, () => 0.42)).toEqual(
      selectNextAdaptiveStudyItem(session, () => 0.42),
    )
  })
})

describe('Fortschritt, Statistiken und schwierige Karten', () => {
  it('zählt Versuche, aber nur vollständig gefestigte eindeutige Karten als abgeschlossen', () => {
    let harness = startHarness([makeCard('a'), makeCard('b'), makeCard('a')])
    harness = answerCurrent(harness, true)

    expect(harness.session.totalCards).toBe(2)
    expect(harness.session.correctAnswers).toBe(1)
    expect(harness.session.completedCardIds).toEqual([])
    expect(getStudyProgress(harness.session)).toMatchObject({
      completedCards: 0,
      totalCards: 2,
    })
  })

  it('behält fehlerhafte Karten auch nach späterer Festigung in der Schwierig-Auswertung', () => {
    let harness = startHarness([makeCard('a')])
    harness = answerCurrent(harness, false)
    harness = answerCurrent(harness, true)
    harness = answerCurrent(harness, true)

    expect(isStudySessionComplete(harness.session)).toBe(true)
    expect(getDifficultCardIds(harness.session)).toEqual(['a'])
  })

  it('sortiert schwierige Karten nach ihren Fehlern in dieser Runde', () => {
    let harness = startHarness(['a', 'b', 'c'].map((id) => makeCard(id)))
    harness = answerCurrent(harness, false)
    harness = answerCurrent(harness, false)
    harness = answerCurrent(harness, false)
    harness = answerCurrent(harness, false)

    expect(getDifficultCardIds(harness.session)).toEqual(['a', 'b', 'c'])
    expect(harness.session.cardStates.a.incorrectAnswers).toBe(2)
  })

  it('behandelt eine leere Session defensiv als abgeschlossen', () => {
    const session = createStudySession([], 'front-to-back', () => 0.5)

    expect(session.totalCards).toBe(0)
    expect(session.currentItem).toBeUndefined()
    expect(getStudyProgress(session).percent).toBe(100)
    expect(isStudySessionComplete(session)).toBe(true)
  })
})

describe('persistierte Kartenstatistiken', () => {
  it('begrenzt Mastery auf 0 bis 5 und aktualisiert Zähler und Streak', () => {
    const masteredCard = makeCard('oben', {
      masteryLevel: 5,
      correctCount: 2,
      currentStreak: 2,
    })
    const correct = updateCardMastery(masteredCard, true, timestamp)
    const failed = updateCardMastery(makeCard('unten'), false, timestamp)

    expect(correct).toMatchObject({
      masteryLevel: 5,
      correctCount: 3,
      currentStreak: 3,
      lastReviewedAt: timestamp,
    })
    expect(failed).toMatchObject({
      masteryLevel: 0,
      incorrectCount: 1,
      currentStreak: 0,
      lastReviewedAt: timestamp,
    })
  })

  it('aktualisiert die Karte bei jedem echten Versuch', () => {
    let harness = startHarness([makeCard('a')])
    harness = answerCurrent(harness, false)
    harness = answerCurrent(harness, true)
    harness = answerCurrent(harness, true)

    expect(harness.cards.a).toMatchObject({
      correctCount: 2,
      incorrectCount: 1,
      currentStreak: 2,
      masteryLevel: 2,
    })
  })
})
