import { useRef, useState, type ChangeEvent } from 'react'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { PageIntro } from '../components/PageIntro'
import { parseBackupJson } from '../features/backup'

interface BackupViewProps {
  deckCount: number
  onExport: () => void
  onImport: (text: string) => Promise<void> | void
}

export function BackupView({ deckCount, onExport, onImport }: BackupViewProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pendingText, setPendingText] = useState('')
  const [pendingKind, setPendingKind] = useState<'deck' | 'full' | null>(null)
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setError('')
    setSuccess('')

    if (!file.name.toLowerCase().endsWith('.json')) {
      setError('Bitte wähle eine JSON-Datei aus.')
      event.target.value = ''
      return
    }

    try {
      const text = await file.text()
      const result = parseBackupJson(text)

      if (!result.ok) {
        setError(result.error)
        event.target.value = ''
        return
      }

      setPendingText(text)
      setPendingKind(result.backup.kind)
      setFileName(file.name)
    } catch {
      setError('Die Datei konnte nicht gelesen werden.')
    }
  }

  async function confirmImport() {
    const importedKind = pendingKind

    try {
      await onImport(pendingText)
      setPendingText('')
      setPendingKind(null)
      setFileName('')
      setSuccess(
        importedKind === 'deck'
          ? 'Deck erfolgreich hinzugefügt.'
          : 'Backup erfolgreich wiederhergestellt.',
      )
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (caughtError) {
      setPendingText('')
      setPendingKind(null)
      setError(caughtError instanceof Error ? caughtError.message : 'Das Backup ist ungültig.')
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <main id="main-content" className="page-shell page-shell--narrow">
      <PageIntro
        eyebrow="Datensicherheit"
        title="Backup & Wiederherstellung"
        description="Speichere alle Decks und Lernstände als JSON-Datei oder stelle sie auf diesem Gerät wieder her."
      />

      <div className="backup-grid">
        <section className="feature-card surface">
          <span className="feature-card__icon" aria-hidden="true">
            ↓
          </span>
          <div>
            <h2>Backup herunterladen</h2>
            <p className="muted-copy">
              Enthält {deckCount === 1 ? 'dein Deck' : `alle ${deckCount} Decks`} inklusive Lernfortschritt.
            </p>
          </div>
          <button className="button button--primary" type="button" onClick={onExport}>
            Vollständiges Backup exportieren
          </button>
        </section>

        <section className="feature-card surface">
          <span className="feature-card__icon feature-card__icon--coral" aria-hidden="true">
            ↑
          </span>
          <div>
            <h2>Backup wiederherstellen</h2>
            <p className="muted-copy">
              Ein Vollbackup ersetzt nach Bestätigung alle Daten. Ein Deck-Export wird zusätzlich angelegt.
            </p>
          </div>
          <input
            ref={fileInputRef}
            id="backup-file"
            className="visually-hidden"
            type="file"
            accept="application/json,.json"
            onChange={handleFile}
          />
          <label className="button button--secondary" htmlFor="backup-file">
            JSON-Datei auswählen
          </label>
        </section>
      </div>

      <aside className="notice-box" aria-label="Datenschutzhinweis">
        <strong>Deine Daten bleiben bei dir.</strong>
        <p>Die Datei wird nur in deinem Browser gelesen und an keinen Server übertragen.</p>
      </aside>

      <p className="live-message" aria-live="polite">
        {error || success}
      </p>

      <ConfirmDialog
        isOpen={Boolean(pendingText && pendingKind)}
        title={pendingKind === 'deck' ? 'Deck hinzufügen?' : 'Alle Daten überschreiben?'}
        description={
          pendingKind === 'deck'
            ? `Das Deck aus „${fileName}“ wird zu deinen vorhandenen Decks hinzugefügt.`
            : `„${fileName}“ ersetzt sämtliche aktuell gespeicherten Decks und Lernstände. Dieser Schritt kann nicht rückgängig gemacht werden.`
        }
        confirmLabel={pendingKind === 'deck' ? 'Deck hinzufügen' : 'Backup wiederherstellen'}
        destructive={pendingKind === 'full'}
        onCancel={() => {
          setPendingText('')
          setPendingKind(null)
          setFileName('')
          if (fileInputRef.current) fileInputRef.current.value = ''
        }}
        onConfirm={() => void confirmImport()}
      />
    </main>
  )
}
