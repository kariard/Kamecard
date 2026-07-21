export const AI_IMPORT_PROMPT = `Erstelle aus dem gesamten bereitgestellten Inhalt oder der vollständig angehängten Datei direkt importierbare Karteikarten im TSV-Format.

Inhaltliche Regeln:
- Analysiere das gesamte Material vollständig und überspringe keinen lernrelevanten Abschnitt.
- Formuliere kompakte, aber vollständige und eigenständig verständliche Karten.
- Behandle pro Karte möglichst genau einen klaren Lerninhalt.
- Verwende ausschließlich Informationen aus dem bereitgestellten Material.
- Erfinde nichts, ergänze keine Vermutungen und rate nicht bei unklaren Angaben.
- Entferne inhaltlich identische Dubletten.

Verbindliche Ausgaberegeln:
- Gib genau eine Karte pro Zeile aus.
- Trenne Vorderseite und Rückseite durch genau einen echten Tabulator (Unicode U+0009), nicht durch Leerzeichen oder ausgeschriebene Platzhalter.
- Verwende innerhalb der Vorderseite und innerhalb der Rückseite keine weiteren Tabulatoren und keine Zeilenumbrüche. Ersetze solche Trennungen dort durch ein einzelnes Leerzeichen.
- Gib ausschließlich den direkt importierbaren TSV-Inhalt aus.
- Keine Überschrift, keine Nummerierung, keine Aufzählungszeichen und keine Markdown-Codeblöcke.
- Keine Einleitung, keine Erklärungen, keine Zusammenfassung und kein Text vor oder nach den TSV-Zeilen.
- Verwende UTF-8 und erhalte alle Unicode-Zeichen korrekt.
- Wenn deine Oberfläche Dateien erzeugen kann, darfst du den TSV-Inhalt alternativ als UTF-8-Datei mit dem Namen kamecard-import.tsv bereitstellen.

Formatbeispiel (zwischen den beiden Platzhaltern steht genau ein echter Tabulator):
<Vorderseite>	<Rückseite>

Vorderseite soll enthalten:
[HIER EINTRAGEN – zum Beispiel Begriff, Frage oder Originalsprache]

Rückseite soll enthalten:
[HIER EINTRAGEN – zum Beispiel Definition, Antwort oder Übersetzung]

Der zu verarbeitende Inhalt folgt nach diesem Prompt oder ist vollständig als Datei angehängt.`

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
