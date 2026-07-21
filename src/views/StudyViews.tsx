import { useState } from 'react'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { PageIntro } from '../components/PageIntro'
import type { Card, Deck, StudyDirection } from '../types/models'

interface StudySetupViewProps {
  deck: Deck
  onStart: (direction: StudyDirection) => void
}

const directionOptions: Array<{
  value: StudyDirection
  title: string
  description: string
  preview: string
}> = [
  {
    value: 'front-to-back',
    title: 'Vorderseite → Rückseite',
    description: 'Lerne in der gewohnten Kartenrichtung.',
    preview: 'あ → a',
  },
  {
    value: 'back-to-front',
    title: 'Rückseite → Vorderseite',
    description: 'Prüfe dein Wissen in umgekehrter Richtung.',
    preview: 'a → あ',
  },
  {
    value: 'mixed',
    title: 'Gemischt',
    description: 'Die Richtung wird bei jeder Karte neu gewählt.',
    preview: 'あ ⇄ a',
  },
]

export function StudySetupView({ deck, onStart }: StudySetupViewProps) {
  const [direction, setDirection] = useState<StudyDirection>('front-to-back')

  return (
    <main id="main-content" className="page-shell page-shell--narrow">
      <PageIntro
        eyebrow={deck.name}
        title="Lernrunde vorbereiten"
        description={`${deck.cards.length} ${deck.cards.length === 1 ? 'Karte wartet' : 'Karten warten'} auf dich. Falsche Antworten kommen später noch einmal.`}
      />

      <section className="setup-panel surface" aria-labelledby="study-direction-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Schritt 1</p>
            <h2 id="study-direction-title">Welche Richtung?</h2>
          </div>
        </div>
        <div className="direction-grid" role="radiogroup" aria-label="Lernrichtung">
          {directionOptions.map((option) => (
            <label
              key={option.value}
              className={`direction-option ${direction === option.value ? 'direction-option--selected' : ''}`}
            >
              <input
                type="radio"
                name="study-direction"
                value={option.value}
                checked={direction === option.value}
                onChange={() => setDirection(option.value)}
              />
              <span className="direction-option__check" aria-hidden="true" />
              <span className="direction-option__preview">{option.preview}</span>
              <strong>{option.title}</strong>
              <span>{option.description}</span>
            </label>
          ))}
        </div>
        <button className="button button--primary button--wide" type="button" onClick={() => onStart(direction)}>
          Lernrunde starten
        </button>
      </section>

      <aside className="notice-box" aria-label="Hinweis zur Lernrunde">
        <strong>So funktioniert die Runde</strong>
        <p>Jede Karte muss einmal richtig beantwortet werden. Unsichere Karten tauchen automatisch erneut auf.</p>
      </aside>
    </main>
  )
}

interface StudySessionViewProps {
  deckName: string
  prompt: string
  answer: string
  isFlipped: boolean
  progress: number
  completedCards: number
  totalCards: number
  correctCount: number
  incorrectCount: number
  onReveal: () => void
  onRate: (knew: boolean) => void
  onQuit: () => void
}

export function StudySessionView({
  deckName,
  prompt,
  answer,
  isFlipped,
  progress,
  completedCards,
  totalCards,
  correctCount,
  incorrectCount,
  onReveal,
  onRate,
  onQuit,
}: StudySessionViewProps) {
  const [confirmQuit, setConfirmQuit] = useState(false)

  return (
    <main id="main-content" className="study-page">
      <div className="study-toolbar">
        <div>
          <p className="eyebrow">Lernrunde</p>
          <h1>{deckName}</h1>
        </div>
        <button className="button button--ghost" type="button" onClick={() => setConfirmQuit(true)}>
          Runde beenden
        </button>
      </div>

      <section className="session-progress" aria-label="Fortschritt der Lernrunde">
        <div className="session-progress__copy">
          <span>
            {completedCards} von {totalCards} Karten geschafft
          </span>
          <strong>{Math.round(progress)} %</strong>
        </div>
        <div
          className="session-progress__track"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress)}
        >
          <span style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
        </div>
      </section>

      <section className="study-stage" aria-live="polite">
        <button
          className={`flip-card ${isFlipped ? 'flip-card--flipped' : ''}`}
          type="button"
          onClick={() => {
            if (!isFlipped) onReveal()
          }}
          aria-label={isFlipped ? `Antwort: ${answer}` : `Karte: ${prompt}. Antwort anzeigen`}
        >
          <span className="flip-card__inner">
            <span className="flip-card__face flip-card__front">
              <span className="field-caption">Aufgabe</span>
              <strong>{prompt}</strong>
              <span className="flip-card__hint">Antippen zum Umdrehen</span>
            </span>
            <span className="flip-card__face flip-card__back">
              <span className="field-caption">Antwort</span>
              <strong>{answer}</strong>
              <span className="flip-card__hint">Wie gut wusstest du es?</span>
            </span>
          </span>
        </button>

        <div className="study-actions">
          {!isFlipped ? (
            <button className="button button--primary button--study" type="button" onClick={onReveal}>
              Antwort anzeigen
            </button>
          ) : (
            <div className="rating-actions">
              <button className="button button--incorrect" type="button" onClick={() => onRate(false)}>
                <span aria-hidden="true">×</span> Nicht gewusst
              </button>
              <button className="button button--correct" type="button" onClick={() => onRate(true)}>
                <span aria-hidden="true">✓</span> Gewusst
              </button>
            </div>
          )}
        </div>
      </section>

      <div className="study-score" aria-label="Antworten in dieser Runde">
        <span><i className="score-dot score-dot--correct" /> {correctCount} gewusst</span>
        <span><i className="score-dot score-dot--incorrect" /> {incorrectCount} nicht gewusst</span>
      </div>

      <ConfirmDialog
        isOpen={confirmQuit}
        title="Lernrunde beenden?"
        description="Deine bisherigen Antworten bleiben gespeichert, aber die aktuelle Runde wird beendet."
        confirmLabel="Runde beenden"
        destructive
        onCancel={() => setConfirmQuit(false)}
        onConfirm={onQuit}
      />
    </main>
  )
}

interface StudyCompleteViewProps {
  deckName: string
  correctCount: number
  incorrectCount: number
  difficultCards: Array<{ card: Card; mistakeCount: number }>
  onRepeat: () => void
  onStudyDifficult: () => void
  onBackToDeck: () => void
}

export function StudyCompleteView({
  deckName,
  correctCount,
  incorrectCount,
  difficultCards,
  onRepeat,
  onStudyDifficult,
  onBackToDeck,
}: StudyCompleteViewProps) {
  const totalAnswers = correctCount + incorrectCount
  const accuracy = totalAnswers ? Math.round((correctCount / totalAnswers) * 100) : 0

  return (
    <main id="main-content" className="page-shell page-shell--narrow">
      <section className="completion-hero">
        <span className="completion-hero__seal" aria-hidden="true">完</span>
        <p className="eyebrow">{deckName}</p>
        <h1>Level geschafft!</h1>
        <p>Du hast jede Karte dieser Runde mindestens einmal gewusst.</p>
      </section>

      <section className="result-grid" aria-label="Ergebnis">
        <div className="result-card">
          <strong>{accuracy} %</strong>
          <span>Trefferquote</span>
        </div>
        <div className="result-card result-card--green">
          <strong>{correctCount}</strong>
          <span>Gewusst</span>
        </div>
        <div className="result-card result-card--coral">
          <strong>{incorrectCount}</strong>
          <span>Nicht gewusst</span>
        </div>
      </section>

      <section className="surface difficult-list" aria-labelledby="difficult-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Rundenrückblick</p>
            <h2 id="difficult-title">Schwierigste Karten</h2>
          </div>
          <span className="count-pill">{difficultCards.length}</span>
        </div>
        {difficultCards.length ? (
          <ul>
            {difficultCards.map(({ card, mistakeCount }) => (
              <li key={card.id}>
                <span>{card.frontText}</span>
                <span aria-hidden="true">→</span>
                <span>{card.backText}</span>
                <span className="difficulty-count">
                  {mistakeCount}× nicht gewusst
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted-copy">Stark – diesmal war keine Karte schwierig.</p>
        )}
      </section>

      <div className="completion-actions">
        <button className="button button--primary" type="button" onClick={onRepeat}>
          Noch einmal
        </button>
        <button
          className="button button--secondary"
          type="button"
          disabled={!difficultCards.length}
          onClick={onStudyDifficult}
        >
          Nur schwierige Karten
        </button>
        <button className="button button--ghost" type="button" onClick={onBackToDeck}>
          Zurück zum Deck
        </button>
      </div>
    </main>
  )
}
