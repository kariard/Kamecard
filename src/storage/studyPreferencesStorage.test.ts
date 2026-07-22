import { describe, expect, it } from 'vitest'
import type { StorageLike } from './appDataStorage'
import {
  DEFAULT_STUDY_PREFERENCES,
  loadStudyPreferences,
  saveStudyPreferences,
  startStudyAndSavePreferences,
  STUDY_PREFERENCES_STORAGE_KEY,
  STUDY_PREFERENCES_VERSION,
  type StudyPreferences,
} from './studyPreferencesStorage'

class MemoryStorage implements StorageLike {
  readonly values = new Map<string, string>()

  getItem(key: string): string | null {
    return this.values.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value)
  }

  removeItem(key: string): void {
    this.values.delete(key)
  }
}

function storedPreferences(
  values: Partial<Record<keyof StudyPreferences, unknown>>,
): MemoryStorage {
  const storage = new MemoryStorage()
  storage.setItem(
    STUDY_PREFERENCES_STORAGE_KEY,
    JSON.stringify(values),
  )
  return storage
}

describe('loadStudyPreferences', () => {
  it('verwendet beim ersten Aufruf die neuen Standardwerte', () => {
    expect(loadStudyPreferences(new MemoryStorage())).toEqual({
      version: STUDY_PREFERENCES_VERSION,
      direction: 'mixed',
      answerMethod: 'typed-answer',
    })
  })

  it('lädt gültige globale Lernpräferenzen', () => {
    const storage = storedPreferences({
      version: STUDY_PREFERENCES_VERSION,
      direction: 'back-to-front',
      answerMethod: 'self-assessment',
    })

    expect(loadStudyPreferences(storage)).toEqual({
      version: STUDY_PREFERENCES_VERSION,
      direction: 'back-to-front',
      answerMethod: 'self-assessment',
    })
  })

  it('fällt bei beschädigtem JSON auf die Standardwerte zurück', () => {
    const storage = new MemoryStorage()
    storage.setItem(STUDY_PREFERENCES_STORAGE_KEY, '{kaputt')

    expect(loadStudyPreferences(storage)).toEqual(
      DEFAULT_STUDY_PREFERENCES,
    )
  })

  it('fällt bei einer unbekannten Version vollständig zurück', () => {
    const storage = storedPreferences({
      version: 2,
      direction: 'front-to-back',
      answerMethod: 'self-assessment',
    })

    expect(loadStudyPreferences(storage)).toEqual(
      DEFAULT_STUDY_PREFERENCES,
    )
  })

  it('validiert Richtung und Antwortmethode unabhängig voneinander', () => {
    const invalidDirection = storedPreferences({
      version: STUDY_PREFERENCES_VERSION,
      direction: 'seitwärts',
      answerMethod: 'self-assessment',
    })
    const invalidMethod = storedPreferences({
      version: STUDY_PREFERENCES_VERSION,
      direction: 'front-to-back',
      answerMethod: 'multiple-choice',
    })

    expect(loadStudyPreferences(invalidDirection)).toEqual({
      version: STUDY_PREFERENCES_VERSION,
      direction: 'mixed',
      answerMethod: 'self-assessment',
    })
    expect(loadStudyPreferences(invalidMethod)).toEqual({
      version: STUDY_PREFERENCES_VERSION,
      direction: 'front-to-back',
      answerMethod: 'typed-answer',
    })
  })

  it('fängt Fehler beim Zugriff auf den Browserspeicher ab', () => {
    const storage: StorageLike = {
      getItem: () => {
        throw new Error('Lesen blockiert')
      },
      setItem: () => undefined,
      removeItem: () => undefined,
    }

    expect(loadStudyPreferences(storage)).toEqual(
      DEFAULT_STUDY_PREFERENCES,
    )
    expect(loadStudyPreferences(null)).toEqual(
      DEFAULT_STUDY_PREFERENCES,
    )
  })
})

describe('saveStudyPreferences', () => {
  it('speichert ausschließlich das versionierte Präferenzobjekt unter eigenem Key', () => {
    const storage = new MemoryStorage()
    storage.setItem('kamecard.app-data', 'bestehende-app-daten')

    const result = saveStudyPreferences(
      {
        version: STUDY_PREFERENCES_VERSION,
        direction: 'front-to-back',
        answerMethod: 'self-assessment',
      },
      storage,
    )

    expect(result).toEqual({ ok: true })
    expect(
      JSON.parse(
        storage.getItem(STUDY_PREFERENCES_STORAGE_KEY) ?? '',
      ),
    ).toEqual({
      version: 1,
      direction: 'front-to-back',
      answerMethod: 'self-assessment',
    })
    expect(storage.getItem('kamecard.app-data')).toBe(
      'bestehende-app-daten',
    )
  })

  it('weist unbekannte Antwortmethoden zurück und schreibt nichts', () => {
    const storage = new MemoryStorage()
    const invalidPreferences = {
      version: STUDY_PREFERENCES_VERSION,
      direction: 'mixed',
      answerMethod: 'multiple-choice',
    } as unknown as StudyPreferences

    expect(saveStudyPreferences(invalidPreferences, storage).ok).toBe(
      false,
    )
    expect(storage.getItem(STUDY_PREFERENCES_STORAGE_KEY)).toBeNull()
  })

  it('meldet nicht verfügbaren Storage und Schreibfehler defensiv', () => {
    const preferences: StudyPreferences = {
      version: STUDY_PREFERENCES_VERSION,
      direction: 'mixed',
      answerMethod: 'typed-answer',
    }
    const throwingStorage: StorageLike = {
      getItem: () => null,
      setItem: () => {
        throw new Error('Speicher voll')
      },
      removeItem: () => undefined,
    }

    expect(saveStudyPreferences(preferences, null).ok).toBe(false)
    expect(saveStudyPreferences(preferences, throwingStorage)).toEqual({
      ok: false,
      error:
        'Die Lernpräferenzen konnten nicht gespeichert werden: Speicher voll',
    })
  })
})

describe('startStudyAndSavePreferences', () => {
  it('speichert die Auswahl erst nach einem erfolgreichen Rundenstart', () => {
    const storage = new MemoryStorage()
    let sessionStarted = false

    const result = startStudyAndSavePreferences(
      () => {
        sessionStarted = true
        return true
      },
      {
        direction: 'back-to-front',
        answerMethod: 'self-assessment',
      },
      storage,
    )

    expect(result).toBe(true)
    expect(sessionStarted).toBe(true)
    expect(loadStudyPreferences(storage)).toEqual({
      version: STUDY_PREFERENCES_VERSION,
      direction: 'back-to-front',
      answerMethod: 'self-assessment',
    })
  })

  it('speichert ohne erfolgreichen Start keine bloße Auswahl', () => {
    const storage = new MemoryStorage()

    expect(
      startStudyAndSavePreferences(
        () => false,
        {
          direction: 'front-to-back',
          answerMethod: 'self-assessment',
        },
        storage,
      ),
    ).toBe(false)
    expect(storage.getItem(STUDY_PREFERENCES_STORAGE_KEY)).toBeNull()
  })
})
