import type { Card, ImportedCardDraft } from '../../types/models'

export type ImportInvalidReason =
  | 'missing-separator'
  | 'empty-front'
  | 'empty-back'

export type ImportDuplicateKind = 'within-import' | 'existing-card'

export interface ParsedImportCard extends ImportedCardDraft {
  lineNumber: number
  rawLine: string
}

export interface InvalidImportLine {
  lineNumber: number
  rawLine: string
  reason: ImportInvalidReason
  message: string
}

export interface DuplicateImportLine {
  lineNumber: number
  rawLine: string
  card: ImportedCardDraft
  kind: ImportDuplicateKind
  matchingCardId?: string
}

export interface CardImportResult {
  cards: ParsedImportCard[]
  invalidLines: InvalidImportLine[]
  duplicates: DuplicateImportLine[]
  sourceLineCount: number
  ignoredEmptyLineCount: number
}

const INVALID_MESSAGES: Record<ImportInvalidReason, string> = {
  'missing-separator': 'Kein Tabulator oder :: als Trennzeichen gefunden.',
  'empty-front': 'Die Vorderseite ist leer.',
  'empty-back': 'Die Rückseite ist leer.',
}

function cardKey(frontText: string, backText: string): string {
  return JSON.stringify([frontText, backText])
}

function invalidLine(
  lineNumber: number,
  rawLine: string,
  reason: ImportInvalidReason,
): InvalidImportLine {
  return {
    lineNumber,
    rawLine,
    reason,
    message: INVALID_MESSAGES[reason],
  }
}

export function parseCardImport(
  text: string,
  existingCards: readonly Card[] = [],
): CardImportResult {
  const lines = text.split(/\r\n?|\n/)
  const cards: ParsedImportCard[] = []
  const invalidLines: InvalidImportLine[] = []
  const duplicates: DuplicateImportLine[] = []
  const seenImportKeys = new Set<string>()
  const existingByKey = new Map(
    existingCards.map((card) => [
      cardKey(card.frontText.trim(), card.backText.trim()),
      card.id,
    ]),
  )
  let ignoredEmptyLineCount = 0

  lines.forEach((rawLine, index) => {
    const lineNumber = index + 1

    if (rawLine.trim().length === 0) {
      ignoredEmptyLineCount += 1
      return
    }

    const tabIndex = rawLine.indexOf('\t')
    const fallbackIndex = tabIndex === -1 ? rawLine.indexOf('::') : -1
    const separatorIndex = tabIndex === -1 ? fallbackIndex : tabIndex
    const separatorLength = tabIndex === -1 ? 2 : 1

    if (separatorIndex === -1) {
      invalidLines.push(invalidLine(lineNumber, rawLine, 'missing-separator'))
      return
    }

    const frontText = rawLine.slice(0, separatorIndex).trim()
    const backText = rawLine.slice(separatorIndex + separatorLength).trim()

    if (frontText.length === 0) {
      invalidLines.push(invalidLine(lineNumber, rawLine, 'empty-front'))
      return
    }

    if (backText.length === 0) {
      invalidLines.push(invalidLine(lineNumber, rawLine, 'empty-back'))
      return
    }

    const draft = { frontText, backText }
    const key = cardKey(frontText, backText)

    if (seenImportKeys.has(key)) {
      duplicates.push({
        lineNumber,
        rawLine,
        card: draft,
        kind: 'within-import',
      })
      return
    }

    seenImportKeys.add(key)
    const matchingCardId = existingByKey.get(key)

    if (matchingCardId !== undefined) {
      duplicates.push({
        lineNumber,
        rawLine,
        card: draft,
        kind: 'existing-card',
        matchingCardId,
      })
      return
    }

    cards.push({ ...draft, lineNumber, rawLine })
  })

  return {
    cards,
    invalidLines,
    duplicates,
    sourceLineCount: lines.length,
    ignoredEmptyLineCount,
  }
}

export function isSupportedImportFile(file: Pick<File, 'name'>): boolean {
  const extension = file.name.toLocaleLowerCase().split('.').pop()
  return extension === 'txt' || extension === 'tsv'
}
