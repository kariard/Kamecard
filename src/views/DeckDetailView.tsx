import { useState, type FormEvent } from 'react'
import { CardRow } from '../components/CardRow'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { EmptyState } from '../components/EmptyState'
import { PageIntro } from '../components/PageIntro'
import { ProgressBar } from '../components/ProgressBar'
import type { Deck } from '../types/models'

interface DeckDetailViewProps {
  deck: Deck
  progress: number
  onBack: () => void
  onRename: (name: string) => void
  onDeleteDeck: () => void
  onStartStudy: () => void
  onCreateCard: () => void
  onEditCard: (cardId: string) => void
  onDeleteCard: (cardId: string) => void
  onImport: () => void
  onExport: () => void
}

export function DeckDetailView({
  deck,
  progress,
  onRename,
  onDeleteDeck,
  onStartStudy,
  onCreateCard,
  onEditCard,
  onDeleteCard,
  onImport,
  onExport,
}: DeckDetailViewProps) {
  const [isRenaming, setIsRenaming] = useState(false)
  const [name, setName] = useState(deck.name)
  const [renameError, setRenameError] = useState('')
  const [cardToDelete, setCardToDelete] = useState<string | null>(null)
  const [confirmDeckDelete, setConfirmDeckDelete] = useState(false)

  const selectedCard = deck.cards.find((card) => card.id === cardToDelete)

  function submitRename(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const cleanName = name.trim()
    if (!cleanName) {
      setRenameError('Der Deckname darf nicht leer sein.')
      return
    }
    onRename(cleanName)
    setRenameError('')
    setIsRenaming(false)
  }

  return (
    <main id="main-content" className="page-shell">
      <PageIntro
        eyebrow="Deck"
        title={deck.name}
        description={`${deck.cards.length === 1 ? '1 Karte' : `${deck.cards.length} Karten`} · lokal gespeichert`}
        actions={
          <>
            <button
              className="button button--secondary"
              type="button"
              onClick={() => {
                setName(deck.name)
                setIsRenaming(true)
              }}
            >
              Umbenennen
            </button>
            <button
              className="button button--primary"
              type="button"
              onClick={onStartStudy}
              disabled={!deck.cards.length}
            >
              Lernen
            </button>
          </>
        }
      />

      <section className="deck-summary surface" aria-label="Lernfortschritt">
        <ProgressBar value={progress} />
        <div className="deck-summary__stats">
          <div>
            <strong>{deck.cards.filter((card) => card.masteryLevel >= 4).length}</strong>
            <span>Sicher</span>
          </div>
          <div>
            <strong>{deck.cards.filter((card) => card.masteryLevel < 2).length}</strong>
            <span>Noch üben</span>
          </div>
        </div>
      </section>

      {isRenaming ? (
        <form className="inline-create surface" onSubmit={submitRename}>
          <div className="form-field inline-create__field">
            <label htmlFor="rename-deck">Deck umbenennen</label>
            <input
              id="rename-deck"
              autoFocus
              value={name}
              onChange={(event) => {
                setName(event.target.value)
                setRenameError('')
              }}
              aria-invalid={Boolean(renameError)}
              aria-describedby={renameError ? 'rename-error' : undefined}
            />
            {renameError ? (
              <p id="rename-error" className="form-error" role="alert">
                {renameError}
              </p>
            ) : null}
          </div>
          <div className="inline-create__actions">
            <button className="button button--ghost" type="button" onClick={() => setIsRenaming(false)}>
              Abbrechen
            </button>
            <button className="button button--primary" type="submit">
              Speichern
            </button>
          </div>
        </form>
      ) : null}

      <section aria-labelledby="card-list-title">
        <div className="section-heading section-heading--actions">
          <div>
            <p className="eyebrow">Inhalt</p>
            <h2 id="card-list-title">Karten</h2>
          </div>
          <div className="action-row">
            <button className="button button--secondary" type="button" onClick={onImport}>
              Karten importieren
            </button>
            <button className="button button--primary" type="button" onClick={onCreateCard}>
              <span aria-hidden="true">＋</span> Neue Karte
            </button>
          </div>
        </div>

        {deck.cards.length ? (
          <div className="card-list">
            {deck.cards.map((card) => (
              <CardRow
                key={card.id}
                card={card}
                onEdit={() => onEditCard(card.id)}
                onDelete={() => setCardToDelete(card.id)}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title="Dieses Deck ist noch leer"
            description="Lege eine Karte von Hand an oder importiere mehrere Karten auf einmal."
            actionLabel="Erste Karte anlegen"
            onAction={onCreateCard}
          />
        )}
      </section>

      <section className="utility-panel surface" aria-labelledby="deck-tools-title">
        <div>
          <h2 id="deck-tools-title">Deck verwalten</h2>
          <p className="muted-copy">Exportiere dieses Deck oder entferne es dauerhaft von diesem Gerät.</p>
        </div>
        <div className="action-row">
          <button className="button button--secondary" type="button" onClick={onExport}>
            Deck exportieren
          </button>
          <button className="button button--danger-quiet" type="button" onClick={() => setConfirmDeckDelete(true)}>
            Deck löschen
          </button>
        </div>
      </section>

      <ConfirmDialog
        isOpen={Boolean(selectedCard)}
        title="Karte löschen?"
        description={`„${selectedCard?.frontText ?? ''}“ wird dauerhaft aus diesem Deck entfernt.`}
        confirmLabel="Karte löschen"
        destructive
        onCancel={() => setCardToDelete(null)}
        onConfirm={() => {
          if (cardToDelete) onDeleteCard(cardToDelete)
          setCardToDelete(null)
        }}
      />
      <ConfirmDialog
        isOpen={confirmDeckDelete}
        title="Ganzes Deck löschen?"
        description={`Das Deck „${deck.name}“ und alle ${deck.cards.length} Karten werden dauerhaft gelöscht.`}
        confirmLabel="Deck löschen"
        destructive
        onCancel={() => setConfirmDeckDelete(false)}
        onConfirm={() => {
          setConfirmDeckDelete(false)
          onDeleteDeck()
        }}
      />
    </main>
  )
}
