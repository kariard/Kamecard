import { SCHEMA_VERSION, type AppData, type Deck } from '../../types/models'
import { validateAppData, validateDeck } from '../../storage/validation'
import { nowIsoString, toDateStamp } from '../../utils/date'

export interface DeckBackup {
  schemaVersion: typeof SCHEMA_VERSION
  kind: 'deck'
  exportedAt: string
  deck: Deck
}

export interface FullBackup {
  schemaVersion: typeof SCHEMA_VERSION
  kind: 'full'
  exportedAt: string
  decks: Deck[]
}

export type ParsedBackup =
  | { kind: 'deck'; deck: Deck }
  | { kind: 'full'; data: AppData }

export type BackupParseResult =
  | { ok: true; backup: ParsedBackup }
  | { ok: false; error: string; details?: string[] }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isValidDate(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value))
}

export function createDeckBackup(
  deck: Deck,
  exportedAt: string = nowIsoString(),
): DeckBackup {
  return {
    schemaVersion: SCHEMA_VERSION,
    kind: 'deck',
    exportedAt,
    deck,
  }
}

export function createFullBackup(
  data: AppData,
  exportedAt: string = nowIsoString(),
): FullBackup {
  return {
    schemaVersion: SCHEMA_VERSION,
    kind: 'full',
    exportedAt,
    decks: data.decks,
  }
}

export function serializeDeckBackup(deck: Deck): string {
  return JSON.stringify(createDeckBackup(deck), null, 2)
}

export function serializeFullBackup(data: AppData): string {
  return JSON.stringify(createFullBackup(data), null, 2)
}

export function validateBackupValue(value: unknown): BackupParseResult {
  if (!isRecord(value)) {
    return { ok: false, error: 'Das Backup muss ein JSON-Objekt sein.' }
  }

  if (value.schemaVersion !== SCHEMA_VERSION) {
    return {
      ok: false,
      error: `Nicht unterstützte schemaVersion. Erwartet wird Version ${SCHEMA_VERSION}.`,
    }
  }

  if (value.kind === 'deck') {
    if (!isValidDate(value.exportedAt)) {
      return { ok: false, error: 'Das Exportdatum des Deck-Backups ist ungültig.' }
    }

    const validation = validateDeck(value.deck)

    return validation.ok
      ? { ok: true, backup: { kind: 'deck', deck: validation.value } }
      : {
          ok: false,
          error: 'Das Deck-Backup enthält ungültige Daten.',
          details: validation.errors,
        }
  }

  if (value.kind === 'full') {
    if (!isValidDate(value.exportedAt)) {
      return { ok: false, error: 'Das Exportdatum des Vollbackups ist ungültig.' }
    }

    const validation = validateAppData({
      schemaVersion: value.schemaVersion,
      decks: value.decks,
    })

    return validation.ok
      ? { ok: true, backup: { kind: 'full', data: validation.value } }
      : {
          ok: false,
          error: 'Das Vollbackup enthält ungültige Daten.',
          details: validation.errors,
        }
  }

  if (Array.isArray(value.decks)) {
    const validation = validateAppData(value)

    return validation.ok
      ? { ok: true, backup: { kind: 'full', data: validation.value } }
      : {
          ok: false,
          error: 'Die App-Daten im Backup sind ungültig.',
          details: validation.errors,
        }
  }

  return {
    ok: false,
    error: 'Der Backup-Typ fehlt oder wird nicht unterstützt.',
  }
}

export function parseBackupJson(text: string): BackupParseResult {
  let parsedValue: unknown

  try {
    parsedValue = JSON.parse(text) as unknown
  } catch {
    return { ok: false, error: 'Die Datei enthält kein gültiges JSON.' }
  }

  return validateBackupValue(parsedValue)
}

function safeFilePart(value: string): string {
  const cleaned = value
    .trim()
    .replace(/[<>:"/\\|?*]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')

  return cleaned.slice(0, 64) || 'deck'
}

export function getDeckBackupFileName(
  deck: Pick<Deck, 'name'>,
  date: Date = new Date(),
): string {
  return `kamecard-${safeFilePart(deck.name)}-${toDateStamp(date)}.json`
}

export function getFullBackupFileName(date: Date = new Date()): string {
  return `kamecard-backup-${toDateStamp(date)}.json`
}

export function downloadJsonFile(contents: string, fileName: string): boolean {
  try {
    const blob = new Blob([contents], { type: 'application/json;charset=utf-8' })
    const objectUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = objectUrl
    link.download = fileName
    link.hidden = true
    document.body.append(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0)
    return true
  } catch {
    return false
  }
}

export function downloadDeckBackup(deck: Deck): boolean {
  return downloadJsonFile(
    serializeDeckBackup(deck),
    getDeckBackupFileName(deck),
  )
}

export function downloadFullBackup(data: AppData): boolean {
  return downloadJsonFile(
    serializeFullBackup(data),
    getFullBackupFileName(),
  )
}
