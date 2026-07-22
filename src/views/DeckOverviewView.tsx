import { useState, type FormEvent } from 'react'
import { DeckTile } from '../components/DeckTile'
import { EmptyState } from '../components/EmptyState'
import { PageIntro } from '../components/PageIntro'
import type { Deck } from '../types/models'

interface DeckOverviewViewProps {
  decks: Deck[]
  getProgress: (deck: Deck) => number
  onCreateDeck: (name: string) => void
  onOpenDeck: (deckId: string) => void
  onImport: () => void
  onBackup: () => void
}

interface OverviewActionsProps {
  onImport: () => void
  onBackup: () => void
  onCreate: () => void
}

export function OverviewActions({
  onImport,
  onBackup,
  onCreate,
}: OverviewActionsProps) {
  return (
    <div className="page-intro__actions overview-actions" role="group" aria-label="Deck-Aktionen">
      <button className="button button--secondary" type="button" onClick={onImport}>
        Importieren
      </button>
      <button className="button button--secondary" type="button" onClick={onBackup}>
        Backup
      </button>
      <button className="button button--primary" type="button" onClick={onCreate}>
        <span aria-hidden="true">＋</span> Neues Deck
      </button>
    </div>
  )
}

export function DeckOverviewView({
  decks,
  getProgress,
  onCreateDeck,
  onOpenDeck,
  onImport,
  onBackup,
}: DeckOverviewViewProps) {
  const [isCreating, setIsCreating] = useState(false)
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const cleanName = name.trim()
    if (!cleanName) {
      setError('Bitte gib deinem Deck einen Namen.')
      return
    }
    onCreateDeck(cleanName)
    setName('')
    setError('')
    setIsCreating(false)
  }

  return (
    <main id="main-content" className="page-shell">
      <PageIntro
        eyebrow="Willkommen zurück"
        title="Was möchtest du heute lernen?"
        description="Alle Decks und Lernstände bleiben sicher auf diesem Gerät."
      />

      {decks.length ? (
        <section aria-labelledby="deck-list-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Deine Sammlung</p>
              <h2 id="deck-list-title">Decks</h2>
            </div>
            <span className="count-pill">{decks.length}</span>
          </div>
          <div className="deck-grid">
            {decks.map((deck) => (
              <DeckTile
                key={deck.id}
                deck={deck}
                progress={getProgress(deck)}
                onOpen={() => onOpenDeck(deck.id)}
              />
            ))}
          </div>
        </section>
      ) : (
        <EmptyState
          title="Noch keine Decks"
          description="Erstelle dein erstes Deck oder importiere vorhandene Karten als TSV-Text."
          actionLabel="Erstes Deck erstellen"
          onAction={() => setIsCreating(true)}
        />
      )}

      <OverviewActions
        onImport={onImport}
        onBackup={onBackup}
        onCreate={() => setIsCreating(true)}
      />

      {isCreating ? (
        <form className="inline-create surface" onSubmit={handleSubmit}>
          <div className="form-field inline-create__field">
            <label htmlFor="new-deck-name">Name des neuen Decks</label>
            <input
              id="new-deck-name"
              autoFocus
              value={name}
              onChange={(event) => {
                setName(event.target.value)
                setError('')
              }}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'new-deck-error' : undefined}
              placeholder="z. B. Biologie – Zellaufbau"
            />
            {error ? (
              <p id="new-deck-error" className="form-error" role="alert">
                {error}
              </p>
            ) : null}
          </div>
          <div className="inline-create__actions">
            <button
              className="button button--ghost"
              type="button"
              onClick={() => {
                setIsCreating(false)
                setName('')
                setError('')
              }}
            >
              Abbrechen
            </button>
            <button className="button button--primary" type="submit">
              Deck erstellen
            </button>
          </div>
        </form>
      ) : null}
    </main>
  )
}
