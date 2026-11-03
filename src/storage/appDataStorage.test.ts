import { describe, expect, it, vi } from 'vitest'
import { createDefaultAppData } from '../data/defaultDeck'
import { SCHEMA_VERSION } from '../types/models'
import {
  APP_DATA_STORAGE_KEY,
  APP_DATA_RECOVERY_STORAGE_KEY,
  loadAppData,
  saveAppData,
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

describe('recovery before saving', () => {
  it('rescues healthy cards and preserves the exact original before overwriting', () => {
    const storage = new MemoryStorage()
    const damaged = createDefaultAppData()
    const healthyCards = damaged.decks[0].cards.slice(1)
    damaged.decks[0].cards[0].frontText = ''
    const original = JSON.stringify(damaged, null, 2)
    storage.setItem(APP_DATA_STORAGE_KEY, original)

    const loaded = loadAppData(storage)
    expect(loaded.status).toBe('recovered')
    expect(loaded.data.decks[0].cards).toEqual(healthyCards)
    expect(storage.getItem(APP_DATA_STORAGE_KEY)).toBe(original)
    expect(saveAppData(loaded.data, storage)).toEqual({ ok: true })
    expect(storage.getItem(APP_DATA_RECOVERY_STORAGE_KEY)).toBe(original)
    expect(loadAppData(storage).data).toEqual(loaded.data)
  })

  it('also preserves malformed JSON and unsupported schema versions', () => {
    for (const original of ['{kaputt', '{"schemaVersion":999,"decks":[]}']) {
      const storage = new MemoryStorage()
      storage.setItem(APP_DATA_STORAGE_KEY, original)
      expect(saveAppData(createDefaultAppData(), storage).ok).toBe(true)
      expect(storage.getItem(APP_DATA_RECOVERY_STORAGE_KEY)).toBe(original)
    }
  })

  it('never overwrites an earlier recovery copy', () => {
    const storage = new MemoryStorage()
    storage.setItem(APP_DATA_RECOVERY_STORAGE_KEY, 'ältere Originaldaten')
    storage.setItem(APP_DATA_STORAGE_KEY, '{neu beschädigt')
    expect(saveAppData(createDefaultAppData(), storage).ok).toBe(true)
    expect(storage.getItem(APP_DATA_RECOVERY_STORAGE_KEY)).toBe('ältere Originaldaten')
    expect(storage.getItem(`${APP_DATA_RECOVERY_STORAGE_KEY}.1`)).toBe('{neu beschädigt')
  })

  it('keeps the main key untouched when the backup cannot be written', () => {
    const storage = new MemoryStorage()
    storage.setItem(APP_DATA_STORAGE_KEY, '{kaputt')
    const setItem = vi.spyOn(storage, 'setItem').mockImplementation(() => {
      throw new Error('Speicher voll')
    })
    const result = saveAppData(createDefaultAppData(), storage)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('nicht überschrieben')
    expect(setItem).toHaveBeenCalledExactlyOnceWith(APP_DATA_RECOVERY_STORAGE_KEY, '{kaputt')
    expect(storage.getItem(APP_DATA_STORAGE_KEY)).toBe('{kaputt')
  })

  it('reuses the backup when retrying a failed main write', () => {
    const storage = new MemoryStorage()
    storage.setItem(APP_DATA_STORAGE_KEY, '{kaputt')
    const originalSetItem = storage.setItem.bind(storage)
    const setItem = vi.spyOn(storage, 'setItem').mockImplementation((key, value) => {
      if (key === APP_DATA_STORAGE_KEY) throw new Error('Speicher voll')
      originalSetItem(key, value)
    })
    expect(saveAppData(createDefaultAppData(), storage).ok).toBe(false)
    expect(storage.getItem(APP_DATA_RECOVERY_STORAGE_KEY)).toBe('{kaputt')
    setItem.mockImplementation(originalSetItem)
    expect(saveAppData(createDefaultAppData(), storage).ok).toBe(true)
    expect(storage.getItem(`${APP_DATA_RECOVERY_STORAGE_KEY}.1`)).toBeNull()
  })

  it('aborts without writing when the original cannot be read', () => {
    const storage = new MemoryStorage()
    const setItem = vi.spyOn(storage, 'setItem')
    vi.spyOn(storage, 'getItem').mockImplementation(() => { throw new Error('Lesen blockiert') })
    expect(saveAppData(createDefaultAppData(), storage).ok).toBe(false)
    expect(setItem).not.toHaveBeenCalled()
  })

  it('does not create recovery copies for healthy data', () => {
    const storage = new MemoryStorage()
    const data = createDefaultAppData()
    storage.setItem(APP_DATA_STORAGE_KEY, JSON.stringify(data))
    expect(saveAppData(data, storage).ok).toBe(true)
    expect(storage.getItem(APP_DATA_RECOVERY_STORAGE_KEY)).toBeNull()
  })
})
