export const AI_IMPORT_PROMPT = `Erstelle aus dem bereitgestellten Inhalt Karteikarten im TSV-Format.

Regeln:
- Eine Karte pro Zeile.
- Vorderseite und Rückseite werden durch genau einen Tabulator getrennt.
- Keine Überschrift.
- Keine Nummerierung.
- Keine Aufzählungszeichen.
- Keine Markdown-Codeblöcke.
- Keine zusätzlichen Erklärungen.
- Verwende UTF-8.
- Entferne Dubletten.
- Gib ausschließlich den importierbaren TSV-Inhalt aus.

Vorderseite soll enthalten: [HIER EINTRAGEN]
Rückseite soll enthalten: [HIER EINTRAGEN]`

export interface ClipboardWriter {
  writeText(text: string): Promise<void>
}

function getBrowserClipboard(): ClipboardWriter | undefined {
  try {
    return globalThis.navigator?.clipboard
  } catch {
    return undefined
  }
}

export async function copyAiImportPrompt(
  clipboard: ClipboardWriter | undefined = getBrowserClipboard(),
): Promise<boolean> {
  if (clipboard === undefined) {
    return false
  }

  try {
    await clipboard.writeText(AI_IMPORT_PROMPT)
    return true
  } catch {
    return false
  }
}
