import { useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { copyAiImportPrompt, isSupportedImportFile, parseCardImport } from '../features/import'
import { PageIntro } from '../components/PageIntro'
import type { Deck, ImportedCardDraft } from '../types/models'

const NEW_DECK_VALUE = '__new-deck__'

interface ImportTarget {
  deckId?: string
  deckName?: string
}

interface ImportViewProps {
  decks: Deck[]
  initialDeckId?: string
  onImport: (target: ImportTarget, cards: ImportedCardDraft[]) => void
}

export function ImportView({ decks, initialDeckId, onImport }: ImportViewProps) {
  const fixedDeck = initialDeckId ? decks.find((deck) => deck.id === initialDeckId) : undefined
  const [targetValue, setTargetValue] = useState(initialDeckId ?? NEW_DECK_VALUE)
  const [newDeckName, setNewDeckName] = useState('Importiertes Deck')
  const [sourceText, setSourceText] = useState('')
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const targetDeck = decks.find((deck) => deck.id === targetValue)
  const result = useMemo(
    () => parseCardImport(sourceText, targetDeck?.cards ?? fixedDeck?.cards ?? []),
    [fixedDeck?.cards, sourceText, targetDeck?.cards],
  )

  async function readFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setError('')
    setStatus('')

    if (!isSupportedImportFile(file)) {
      setError('Bitte wähle eine .txt- oder .tsv-Datei aus.')
      event.target.value = ''
      return
    }

    try {
      setSourceText(await file.text())
      setFileName(file.name)
      setStatus(`„${file.name}“ wurde eingelesen.`)
    } catch {
      setError('Die Datei konnte nicht gelesen werden.')
    }
  }

  async function copyPrompt() {
    setError('')
    const copied = await copyAiImportPrompt()
    if (copied) {
      setStatus('KI-Importprompt wurde in die Zwischenablage kopiert.')
    } else {
      setError('Der Prompt konnte nicht kopiert werden. Prüfe die Browserberechtigung.')
    }
  }

  function handleImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    if (!result.cards.length) {
      setError('Es wurden noch keine gültigen, neuen Karten erkannt.')
      return
    }

    if (targetValue === NEW_DECK_VALUE) {
      const cleanName = newDeckName.trim()
      if (!cleanName) {
        setError('Bitte gib dem neuen Deck einen Namen.')
        return
      }
      onImport(
        { deckName: cleanName },
        result.cards.map(({ frontText, backText }) => ({ frontText, backText })),
      )
      return
    }

    onImport(
      { deckId: targetValue },
      result.cards.map(({ frontText, backText }) => ({ frontText, backText })),
    )
  }

  return (
    <main id="main-content" className="page-shell">
      <PageIntro
        eyebrow={fixedDeck ? fixedDeck.name : 'Schneller Einstieg'}
        title="Karten importieren"
        description="Füge TSV-Text ein oder öffne eine UTF-8-Datei. Gültige Karten können auch dann importiert werden, wenn einzelne Zeilen fehlerhaft sind."
        actions={
          <button className="button button--secondary" type="button" onClick={() => void copyPrompt()}>
            KI-Importprompt kopieren
          </button>
        }
      />

      <section className="ai-import-guide surface" aria-labelledby="ai-import-guide-title">
        <div className="ai-import-guide__intro">
          <p className="eyebrow">Optionale Vorbereitung</p>
          <h2 id="ai-import-guide-title">Mit einer KI in 5 Schritten</h2>
          <p>
            KameCard stellt keine Verbindung zu einer KI her. Du entscheidest selbst, ob und
            welche Inhalte du außerhalb der App mit einem KI-Werkzeug teilst.
          </p>
        </div>

        <ol className="ai-import-steps">
          <li className="ai-import-step">
            <strong>Material bei einer KI bereitstellen</strong>
            <span>
              Füge den vollständigen Quellinhalt bei einem KI-Werkzeug deiner Wahl ein
              oder lade dort die vollständige Quelldatei hoch.
            </span>
          </li>
          <li className="ai-import-step">
            <strong>KameCard-Prompt senden</strong>
            <span>
              Kopiere oben den KI-Importprompt, passe darin bei Bedarf Vorder- und
              Rückseite an und sende ihn an die KI.
            </span>
          </li>
          <li className="ai-import-step">
            <strong>TSV-Ergebnis übernehmen</strong>
            <span>
              Kopiere die reine TSV-Antwort oder speichere sie als .tsv- beziehungsweise
              .txt-Datei. Manche Werkzeuge können direkt „kamecard-import.tsv“ erzeugen.
            </span>
          </li>
          <li className="ai-import-step">
            <strong>In KameCard einfügen</strong>
            <span>
              Füge den TSV-Inhalt unten in das Textfeld ein oder wähle die gespeicherte
              .tsv- beziehungsweise .txt-Datei aus.
            </span>
          </li>
          <li className="ai-import-step">
            <strong>Vorschau prüfen und importieren</strong>
            <span>
              Kontrolliere gültige Karten, ungültige Zeilen und Dubletten und bestätige
              erst danach den Import.
            </span>
          </li>
        </ol>

        <p className="ai-import-guide__note">
          Teile keine vertraulichen Inhalte mit einem externen Werkzeug. Der normale
          Text-/Dateiimport und die Vorschau funktionieren vollständig lokal.
        </p>
      </section>

      <form className="import-layout" onSubmit={handleImport}>
        <section className="import-panel surface" aria-labelledby="import-source-title">
          <h2 id="import-source-title">1. Quelle & Ziel</h2>

          {fixedDeck ? (
            <div className="target-note">
              <span className="field-caption">Zieldeck</span>
              <strong>{fixedDeck.name}</strong>
            </div>
          ) : (
            <>
              <div className="form-field">
                <label htmlFor="import-target">Zieldeck</label>
                <select
                  id="import-target"
                  value={targetValue}
                  onChange={(event) => {
                    setTargetValue(event.target.value)
                    setError('')
                  }}
                >
                  <option value={NEW_DECK_VALUE}>Neues Deck erstellen</option>
                  {decks.map((deck) => (
                    <option key={deck.id} value={deck.id}>
                      {deck.name}
                    </option>
                  ))}
                </select>
              </div>
              {targetValue === NEW_DECK_VALUE ? (
                <div className="form-field">
                  <label htmlFor="import-deck-name">Name des neuen Decks</label>
                  <input
                    id="import-deck-name"
                    value={newDeckName}
                    onChange={(event) => {
                      setNewDeckName(event.target.value)
                      setError('')
                    }}
                    aria-invalid={Boolean(error && !newDeckName.trim())}
                  />
                </div>
              ) : null}
            </>
          )}

          <div className="form-field">
            <label htmlFor="import-text">Karten als Text</label>
            <textarea
              id="import-text"
              className="import-textarea"
              value={sourceText}
              onChange={(event) => {
                setSourceText(event.target.value)
                setFileName('')
                setError('')
                setStatus('')
              }}
              placeholder={'あ\ta\nい\ti\nう\tu'}
              spellCheck={false}
            />
            <span className="field-hint">Eine Karte pro Zeile, getrennt durch Tabulator oder ::</span>
          </div>

          <div className="import-tools">
            <input
              ref={fileInputRef}
              id="card-import-file"
              className="visually-hidden"
              type="file"
              accept="text/plain,.txt,.tsv,text/tab-separated-values"
              onChange={readFile}
            />
            <label className="drop-label" htmlFor="card-import-file">
              {fileName ? `Datei: ${fileName}` : '.txt- oder .tsv-Datei auswählen'}
            </label>
          </div>

          <pre className="format-example" aria-label="Beispiel für das Importformat">
            {'あ[TAB]a\nい[TAB]i\n山::Berg'}
          </pre>

          <p className={`live-message ${error ? 'live-message--error' : ''}`} aria-live="polite">
            {error || status}
          </p>
        </section>

        <section className="preview-panel surface" aria-labelledby="import-preview-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Schritt 2</p>
              <h2 id="import-preview-title">Vorschau</h2>
            </div>
          </div>

          <div className="preview-summary">
            <div>
              <strong>{result.cards.length}</strong>
              <span>Neue Karten</span>
            </div>
            <div>
              <strong>{result.invalidLines.length}</strong>
              <span>Ungültig</span>
            </div>
            <div>
              <strong>{result.duplicates.length}</strong>
              <span>Dubletten</span>
            </div>
          </div>

          {result.cards.length ? (
            <div className="preview-scroll">
              <ul className="preview-list" aria-label="Erkannte Karten">
                {result.cards.map((card) => (
                  <li key={`${card.lineNumber}-${card.rawLine}`}>
                    <span>{card.frontText}</span>
                    <span aria-hidden="true">→</span>
                    <span>{card.backText}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="preview-empty">
              <span aria-hidden="true">⌁</span>
              <p>Füge links Text ein, um erkannte Karten hier zu prüfen.</p>
            </div>
          )}

          {result.invalidLines.length ? (
            <details className="issue-details">
              <summary>{result.invalidLines.length} ungültige Zeile(n)</summary>
              <ul className="issue-list">
                {result.invalidLines.map((line) => (
                  <li key={`${line.lineNumber}-${line.rawLine}`}>
                    <strong>Zeile {line.lineNumber}:</strong> {line.message}
                    <code>{line.rawLine}</code>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}

          {result.duplicates.length ? (
            <details className="issue-details">
              <summary>{result.duplicates.length} Dublette(n) übersprungen</summary>
              <ul className="issue-list">
                {result.duplicates.map((duplicate) => (
                  <li key={`${duplicate.lineNumber}-${duplicate.rawLine}`}>
                    <strong>Zeile {duplicate.lineNumber}:</strong>{' '}
                    {duplicate.kind === 'within-import'
                      ? 'bereits in diesem Import'
                      : 'bereits im Zieldeck'}
                    <code>
                      {duplicate.card.frontText} → {duplicate.card.backText}
                    </code>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}

          <button className="button button--primary button--wide import-submit" type="submit" disabled={!result.cards.length}>
            {result.cards.length} {result.cards.length === 1 ? 'Karte' : 'Karten'} importieren
          </button>
        </section>
      </form>
    </main>
  )
}
