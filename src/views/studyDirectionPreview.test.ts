import { describe, expect, it } from 'vitest'
import { createStudyDirectionPreviews } from './studyDirectionPreview'

describe('createStudyDirectionPreviews', () => {
  const cards = [
    { frontText: 'Haus', backText: 'maison' },
    { frontText: 'Baum', backText: 'arbre' },
  ]

  it('verwendet für die Vorschau die erste Karte', () => {
    const previews = createStudyDirectionPreviews(cards)

    expect(Object.values(previews).join(' ')).not.toContain('Baum')
    expect(Object.values(previews).join(' ')).not.toContain('arbre')
  })

  it('zeigt Vorderseite zu Rückseite', () => {
    expect(createStudyDirectionPreviews(cards)['front-to-back']).toBe(
      'Haus → maison',
    )
  })

  it('zeigt Rückseite zu Vorderseite', () => {
    expect(createStudyDirectionPreviews(cards)['back-to-front']).toBe(
      'maison → Haus',
    )
  })

  it('zeigt beide Seiten für die gemischte Richtung', () => {
    expect(createStudyDirectionPreviews(cards).mixed).toBe('Haus ⇄ maison')
  })

  it('liefert bei einem leeren Deck neutrale Vorschauen', () => {
    expect(createStudyDirectionPreviews([])).toEqual({
      'front-to-back': 'Vorderseite → Rückseite',
      'back-to-front': 'Rückseite → Vorderseite',
      mixed: 'Vorderseite ⇄ Rückseite',
    })
  })
})
