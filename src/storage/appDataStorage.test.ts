import { describe, expect, it } from 'vitest'
import { SCHEMA_VERSION } from '../types/models'
import {
  APP_DATA_STORAGE_KEY,
  loadAppData,
  type StorageLike,
} from './appDataStorage'

class MemoryStorage implements StorageLike {
  private readonly values = new Map<string, string>()

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

describe('loadAppData', () => {
  it('legt das Beispieldeck nur bei einem fehlenden Storage-Key an', () => {
    const storage = new MemoryStorage()
    const firstLoad = loadAppData(storage)

    expect(firstLoad.status).toBe('initialized')
    expect(firstLoad.data.decks[0]?.name).toBe(
      'Japanisch – Vokale & K-Reihe',
    )
    expect(storage.getItem(APP_DATA_STORAGE_KEY)).not.toBeNull()

    storage.setItem(
      APP_DATA_STORAGE_KEY,
      JSON.stringify({ schemaVersion: SCHEMA_VERSION, decks: [] }),
    )
    const existingEmptyData = loadAppData(storage)

    expect(existingEmptyData.status).toBe('loaded')
    expect(existingEmptyData.data.decks).toEqual([])
  })

  it('ersetzt vorhandenes beschädigtes JSON nicht durch das Beispieldeck', () => {
    const storage = new MemoryStorage()
    storage.setItem(APP_DATA_STORAGE_KEY, '{kaputt')

    const result = loadAppData(storage)

    expect(result.status).toBe('invalid')
    expect(result.data.decks).toEqual([])
    expect(storage.getItem(APP_DATA_STORAGE_KEY)).toBe('{kaputt')
  })
})
