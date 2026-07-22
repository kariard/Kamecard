import type { Card, StudyDirection } from '../types/models'

type PreviewCard = Pick<Card, 'frontText' | 'backText'>

export type StudyDirectionPreviews = Record<StudyDirection, string>

export function createStudyDirectionPreviews(
  cards: readonly PreviewCard[],
): StudyDirectionPreviews {
  const previewCard = cards[0]
  const frontText = previewCard?.frontText ?? 'Vorderseite'
  const backText = previewCard?.backText ?? 'Rückseite'

  return {
    'front-to-back': `${frontText} → ${backText}`,
    'back-to-front': `${backText} → ${frontText}`,
    mixed: `${frontText} ⇄ ${backText}`,
  }
}
