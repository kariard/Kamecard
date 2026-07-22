import { useState } from 'react'
import { AppHeader } from './components/AppHeader'
import { downloadDeckBackup, downloadFullBackup, parseBackupJson } from './features/backup'
import {
  isStudySessionComplete,
  type StudyAnswerMethod,
} from './features/study'
import { useKamecardData } from './hooks/useKamecardData'
import { useStudyFlow } from './hooks/useStudyFlow'
import type { ImportedCardDraft, StudyDirection } from './types/models'
import { getDeckProgress } from './utils/statistics'
import { BackupView } from './views/BackupView'
import { CardEditorView } from './views/CardEditorView'
import { DeckDetailView } from './views/DeckDetailView'
import { DeckOverviewView } from './views/DeckOverviewView'
import { ImportView } from './views/ImportView'
import { StudyCompleteView, StudySessionView, StudySetupView } from './views/StudyViews'

type Route =
  | { name: 'overview' }
  | { name: 'deck'; deckId: string }
  | { name: 'card'; deckId: string; cardId?: string }
  | { name: 'import'; deckId?: string }
  | { name: 'backup' }
  | { name: 'study-setup'; deckId: string }
  | { name: 'study-session'; deckId: string }
  | { name: 'study-complete'; deckId: string }

export default function App() {
  const {
    data,
    storageMessage,
    dismissStorageMessage,
    addDeck,
    renameDeck,
    deleteDeck,
    addCard,
    updateCard,
    replaceStudyCard,
    deleteCard,
    importCards,
    replaceAllData,
    addImportedDeck,
  } = useKamecardData()
  const [route, setRoute] = useState<Route>({ name: 'overview' })
  const [appMessage, setAppMessage] = useState('')

  const routeDeckId = 'deckId' in route ? route.deckId : undefined
  const selectedDeck = data.decks.find((deck) => deck.id === routeDeckId)
  const study = useStudyFlow(selectedDeck?.cards ?? [])

  function openDeck(deckId: string) {
    study.reset()
    setRoute({ name: 'deck', deckId })
  }

  function backFromCurrentRoute() {
    if (route.name === 'overview') return
    if ('deckId' in route && route.deckId && route.name !== 'deck') {
      setRoute({ name: 'deck', deckId: route.deckId })
      return
    }
    setRoute({ name: 'overview' })
  }

  function beginStudy(
    direction: StudyDirection,
    answerMethod: StudyAnswerMethod = 'self-assessment',
    difficultOnly = false,
  ) {
    if (!selectedDeck) return
    const difficultIds = new Set(study.difficultCardIds)
    const cards = difficultOnly
      ? selectedDeck.cards.filter((card) => difficultIds.has(card.id))
      : selectedDeck.cards
    if (!cards.length) return
    study.begin(direction, cards, answerMethod)
    setRoute({ name: 'study-session', deckId: selectedDeck.id })
  }

  function renderRoute() {
    if (route.name === 'overview') {
      return (
        <DeckOverviewView
          decks={data.decks}
          getProgress={getDeckProgress}
          onCreateDeck={(name) => openDeck(addDeck(name))}
          onOpenDeck={openDeck}
          onImport={() => setRoute({ name: 'import' })}
          onBackup={() => setRoute({ name: 'backup' })}
        />
      )
    }

    if (route.name === 'backup') {
      return (
        <BackupView
          deckCount={data.decks.length}
          onExport={() => {
            setAppMessage(downloadFullBackup(data) ? 'Backup wurde heruntergeladen.' : 'Backup konnte nicht erstellt werden.')
          }}
          onImport={(text) => {
            const result = parseBackupJson(text)
            if (!result.ok) throw new Error(result.error)
            if (result.backup.kind === 'full') {
              replaceAllData(result.backup.data)
              setAppMessage('Alle Daten wurden aus dem Backup wiederhergestellt.')
            } else {
              addImportedDeck(result.backup.deck)
              setAppMessage('Das Deck aus dem Backup wurde hinzugefügt.')
            }
          }}
        />
      )
    }

    if (route.name === 'import') {
      return (
        <ImportView
          decks={data.decks}
          initialDeckId={route.deckId}
          onImport={(target, cards) => {
            const deckId = importCards(target, cards)
            setAppMessage(`${cards.length} ${cards.length === 1 ? 'Karte wurde' : 'Karten wurden'} importiert.`)
            setRoute({ name: 'deck', deckId })
          }}
        />
      )
    }

    if (!selectedDeck) {
      return (
        <DeckOverviewView
          decks={data.decks}
          getProgress={getDeckProgress}
          onCreateDeck={(name) => openDeck(addDeck(name))}
          onOpenDeck={openDeck}
          onImport={() => setRoute({ name: 'import' })}
          onBackup={() => setRoute({ name: 'backup' })}
        />
      )
    }

    if (route.name === 'deck') {
      return (
        <DeckDetailView
          deck={selectedDeck}
          progress={getDeckProgress(selectedDeck)}
          onBack={() => setRoute({ name: 'overview' })}
          onRename={(name) => renameDeck(selectedDeck.id, name)}
          onDeleteDeck={() => {
            deleteDeck(selectedDeck.id)
            setRoute({ name: 'overview' })
          }}
          onStartStudy={() => setRoute({ name: 'study-setup', deckId: selectedDeck.id })}
          onCreateCard={() => setRoute({ name: 'card', deckId: selectedDeck.id })}
          onEditCard={(cardId) => setRoute({ name: 'card', deckId: selectedDeck.id, cardId })}
          onDeleteCard={(cardId) => deleteCard(selectedDeck.id, cardId)}
          onImport={() => setRoute({ name: 'import', deckId: selectedDeck.id })}
          onExport={() => {
            setAppMessage(
              downloadDeckBackup(selectedDeck)
                ? `„${selectedDeck.name}“ wurde exportiert.`
                : 'Das Deck konnte nicht exportiert werden.',
            )
          }}
        />
      )
    }

    if (route.name === 'card') {
      const card = selectedDeck.cards.find((entry) => entry.id === route.cardId)
      return (
        <CardEditorView
          key={card?.id ?? 'new-card'}
          card={card}
          deckName={selectedDeck.name}
          onCancel={() => setRoute({ name: 'deck', deckId: selectedDeck.id })}
          onSave={(draft: ImportedCardDraft) => {
            if (card) updateCard(selectedDeck.id, card.id, draft)
            else addCard(selectedDeck.id, draft)
            setRoute({ name: 'deck', deckId: selectedDeck.id })
          }}
        />
      )
    }

    if (route.name === 'study-setup') {
      return <StudySetupView deck={selectedDeck} onStart={beginStudy} />
    }

    if (
      route.name === 'study-session' &&
      study.session &&
      study.progress &&
      (study.current || study.session.answerMethod === 'typed-answer')
    ) {
      const answerMethod = study.session.answerMethod
      return (
        <StudySessionView
          deckName={selectedDeck.name}
          answerMethod={answerMethod}
          prompt={study.current?.promptText ?? ''}
          answer={study.current?.answerText ?? ''}
          isFlipped={study.isFlipped}
          progress={study.progress.percent}
          completedCards={study.progress.completedCards}
          totalCards={study.progress.totalCards}
          correctCount={study.session.correctAnswers}
          incorrectCount={study.session.incorrectAnswers}
          onReveal={study.reveal}
          onRate={(knew) => {
            const result = study.rate(knew)
            if (!result) return false
            replaceStudyCard(selectedDeck.id, result.updatedCard)
            const isComplete = isStudySessionComplete(result.session)
            if (answerMethod === 'self-assessment' && isComplete) {
              setRoute({ name: 'study-complete', deckId: selectedDeck.id })
            }
            return isComplete
          }}
          onContinueAfterTypedAnswer={(isComplete) => {
            if (isComplete) {
              setRoute({ name: 'study-complete', deckId: selectedDeck.id })
            }
          }}
          onQuit={() => openDeck(selectedDeck.id)}
        />
      )
    }

    if (route.name === 'study-complete' && study.session) {
      const completedSession = study.session
      const difficultCards = study.difficultCardIds.flatMap((cardId) => {
        const card = selectedDeck.cards.find((entry) => entry.id === cardId)
        const mistakeCount =
          completedSession.cardStates[cardId]?.incorrectAnswers ?? 0
        return card ? [{ card, mistakeCount }] : []
      })
      return (
        <StudyCompleteView
          deckName={selectedDeck.name}
          correctCount={completedSession.correctAnswers}
          incorrectCount={completedSession.incorrectAnswers}
          difficultCards={difficultCards}
          onRepeat={() =>
            beginStudy(completedSession.direction, completedSession.answerMethod)
          }
          onStudyDifficult={() =>
            beginStudy(
              completedSession.direction,
              completedSession.answerMethod,
              true,
            )
          }
          onBackToDeck={() => openDeck(selectedDeck.id)}
        />
      )
    }

    return <StudySetupView deck={selectedDeck} onStart={beginStudy} />
  }

  const showGlobalHeader = route.name !== 'study-session'

  return (
    <div className="app">
      <a className="skip-link" href="#main-content">Zum Inhalt springen</a>
      {showGlobalHeader ? (
        <AppHeader
          title={selectedDeck?.name ?? 'KameCard'}
          eyebrow={route.name === 'overview' ? undefined : 'KameCard'}
          onBack={route.name === 'overview' ? undefined : backFromCurrentRoute}
        />
      ) : null}
      {storageMessage || appMessage ? (
        <div className="app-notice" role="status">
          <span>{storageMessage || appMessage}</span>
          <button
            type="button"
            onClick={() => {
              dismissStorageMessage()
              setAppMessage('')
            }}
            aria-label="Hinweis schließen"
          >
            ×
          </button>
        </div>
      ) : null}
      {renderRoute()}
    </div>
  )
}
