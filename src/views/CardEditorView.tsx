import { useState, type FormEvent } from 'react'
import { PageIntro } from '../components/PageIntro'
import type { Card, ImportedCardDraft } from '../types/models'

interface CardEditorViewProps {
  card?: Card
  deckName: string
  onSave: (draft: ImportedCardDraft) => void
  onCancel: () => void
}

export function CardEditorView({ card, deckName, onSave, onCancel }: CardEditorViewProps) {
  const [frontText, setFrontText] = useState(card?.frontText ?? '')
  const [backText, setBackText] = useState(card?.backText ?? '')
  const [error, setError] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const cleanFront = frontText.trim()
    const cleanBack = backText.trim()

    if (!cleanFront || !cleanBack) {
      setError('Bitte fülle Vorder- und Rückseite aus.')
      return
    }

    onSave({ frontText: cleanFront, backText: cleanBack })
  }

  return (
    <main id="main-content" className="page-shell page-shell--narrow">
      <PageIntro
        eyebrow={deckName}
        title={card ? 'Karte bearbeiten' : 'Neue Karte'}
        description="Texte und Unicode-Zeichen werden genau so gespeichert, wie du sie eingibst."
      />

      <form className="editor-form surface" onSubmit={handleSubmit} noValidate>
        <div className="form-field">
          <label htmlFor="card-front">Vorderseite</label>
          <textarea
            id="card-front"
            autoFocus
            rows={6}
            value={frontText}
            onChange={(event) => {
              setFrontText(event.target.value)
              setError('')
            }}
            placeholder="z. B. あ"
            aria-invalid={Boolean(error && !frontText.trim())}
          />
          <span className="field-hint">Die Frage oder der Begriff, den du sehen möchtest.</span>
        </div>

        <div className="form-field">
          <label htmlFor="card-back">Rückseite</label>
          <textarea
            id="card-back"
            rows={6}
            value={backText}
            onChange={(event) => {
              setBackText(event.target.value)
              setError('')
            }}
            placeholder="z. B. a"
            aria-invalid={Boolean(error && !backText.trim())}
          />
          <span className="field-hint">Die Antwort, Erklärung oder Übersetzung.</span>
        </div>

        {error ? (
          <p className="form-error form-error--panel" role="alert">
            {error}
          </p>
        ) : null}

        <div className="form-actions">
          <button className="button button--secondary" type="button" onClick={onCancel}>
            Abbrechen
          </button>
          <button className="button button--primary" type="submit">
            Karte speichern
          </button>
        </div>
      </form>
    </main>
  )
}
