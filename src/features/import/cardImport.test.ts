import { describe, expect, it } from 'vitest'
import { createCard } from '../../utils/records'
import { parseCardImport } from './cardImport'

describe('parseCardImport', () => {
  it('parst TSV und verwendet :: nur ohne Tabulator als Fallback', () => {
    const result = parseCardImport('あ\ta\r\nい::i\n\nう\tu')

    expect(result.cards).toMatchObject([
      { frontText: 'あ', backText: 'a', lineNumber: 1 },
      { frontText: 'い', backText: 'i', lineNumber: 2 },
      { frontText: 'う', backText: 'u', lineNumber: 4 },
    ])
    expect(result.ignoredEmptyLineCount).toBe(1)
    expect(result.invalidLines).toEqual([])
  })

  it('meldet ungültige Zeilen, ohne gültige Zeilen zu blockieren', () => {
    const result = parseCardImport('ohne Trenner\n\tnur hinten\nnur vorne\t\ngut\tok')

    expect(result.cards).toHaveLength(1)
    expect(result.cards[0]).toMatchObject({ frontText: 'gut', backText: 'ok' })
    expect(result.invalidLines.map((line) => line.reason)).toEqual([
      'missing-separator',
      'empty-front',
      'empty-back',
    ])
  })

  it('erkennt Dubletten im Import und bereits vorhandene Karten', () => {
    const existingCard = createCard('あ', 'a')
    const result = parseCardImport('あ\ta\nい\ti\nい\ti', [existingCard])

    expect(result.cards).toMatchObject([{ frontText: 'い', backText: 'i' }])
    expect(result.duplicates).toMatchObject([
      { lineNumber: 1, kind: 'existing-card', matchingCardId: existingCard.id },
      { lineNumber: 3, kind: 'within-import' },
    ])
  })
})
