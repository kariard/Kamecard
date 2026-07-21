import { useCallback, useRef, useState } from 'react'
import { loadAppData, saveAppData } from '../storage'
import { SCHEMA_VERSION, type AppData, type Card, type Deck, type ImportedCardDraft } from '../types/models'
import { createId } from '../utils/id'
import { createCard, createDeck } from '../utils/records'

type DataUpdater = (current: AppData) => AppData

function updateDeckTimestamp(deck: Deck): Deck {
  return { ...deck, updatedAt: new Date().toISOString() }
}

export function useKamecardData() {
  const initialLoad = useRef<ReturnType<typeof loadAppData> | null>(null)
  if (initialLoad.current === null) initialLoad.current = loadAppData()

  const [data, setData] = useState<AppData>(initialLoad.current.data)
  const [storageMessage, setStorageMessage] = useState(initialLoad.current.warning ?? '')
  const dataRef = useRef(data)

  const commit = useCallback((updater: DataUpdater): AppData => {
    const nextData = updater(dataRef.current)
    dataRef.current = nextData
    setData(nextData)
    const result = saveAppData(nextData)
    setStorageMessage(result.ok ? '' : result.error)
    return nextData
  }, [])

  const addDeck = useCallback(
    (name: string): string => {
      const deck = createDeck(name)
      commit((current) => ({ ...current, decks: [...current.decks, deck] }))
      return deck.id
    },
    [commit],
  )

  const renameDeck = useCallback(
    (deckId: string, name: string) => {
      commit((current) => ({
        ...current,
        decks: current.decks.map((deck) =>
          deck.id === deckId ? updateDeckTimestamp({ ...deck, name: name.trim() }) : deck,
        ),
      }))
    },
    [commit],
  )

  const deleteDeck = useCallback(
    (deckId: string) => {
      commit((current) => ({
        ...current,
        decks: current.decks.filter((deck) => deck.id !== deckId),
      }))
    },
    [commit],
  )

  const addCard = useCallback(
    (deckId: string, draft: ImportedCardDraft): string => {
      const card = createCard(draft.frontText, draft.backText)
      commit((current) => ({
        ...current,
        decks: current.decks.map((deck) =>
          deck.id === deckId
            ? updateDeckTimestamp({ ...deck, cards: [...deck.cards, card] })
            : deck,
        ),
      }))
      return card.id
    },
    [commit],
  )

  const updateCard = useCallback(
    (deckId: string, cardId: string, draft: ImportedCardDraft) => {
      const updatedAt = new Date().toISOString()
      commit((current) => ({
        ...current,
        decks: current.decks.map((deck) =>
          deck.id === deckId
            ? {
                ...deck,
                updatedAt,
                cards: deck.cards.map((card) =>
                  card.id === cardId
                    ? {
                        ...card,
                        frontText: draft.frontText.trim(),
                        backText: draft.backText.trim(),
                        updatedAt,
                      }
                    : card,
                ),
              }
            : deck,
        ),
      }))
    },
    [commit],
  )

  const replaceStudyCard = useCallback(
    (deckId: string, updatedCard: Card) => {
      commit((current) => ({
        ...current,
        decks: current.decks.map((deck) =>
          deck.id === deckId
            ? {
                ...deck,
                updatedAt: updatedCard.updatedAt,
                cards: deck.cards.map((card) => (card.id === updatedCard.id ? updatedCard : card)),
              }
            : deck,
        ),
      }))
    },
    [commit],
  )

  const deleteCard = useCallback(
    (deckId: string, cardId: string) => {
      commit((current) => ({
        ...current,
        decks: current.decks.map((deck) =>
          deck.id === deckId
            ? updateDeckTimestamp({
                ...deck,
                cards: deck.cards.filter((card) => card.id !== cardId),
              })
            : deck,
        ),
      }))
    },
    [commit],
  )

  const importCards = useCallback(
    (target: { deckId?: string; deckName?: string }, drafts: ImportedCardDraft[]): string => {
      const importedCards = drafts.map((draft) => createCard(draft.frontText, draft.backText))

      if (target.deckId) {
        commit((current) => ({
          ...current,
          decks: current.decks.map((deck) =>
            deck.id === target.deckId
              ? updateDeckTimestamp({ ...deck, cards: [...deck.cards, ...importedCards] })
              : deck,
          ),
        }))
        return target.deckId
      }

      const deck = createDeck(target.deckName ?? 'Importiertes Deck')
      const importedDeck = updateDeckTimestamp({ ...deck, cards: importedCards })
      commit((current) => ({ ...current, decks: [...current.decks, importedDeck] }))
      return importedDeck.id
    },
    [commit],
  )

  const replaceAllData = useCallback(
    (nextData: AppData) => {
      commit(() => nextData)
    },
    [commit],
  )

  const addImportedDeck = useCallback(
    (deck: Deck): string => {
      const existingIds = new Set(dataRef.current.decks.map((entry) => entry.id))
      const safeDeck = existingIds.has(deck.id)
        ? {
            ...deck,
            id: createId(),
            name: `${deck.name} (importiert)`,
            updatedAt: new Date().toISOString(),
          }
        : deck
      commit((current) => ({
        schemaVersion: SCHEMA_VERSION,
        decks: [...current.decks, safeDeck],
      }))
      return safeDeck.id
    },
    [commit],
  )

  return {
    data,
    storageMessage,
    dismissStorageMessage: () => setStorageMessage(''),
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
  }
}
