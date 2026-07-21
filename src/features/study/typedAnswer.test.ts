import { describe, expect, it, vi } from 'vitest'
import {
  createTypedAnswerAttempt,
  isTypedAnswerCorrect,
  normalizeTypedAnswer,
  submitTypedAnswer,
} from './typedAnswer'

describe('normalizeTypedAnswer', () => {
  it('normalisiert Unicode mit NFKC', () => {
    expect(normalizeTypedAnswer('①')).toBe('1')
    expect(normalizeTypedAnswer('Ｆｏｏ')).toBe('foo')
  })

  it('entfernt Whitespace an Anfang und Ende', () => {
    expect(normalizeTypedAnswer('\n\t  Antwort \u00a0')).toBe('antwort')
  })

  it('reduziert zusammenhängenden Whitespace auf ein Leerzeichen', () => {
    expect(normalizeTypedAnswer('eins\t \n zwei\u00a0\u00a0drei')).toBe(
      'eins zwei drei',
    )
  })

  it('ignoriert Groß- und Kleinschreibung in Unicode-Latin-Segmenten', () => {
    expect(normalizeTypedAnswer('ÄPFEL und ÉCOLE')).toBe('äpfel und école')
    expect(isTypedAnswerCorrect('Straße', 'STRAẞE')).toBe(true)
  })

  it('verändert die Groß- und Kleinschreibung nichtlateinischer Zeichen nicht', () => {
    expect(isTypedAnswerCorrect('Αθήνα', 'αθήνα')).toBe(false)
  })
})

describe('isTypedAnswerCorrect', () => {
  it('erkennt eine normalisiert identische Antwort als richtig', () => {
    expect(isTypedAnswerCorrect('  ＢＥＲＬＩＮ  ', 'Berlin')).toBe(true)
  })

  it('erkennt eine inhaltlich abweichende Antwort als falsch', () => {
    expect(isTypedAnswerCorrect('München', 'Berlin')).toBe(false)
  })
})

describe('submitTypedAnswer', () => {
  it('ruft rate(true) auf und gibt dessen Ergebnis für eine richtige Antwort zurück', () => {
    const rate = vi.fn((knewAnswer: boolean) => ({ knewAnswer }))
    const result = submitTypedAnswer(
      createTypedAnswerAttempt(),
      '  Antwort ',
      'ANTWORT',
      rate,
    )

    expect(rate).toHaveBeenCalledOnce()
    expect(rate).toHaveBeenCalledWith(true)
    expect(result.submission).toEqual({
      input: '  Antwort ',
      expected: 'ANTWORT',
      knewAnswer: true,
      rateResult: { knewAnswer: true },
    })
  })

  it('ruft rate(false) auf und gibt dessen Ergebnis für eine falsche Antwort zurück', () => {
    const rate = vi.fn((knewAnswer: boolean) => (knewAnswer ? 'ja' : 'nein'))
    const result = submitTypedAnswer(
      createTypedAnswerAttempt(),
      'falsch',
      'richtig',
      rate,
    )

    expect(rate).toHaveBeenCalledOnce()
    expect(rate).toHaveBeenCalledWith(false)
    expect(result.submission.knewAnswer).toBe(false)
    expect(result.submission.rateResult).toBe('nein')
  })

  it('bewertet denselben bereits abgesendeten Versuch nicht doppelt', () => {
    const rate = vi.fn((knewAnswer: boolean) => knewAnswer)
    const submittedAttempt = submitTypedAnswer(
      createTypedAnswerAttempt(),
      'richtig',
      'richtig',
      rate,
    )
    const duplicateResult = submitTypedAnswer(
      submittedAttempt,
      'jetzt falsch',
      'richtig',
      rate,
    )

    expect(rate).toHaveBeenCalledOnce()
    expect(duplicateResult).toBe(submittedAttempt)
  })
})
