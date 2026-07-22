import { Children, createElement, isValidElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type { Deck } from '../types/models'
import { DeckOverviewView, OverviewActions } from './DeckOverviewView'

const timestamp = '2026-01-01T00:00:00.000Z'

function makeDeck(): Deck {
  return {
    id: 'deck-1',
    name: 'Französisch',
    createdAt: timestamp,
    updatedAt: timestamp,
    cards: [],
  }
}

function renderOverview(decks: Deck[]): string {
  return renderToStaticMarkup(
    createElement(DeckOverviewView, {
      decks,
      getProgress: () => 0,
      onCreateDeck: vi.fn(),
      onOpenDeck: vi.fn(),
      onImport: vi.fn(),
      onBackup: vi.fn(),
    }),
  )
}

describe('DeckOverviewView Reihenfolge', () => {
  it('zeigt Einleitung und Deckliste vor den drei Aktionen', () => {
    const markup = renderOverview([makeDeck()])
    const introPosition = markup.indexOf('Was möchtest du heute lernen?')
    const deckPosition = markup.indexOf('Französisch')
    const importPosition = markup.indexOf('Importieren')
    const backupPosition = markup.indexOf('Backup')
    const createPosition = markup.indexOf('Neues Deck')

    expect(introPosition).toBeGreaterThanOrEqual(0)
    expect(deckPosition).toBeGreaterThan(introPosition)
    expect(importPosition).toBeGreaterThan(deckPosition)
    expect(backupPosition).toBeGreaterThan(importPosition)
    expect(createPosition).toBeGreaterThan(backupPosition)
    expect(markup.match(/>Importieren<\/button>/g)).toHaveLength(1)
    expect(markup.match(/>Backup<\/button>/g)).toHaveLength(1)
    expect(markup.match(/Neues Deck<\/button>/g)).toHaveLength(1)
  })

  it('zeigt auch den Leerzustand vor den drei Aktionen', () => {
    const markup = renderOverview([])
    const introPosition = markup.indexOf('Was möchtest du heute lernen?')
    const emptyStatePosition = markup.indexOf('Noch keine Decks')
    const importPosition = markup.indexOf('Importieren')
    const backupPosition = markup.indexOf('Backup')
    const createPosition = markup.indexOf('Neues Deck')

    expect(emptyStatePosition).toBeGreaterThan(introPosition)
    expect(importPosition).toBeGreaterThan(emptyStatePosition)
    expect(backupPosition).toBeGreaterThan(importPosition)
    expect(createPosition).toBeGreaterThan(backupPosition)
    expect(markup).toContain('Erstes Deck erstellen')
  })

  it('verwendet weiterhin die drei bestehenden Aktionshandler', () => {
    const onImport = vi.fn()
    const onBackup = vi.fn()
    const onCreate = vi.fn()
    const actions = OverviewActions({ onImport, onBackup, onCreate })

    Children.forEach(actions.props.children, (child) => {
      if (isValidElement<{ onClick?: () => void }>(child)) {
        child.props.onClick?.()
      }
    })

    expect(onImport).toHaveBeenCalledOnce()
    expect(onBackup).toHaveBeenCalledOnce()
    expect(onCreate).toHaveBeenCalledOnce()
  })
})
