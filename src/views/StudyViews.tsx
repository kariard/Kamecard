import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { PageIntro } from '../components/PageIntro'
import {
  createTypedAnswerAttempt,
  submitTypedAnswer,
  type StudyAnswerMethod,
  type TypedAnswerAttempt,
} from '../features/study'
import { loadStudyPreferences } from '../storage'
import type { Card, Deck, StudyDirection } from '../types/models'
import { createStudyDirectionPreviews } from './studyDirectionPreview'
import { startStudyWithSelectedOptions } from './studySetupSelection'
import { focusTypedAnswerInput } from './typedAnswerFocus'

interface StudySetupViewProps {
  deck: Deck
  onStart: (
    direction: StudyDirection,
    answerMethod: StudyAnswerMethod,
  ) => void
}

const directionOptions: Array<{
  value: StudyDirection
  title: string
  description: string
}> = [
  {
    value: 'front-to-back',
    title: 'Vorderseite → Rückseite',
    description: 'Lerne in der gewohnten Kartenrichtung.',
  },
  {
    value: 'back-to-front',
    title: 'Rückseite → Vorderseite',
    description: 'Prüfe dein Wissen in umgekehrter Richtung.',
  },
  {
    value: 'mixed',
    title: 'Gemischt',
    description:
      'Für jede Karte wird eine Richtung festgelegt und bei Wiederholungen beibehalten.',
  },
]

const answerMethodOptions: Array<{
  value: StudyAnswerMethod
  title: string
  description: string
  preview: string
}> = [
  {
    value: 'self-assessment',
    title: 'Selbst bewerten',
    description: 'Zeige die Antwort an und entscheide selbst, ob du sie wusstest.',
    preview: '✓ / ×',
  },
  {
    value: 'typed-answer',
    title: 'Antwort eintippen',
    description: 'Tippe deine Antwort ein und lasse KameCard sie direkt prüfen.',
    preview: 'Aa',
  },
]

export function StudySetupView({ deck, onStart }: StudySetupViewProps) {
  const [preferences, setPreferences] = useState(() =>
    loadStudyPreferences(),
  )
  const { direction, answerMethod } = preferences
  const directionPreviews = createStudyDirectionPreviews(deck.cards)

  return (
    <main id="main-content" className="page-shell page-shell--narrow">
      <PageIntro
        eyebrow={deck.name}
        title="Lernrunde vorbereiten"
        description={`${deck.cards.length} ${deck.cards.length === 1 ? 'Karte wartet' : 'Karten warten'} auf dich. Zuerst wird jede Karte einmal gezeigt.`}
      />

      <section className="setup-panel surface" aria-label="Einstellungen der Lernrunde">
        <button
          className="button button--primary button--wide study-start-button"
          type="button"
          disabled={deck.cards.length === 0}
          onClick={() =>
            startStudyWithSelectedOptions(onStart, direction, answerMethod)
          }
        >
          Lernrunde starten
        </button>

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
                onChange={() =>
                  setPreferences((current) => ({
                    ...current,
                    direction: option.value,
                  }))
                }
              />
              <span className="direction-option__check" aria-hidden="true" />
              <span
                className="direction-option__preview"
                title={directionPreviews[option.value]}
              >
                {directionPreviews[option.value]}
              </span>
              <strong>{option.title}</strong>
              <span>{option.description}</span>
            </label>
          ))}
        </div>

        <div className="section-heading answer-method-heading">
          <div>
            <p className="eyebrow">Schritt 2</p>
            <h2 id="study-answer-method-title">Wie möchtest du antworten?</h2>
          </div>
        </div>
        <div
          className="direction-grid answer-method-grid"
          role="radiogroup"
          aria-labelledby="study-answer-method-title"
        >
          {answerMethodOptions.map((option) => (
            <label
              key={option.value}
              className={`direction-option answer-method-option ${answerMethod === option.value ? 'direction-option--selected' : ''}`}
            >
              <input
                type="radio"
                name="study-answer-method"
                value={option.value}
                checked={answerMethod === option.value}
                onChange={() =>
                  setPreferences((current) => ({
                    ...current,
                    answerMethod: option.value,
                  }))
                }
              />
              <span className="direction-option__check" aria-hidden="true" />
              <span className="direction-option__preview" aria-hidden="true">
                {option.preview}
              </span>
              <strong>{option.title}</strong>
              <span>{option.description}</span>
            </label>
          ))}
        </div>

      </section>

      <aside className="notice-box" aria-label="Hinweis zur Lernrunde">
        <strong>So funktioniert die Runde</strong>
        <p>
          Zuerst siehst du jede Karte einmal. Danach werden neue, unsichere
          und falsch beantwortete Karten wiederholt, bis sie gefestigt sind.
        </p>
      </aside>
    </main>
  )
}

interface StudySessionViewProps {
  deckName: string
  answerMethod: StudyAnswerMethod
  prompt: string
  answer: string
  isFlipped: boolean
  progress: number
  completedCards: number
  totalCards: number
  correctCount: number
  incorrectCount: number
  onReveal: () => void
  onRate: (knew: boolean) => boolean
  onContinueAfterTypedAnswer: (isComplete: boolean) => void
  onQuit: () => void
}

interface TypedAnswerFeedback {
  prompt: string
  input: string
  expected: string
  knewAnswer: boolean
  isComplete: boolean
}

export function StudySessionView({
  deckName,
  answerMethod,
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
  onContinueAfterTypedAnswer,
  onQuit,
}: StudySessionViewProps) {
  const [confirmQuit, setConfirmQuit] = useState(false)
  const [typedAnswer, setTypedAnswer] = useState('')
  const [typedFeedback, setTypedFeedback] =
    useState<TypedAnswerFeedback | null>(null)
  const typedAnswerInputRef = useRef<HTMLInputElement>(null)
  const hasFocusedTypedAnswerRef = useRef(false)
  const typedAttemptRef = useRef<TypedAnswerAttempt<boolean>>(
    createTypedAnswerAttempt(),
  )
  const usesTypedAnswer = answerMethod === 'typed-answer'
  const displayedPrompt = typedFeedback?.prompt ?? prompt

  useEffect(() => {
    if (usesTypedAnswer && typedFeedback === null) {
      const frameId = window.requestAnimationFrame(() => {
        const input = typedAnswerInputRef.current
        if (!input) return

        focusTypedAnswerInput(input, !hasFocusedTypedAnswerRef.current)
        hasFocusedTypedAnswerRef.current = true
      })

      return () => window.cancelAnimationFrame(frameId)
    }
  }, [displayedPrompt, typedFeedback, usesTypedAnswer])

  function continueAfterTypedAnswer() {
    if (!typedFeedback) return

    const isComplete = typedFeedback.isComplete
    typedAttemptRef.current = createTypedAnswerAttempt()
    setTypedAnswer('')
    setTypedFeedback(null)
    onContinueAfterTypedAnswer(isComplete)
  }

  function handleTypedAnswerSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (typedFeedback) {
      continueAfterTypedAnswer()
      return
    }

    const submittedAttempt = submitTypedAnswer(
      typedAttemptRef.current,
      typedAnswer,
      answer,
      onRate,
    )
    typedAttemptRef.current = submittedAttempt
    setTypedFeedback({
      prompt,
      input: submittedAttempt.submission.input,
      expected: submittedAttempt.submission.expected,
      knewAnswer: submittedAttempt.submission.knewAnswer,
      isComplete: submittedAttempt.submission.rateResult,
    })
  }

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
            {completedCards} von {totalCards} Karten gefestigt
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

      <section
        className="study-stage"
        aria-live={usesTypedAnswer ? undefined : 'polite'}
      >
        {usesTypedAnswer ? (
          <>
            <div className="typed-answer-card">
              <span className="field-caption">Aufgabe</span>
              <strong>{displayedPrompt}</strong>
              <span className="flip-card__hint">
                Tippe die passende Antwort ein.
              </span>
            </div>

            <form
              className="typed-answer-form"
              onSubmit={handleTypedAnswerSubmit}
            >
              <label htmlFor="typed-study-answer">Deine Antwort</label>
              <input
                ref={typedAnswerInputRef}
                id="typed-study-answer"
                className="typed-answer-input"
                type="text"
                autoFocus
                value={typedAnswer}
                readOnly={typedFeedback !== null}
                autoComplete="off"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="send"
                aria-describedby={
                  typedFeedback
                    ? 'typed-answer-feedback'
                    : 'typed-answer-help'
                }
                aria-invalid={
                  typedFeedback ? !typedFeedback.knewAnswer : undefined
                }
                onChange={(event) => setTypedAnswer(event.target.value)}
              />
              {!typedFeedback ? (
                <p id="typed-answer-help" className="muted-copy">
                  Mit Enter oder dem Button kannst du deine Antwort prüfen.
                </p>
              ) : (
                <div
                  id="typed-answer-feedback"
                  className={`typed-answer-feedback ${
                    typedFeedback.knewAnswer
                      ? 'typed-answer-feedback--correct'
                      : 'typed-answer-feedback--incorrect'
                  }`}
                  role="status"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  <strong>
                    {typedFeedback.knewAnswer
                      ? 'Richtig!'
                      : 'Noch nicht richtig.'}
                  </strong>
                  {typedFeedback.knewAnswer ? (
                    <p>Deine Antwort stimmt mit der erwarteten Antwort überein.</p>
                  ) : (
                    <dl className="typed-answer-comparison">
                      <div>
                        <dt>Deine Antwort</dt>
                        <dd>
                          {typedFeedback.input || 'Keine Antwort eingegeben'}
                        </dd>
                      </div>
                      <div>
                        <dt>Korrekte Antwort</dt>
                        <dd>{typedFeedback.expected}</dd>
                      </div>
                    </dl>
                  )}
                </div>
              )}

              <div className="typed-answer-actions">
                <button
                  className="button button--primary button--study"
                  type="submit"
                >
                  {typedFeedback ? 'Nächste Karte' : 'Antwort prüfen'}
                </button>
              </div>
            </form>
          </>
        ) : (
          <>
            <button
              className={`flip-card ${isFlipped ? 'flip-card--flipped' : ''}`}
              type="button"
              onClick={() => {
                if (!isFlipped) onReveal()
              }}
              aria-label={
                isFlipped
                  ? `Antwort: ${answer}`
                  : `Karte: ${prompt}. Antwort anzeigen`
              }
            >
              <span className="flip-card__inner">
                <span className="flip-card__face flip-card__front">
                  <span className="field-caption">Aufgabe</span>
                  <strong>{prompt}</strong>
                  <span className="flip-card__hint">
                    Antippen zum Umdrehen
                  </span>
                </span>
                <span className="flip-card__face flip-card__back">
                  <span className="field-caption">Antwort</span>
                  <strong>{answer}</strong>
                  <span className="flip-card__hint">
                    Wie gut wusstest du es?
                  </span>
                </span>
              </span>
            </button>

            <div className="study-actions">
              {!isFlipped ? (
                <button
                  className="button button--primary button--study"
                  type="button"
                  onClick={onReveal}
                >
                  Antwort anzeigen
                </button>
              ) : (
                <div className="rating-actions">
                  <button
                    className="button button--correct"
                    type="button"
                    onClick={() => onRate(true)}
                  >
                    <span aria-hidden="true">✓</span> Gewusst
                  </button>
                  <button
                    className="button button--incorrect"
                    type="button"
                    onClick={() => onRate(false)}
                  >
                    <span aria-hidden="true">×</span> Nicht gewusst
                  </button>
                </div>
              )}
            </div>
          </>
        )}
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
        <p>Du hast das Rundenziel für jede Karte erreicht.</p>
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
