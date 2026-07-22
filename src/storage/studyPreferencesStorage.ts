import type { StudyAnswerMethod } from '../features/study/studySession'
import type { StudyDirection } from '../types/models'
import type { StorageLike, StorageWriteResult } from './appDataStorage'

export const STUDY_PREFERENCES_STORAGE_KEY =
  'kamecard-study-preferences'
export const STUDY_PREFERENCES_VERSION = 1 as const

export interface StudyPreferences {
  version: typeof STUDY_PREFERENCES_VERSION
  direction: StudyDirection
  answerMethod: StudyAnswerMethod
}

export type StudyPreferenceSelection = Pick<
  StudyPreferences,
  'direction' | 'answerMethod'
>

export const DEFAULT_STUDY_PREFERENCES: Readonly<StudyPreferences> = {
  version: STUDY_PREFERENCES_VERSION,
  direction: 'mixed',
  answerMethod: 'typed-answer',
}

function createDefaultStudyPreferences(): StudyPreferences {
  return { ...DEFAULT_STUDY_PREFERENCES }
}

function getBrowserStorage(): StorageLike | undefined {
  try {
    return globalThis.localStorage
  } catch {
    return undefined
  }
}

function resolveStorage(
  storage: StorageLike | null | undefined,
): StorageLike | undefined {
  return storage === null ? undefined : storage ?? getBrowserStorage()
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isStudyDirection(value: unknown): value is StudyDirection {
  return (
    value === 'front-to-back' ||
    value === 'back-to-front' ||
    value === 'mixed'
  )
}

function isStudyAnswerMethod(
  value: unknown,
): value is StudyAnswerMethod {
  return value === 'self-assessment' || value === 'typed-answer'
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unbekannter Speicherfehler'
}

export function loadStudyPreferences(
  storage?: StorageLike | null,
): StudyPreferences {
  const resolvedStorage = resolveStorage(storage)

  if (resolvedStorage === undefined) {
    return createDefaultStudyPreferences()
  }

  let rawValue: string | null

  try {
    rawValue = resolvedStorage.getItem(STUDY_PREFERENCES_STORAGE_KEY)
  } catch {
    return createDefaultStudyPreferences()
  }

  if (rawValue === null) {
    return createDefaultStudyPreferences()
  }

  let parsedValue: unknown

  try {
    parsedValue = JSON.parse(rawValue) as unknown
  } catch {
    return createDefaultStudyPreferences()
  }

  if (
    !isRecord(parsedValue) ||
    parsedValue.version !== STUDY_PREFERENCES_VERSION
  ) {
    return createDefaultStudyPreferences()
  }

  return {
    version: STUDY_PREFERENCES_VERSION,
    direction: isStudyDirection(parsedValue.direction)
      ? parsedValue.direction
      : DEFAULT_STUDY_PREFERENCES.direction,
    answerMethod: isStudyAnswerMethod(parsedValue.answerMethod)
      ? parsedValue.answerMethod
      : DEFAULT_STUDY_PREFERENCES.answerMethod,
  }
}

export function saveStudyPreferences(
  preferences: StudyPreferences,
  storage?: StorageLike | null,
): StorageWriteResult {
  const resolvedStorage = resolveStorage(storage)

  if (resolvedStorage === undefined) {
    return {
      ok: false,
      error: 'Der Browserspeicher ist nicht verfügbar.',
    }
  }

  if (
    preferences.version !== STUDY_PREFERENCES_VERSION ||
    !isStudyDirection(preferences.direction) ||
    !isStudyAnswerMethod(preferences.answerMethod)
  ) {
    return {
      ok: false,
      error: 'Die Lernpräferenzen sind ungültig.',
    }
  }

  const value: StudyPreferences = {
    version: STUDY_PREFERENCES_VERSION,
    direction: preferences.direction,
    answerMethod: preferences.answerMethod,
  }

  try {
    resolvedStorage.setItem(
      STUDY_PREFERENCES_STORAGE_KEY,
      JSON.stringify(value),
    )
    return { ok: true }
  } catch (error) {
    return {
      ok: false,
      error: `Die Lernpräferenzen konnten nicht gespeichert werden: ${errorMessage(error)}`,
    }
  }
}

export function startStudyAndSavePreferences(
  startStudy: () => boolean,
  selection: StudyPreferenceSelection,
  storage?: StorageLike | null,
): boolean {
  const started = startStudy()

  if (!started) {
    return false
  }

  saveStudyPreferences(
    {
      version: STUDY_PREFERENCES_VERSION,
      ...selection,
    },
    storage,
  )
  return true
}
