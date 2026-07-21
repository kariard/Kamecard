import { describe, expect, it } from 'vitest'
import { SCHEMA_VERSION } from '../../types/models'
import { createDeck } from '../../utils/records'
import {
  parseBackupJson,
  serializeDeckBackup,
  validateBackupValue,
} from './backup'

describe('backup validation', () => {
  it('validiert ein exportiertes Deck-Backup', () => {
    const deck = createDeck('Japanisch')
    const result = parseBackupJson(serializeDeckBackup(deck))

    expect(result).toMatchObject({
      ok: true,
      backup: { kind: 'deck', deck: { id: deck.id, name: deck.name } },
    })
  })

  it('weist beschädigte Kartenwerte defensiv zurück', () => {
    const deck = createDeck('Defekt')
    const result = validateBackupValue({
      schemaVersion: SCHEMA_VERSION,
      kind: 'full',
      exportedAt: '2026-01-01T00:00:00.000Z',
      decks: [
        {
          ...deck,
          cards: [
            {
              id: 'karte-1',
              frontText: 'A',
              backText: 'B',
              createdAt: deck.createdAt,
              updatedAt: deck.updatedAt,
              correctCount: 0,
              incorrectCount: 0,
              currentStreak: 0,
              masteryLevel: 8,
            },
          ],
        },
      ],
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.details?.join(' ')).toContain('masteryLevel')
    }
  })

  it('weist ungültiges JSON zurück', () => {
    expect(parseBackupJson('{kaputt').ok).toBe(false)
  })
})
