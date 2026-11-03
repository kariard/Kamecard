import { describe, expect, it } from 'vitest'
import { createDefaultAppData } from '../data/defaultDeck'
import { recoverAppData, validateAppData } from './validation'
import { parseBackupJson } from '../features/backup'

describe('recoverAppData', () => {
  it('keeps healthy Unicode cards and deck metadata while skipping broken cards and duplicate IDs', () => {
    const data = createDefaultAppData()
    const deck = data.decks[0]
    const first = { ...deck.cards[0], frontText: '🌳 木', backText: 'き' }
    const second = { ...deck.cards[1] }
    const damaged = {
      ...data,
      decks: [{ ...deck, cards: [null, first, { ...first, backText: 'duplicate' },
        { ...second, correctCount: -1 }, second] }],
    }
    expect(validateAppData(damaged).ok).toBe(false)
    // Imported backups remain strict; salvage is only for local recovery.
    expect(parseBackupJson(JSON.stringify(damaged)).ok).toBe(false)
    const recovered = recoverAppData(damaged)
    expect(recovered?.data.decks).toEqual([{ ...deck, cards: [first, second] }])
    expect(recovered?.errors).toHaveLength(3)
    expect(validateAppData(recovered?.data).ok).toBe(true)
  })

  it('retains a valid empty deck when all its cards are damaged', () => {
    const data = createDefaultAppData()
    const deck = data.decks[0]
    expect(recoverAppData({ ...data, decks: [{ ...deck, cards: [null] }] })?.data.decks)
      .toEqual([{ ...deck, cards: [] }])
  })

  it('skips invalid deck metadata and duplicate decks without losing other decks', () => {
    const data = createDefaultAppData()
    const deck = data.decks[0]
    const recovered = recoverAppData({ ...data, decks: [null, { ...deck, name: '' }, deck, deck] })
    expect(recovered?.data.decks).toEqual([deck])
    expect(recovered?.errors).toHaveLength(3)
  })

  it('does not interpret an unknown schema as the current format', () => {
    expect(recoverAppData({ ...createDefaultAppData(), schemaVersion: 999 })).toBeUndefined()
  })
})
