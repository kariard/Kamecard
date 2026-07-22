import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { Card, Deck } from '../types/models'
import { StudySetupView } from './StudyViews'

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
