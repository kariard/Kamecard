import type { StudyQueueItem, StudySession } from './studySession'

// Keep the unanswered current card in the queue when browsing elsewhere.
export function activateStudyItem(session: StudySession, item: StudyQueueItem): StudySession {
  if (session.currentItem?.cardId === item.cardId) return session
  const pending = session.remainingFirstPass.filter((entry) => entry.cardId !== item.cardId)
  if (session.currentItem && !session.cardStates[session.currentItem.cardId].completed
    && !pending.some((entry) => entry.cardId === session.currentItem?.cardId)) {
    pending.push(session.currentItem)
  }
  return {
    ...session,
    currentItem: item,
    remainingFirstPass: pending,
    phase: pending.length ? 'first-pass' : 'adaptive',
    cardStates: {
      ...session.cardStates,
      [item.cardId]: { ...session.cardStates[item.cardId], hasBeenSeen: true },
    },
  }
}

export function nextBrowsableItem(session: StudySession): StudyQueueItem | undefined {
  return session.remainingFirstPass[0] ?? Object.values(session.cardStates)
    .filter((state) => !state.completed && state.cardId !== session.currentItem?.cardId)
    .map(({ cardId, direction }) => ({ cardId, direction }))[0]
}

export function swipeAction(x: number, y: number): 'correct' | 'incorrect' | 'previous' | 'next' | undefined {
  if (Math.abs(x) >= 64 && Math.abs(x) > Math.abs(y) * 1.4) return x < 0 ? 'correct' : 'incorrect'
  if (Math.abs(y) >= 64 && Math.abs(y) > Math.abs(x) * 1.4) return y > 0 ? 'previous' : 'next'
  return undefined
}
