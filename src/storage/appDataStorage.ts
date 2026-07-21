import { createDefaultAppData, createEmptyAppData } from '../data/defaultDeck'
import type { AppData } from '../types/models'
import { recoverAppData, validateAppData } from './validation'

export const APP_DATA_STORAGE_KEY = 'kamecard.app-data'

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export type StorageLoadStatus =
  | 'initialized'
  | 'loaded'
  | 'recovered'
  | 'invalid'
  | 'unavailable'

export interface StorageLoadResult {
  data: AppData
  status: StorageLoadStatus
  warning?: string
}

export type StorageWriteResult =
  | { ok: true }
  | { ok: false; error: string }

function getBrowserStorage(): StorageLike | undefined {
  try {
    return globalThis.localStorage
  } catch {
    return undefined
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unbekannter Speicherfehler'
}

export class LocalStorageAppDataStore {
  readonly key: string
  private readonly providedStorage: StorageLike | null | undefined

  constructor(
    storage?: StorageLike | null,
    key: string = APP_DATA_STORAGE_KEY,
  ) {
    this.providedStorage = storage
    this.key = key
  }

  private getStorage(): StorageLike | undefined {
    if (this.providedStorage === null) {
      return undefined
    }

    return this.providedStorage ?? getBrowserStorage()
  }

  load(): StorageLoadResult {
    const storage = this.getStorage()

    if (storage === undefined) {
      return {
        data: createDefaultAppData(),
        status: 'unavailable',
        warning: 'Der Browserspeicher ist nicht verfügbar. Änderungen sind nur vorübergehend.',
      }
    }

    let rawValue: string | null

    try {
      rawValue = storage.getItem(this.key)
    } catch (error) {
      return {
        data: createEmptyAppData(),
        status: 'unavailable',
        warning: `Die gespeicherten Daten konnten nicht gelesen werden: ${errorMessage(error)}`,
      }
    }

    if (rawValue === null) {
      const data = createDefaultAppData()

      try {
        storage.setItem(this.key, JSON.stringify(data))
        return { data, status: 'initialized' }
      } catch (error) {
        return {
          data,
          status: 'initialized',
          warning: `Das Beispieldeck konnte nicht dauerhaft gespeichert werden: ${errorMessage(error)}`,
        }
      }
    }

    let parsedValue: unknown

    try {
      parsedValue = JSON.parse(rawValue) as unknown
    } catch {
      return {
        data: createEmptyAppData(),
        status: 'invalid',
        warning: 'Die lokalen Daten enthalten ungültiges JSON und wurden nicht geladen.',
      }
    }

    const validation = validateAppData(parsedValue)

    if (validation.ok) {
      return { data: validation.value, status: 'loaded' }
    }

    const recovery = recoverAppData(parsedValue)

    if (recovery !== undefined) {
      return {
        data: recovery.data,
        status: 'recovered',
        warning:
          recovery.errors.length === 0
            ? 'Die lokalen Daten wurden vorsichtig wiederhergestellt.'
            : `${recovery.errors.length} beschädigte Einträge wurden beim Laden ausgelassen.`,
      }
    }

    return {
      data: createEmptyAppData(),
      status: 'invalid',
      warning: `Die lokalen Daten sind ungültig: ${validation.errors[0] ?? 'Unbekannter Validierungsfehler'}`,
    }
  }

  save(data: AppData): StorageWriteResult {
    const storage = this.getStorage()

    if (storage === undefined) {
      return {
        ok: false,
        error: 'Der Browserspeicher ist nicht verfügbar.',
      }
    }

    const validation = validateAppData(data)

    if (!validation.ok) {
      return {
        ok: false,
        error: `Die Daten sind ungültig: ${validation.errors[0] ?? 'Unbekannter Validierungsfehler'}`,
      }
    }

    try {
      storage.setItem(this.key, JSON.stringify(validation.value))
      return { ok: true }
    } catch (error) {
      return {
        ok: false,
        error: `Die Daten konnten nicht gespeichert werden: ${errorMessage(error)}`,
      }
    }
  }

  clear(): StorageWriteResult {
    const storage = this.getStorage()

    if (storage === undefined) {
      return {
        ok: false,
        error: 'Der Browserspeicher ist nicht verfügbar.',
      }
    }

    try {
      storage.removeItem(this.key)
      return { ok: true }
    } catch (error) {
      return {
        ok: false,
        error: `Die Daten konnten nicht entfernt werden: ${errorMessage(error)}`,
      }
    }
  }
}

export const appDataStorage = new LocalStorageAppDataStore()

export function loadAppData(
  storage?: StorageLike | null,
): StorageLoadResult {
  return new LocalStorageAppDataStore(storage).load()
}

export function saveAppData(
  data: AppData,
  storage?: StorageLike | null,
): StorageWriteResult {
  return new LocalStorageAppDataStore(storage).save(data)
}

export function clearAppData(
  storage?: StorageLike | null,
): StorageWriteResult {
  return new LocalStorageAppDataStore(storage).clear()
}
