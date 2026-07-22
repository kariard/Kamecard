import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { StorageLike } from '../storage'
import type { Card, Deck } from '../types/models'
import { startStudyWithSelectedOptions } from './studySetupSelection'
import { StudySessionView, StudySetupView } from './StudyViews'

const timestamp = '2026-01-01T00:00:00.000Z'

function makeCard(id: string, frontText: string, backText: string): Card {
  return {
    id,
    frontText,
    backText,
    createdAt: timestamp,
    updatedAt: timestamp,
    correctCount: 0,
    incorrectCount: 0,
    currentStreak: 0,
    masteryLevel: 0,
  }
}

function renderSetup(cards: Card[]): string {
  const deck: Deck = {
    id: 'deck',
    name: 'Französisch',
    createdAt: timestamp,
    updatedAt: timestamp,
    cards,
  }

  return renderToStaticMarkup(
    createElement(StudySetupView, { deck, onStart: () => undefined }),
  )
}

function mockBrowserStorage(rawValue: string | null): {
  storage: StorageLike
  getItem: ReturnType<typeof vi.fn>
  setItem: ReturnType<typeof vi.fn>
} {
  const getItem = vi.fn(() => rawValue)
  const setItem = vi.fn()
  const storage: StorageLike = {
    getItem,
    setItem,
    removeItem: vi.fn(),
  }

  vi.stubGlobal('localStorage', storage)
  return { storage, getItem, setItem }
}

function expectCheckedRadio(
  markup: string,
  name: string,
  value: string,
): void {
  const radio = markup.match(
    new RegExp(`<input[^>]*name="${name}"[^>]*value="${value}"[^>]*>`),
  )?.[0]

  expect(radio).toContain('checked=""')
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('StudySetupView direction previews', () => {
  it('zeigt für alle Richtungen die Werte der ersten Deckkarte', () => {
    const markup = renderSetup([
      makeCard('first', 'Haus', 'maison'),
      makeCard('second', 'Baum', 'arbre'),
    ])

    expect(markup).toContain('Haus → maison')
    expect(markup).toContain('maison → Haus')
    expect(markup).toContain('Haus ⇄ maison')
    expect(markup).not.toContain('Baum')
    expect(markup).not.toContain('arbre')
  })

  it('rendert für ein leeres Deck neutrale Vorschauen', () => {
    const markup = renderSetup([])

    expect(markup).toContain('Vorderseite → Rückseite')
    expect(markup).toContain('Rückseite → Vorderseite')
    expect(markup).toContain('Vorderseite ⇄ Rückseite')
  })
})

describe('StudySetupView preparation controls', () => {
  it('renders exactly one enabled start button before the direction options', () => {
    const markup = renderSetup([makeCard('card', 'Haus', 'maison')])
    const startPosition = markup.indexOf('Lernrunde starten')
    const directionPosition = markup.indexOf('Welche Richtung?')

    expect(startPosition).toBeGreaterThanOrEqual(0)
    expect(startPosition).toBeLessThan(directionPosition)
    expect(markup.match(/Lernrunde starten/g)).toHaveLength(1)
    expect(markup).not.toMatch(/study-start-button[^>]*disabled=""/)
  })

  it('disables the single start button for an empty deck', () => {
    const markup = renderSetup([])

    expect(markup.match(/Lernrunde starten/g)).toHaveLength(1)
    expect(markup).toMatch(/study-start-button[^>]*disabled=""/)
  })

  it('forwards the selected direction and answer method unchanged', () => {
    const onStart = vi.fn()

    startStudyWithSelectedOptions(
      onStart,
      'back-to-front',
      'self-assessment',
    )

    expect(onStart).toHaveBeenCalledOnce()
    expect(onStart).toHaveBeenCalledWith(
      'back-to-front',
      'self-assessment',
    )
  })
})

describe('StudySetupView preferences', () => {
  it('selects mixed and typed answers without stored preferences', () => {
    const { getItem, setItem } = mockBrowserStorage(null)
    const markup = renderSetup([makeCard('card', 'Haus', 'maison')])

    expectCheckedRadio(markup, 'study-direction', 'mixed')
    expectCheckedRadio(markup, 'study-answer-method', 'typed-answer')
    expect(getItem).toHaveBeenCalledOnce()
    expect(setItem).not.toHaveBeenCalled()
  })

  it('loads valid preferences globally for later deck preparations', () => {
    const { getItem, setItem } = mockBrowserStorage(
      JSON.stringify({
        version: 1,
        direction: 'back-to-front',
        answerMethod: 'self-assessment',
      }),
    )

    const firstDeckMarkup = renderSetup([
      makeCard('first-card', 'Haus', 'maison'),
    ])
    const secondDeckMarkup = renderSetup([
      makeCard('second-card', 'Baum', 'arbre'),
    ])

    expectCheckedRadio(
      firstDeckMarkup,
      'study-direction',
      'back-to-front',
    )
    expectCheckedRadio(
      firstDeckMarkup,
      'study-answer-method',
      'self-assessment',
    )
    expectCheckedRadio(
      secondDeckMarkup,
      'study-direction',
      'back-to-front',
    )
    expectCheckedRadio(
      secondDeckMarkup,
      'study-answer-method',
      'self-assessment',
    )
    expect(getItem).toHaveBeenCalledTimes(2)
    expect(setItem).not.toHaveBeenCalled()
  })

  it('falls back safely when browser storage throws while opening', () => {
    const setItem = vi.fn()
    const storage: StorageLike = {
      getItem: () => {
        throw new Error('Lesen blockiert')
      },
      setItem,
      removeItem: vi.fn(),
    }
    vi.stubGlobal('localStorage', storage)

    const markup = renderSetup([makeCard('card', 'Haus', 'maison')])

    expectCheckedRadio(markup, 'study-direction', 'mixed')
    expectCheckedRadio(markup, 'study-answer-method', 'typed-answer')
    expect(setItem).not.toHaveBeenCalled()
  })
})

describe('StudySessionView adaptive progress', () => {
  it('unterscheidet gefestigte Karten von Antwortversuchen', () => {
    const markup = renderToStaticMarkup(
      createElement(StudySessionView, {
        deckName: 'Testdeck',
        answerMethod: 'self-assessment',
        prompt: 'Haus',
        answer: 'maison',
        isFlipped: true,
        progress: 50,
        completedCards: 1,
        totalCards: 2,
        correctCount: 3,
        incorrectCount: 1,
        onReveal: () => undefined,
        onRate: () => false,
        onContinueAfterTypedAnswer: () => undefined,
        onQuit: () => undefined,
      }),
    )

    expect(markup).toContain('1 von 2 Karten gefestigt')
    expect(markup).toContain('3 gewusst')
    expect(markup).toContain('1 nicht gewusst')
  })
})
