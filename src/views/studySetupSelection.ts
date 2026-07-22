import type { StudyAnswerMethod } from '../features/study'
import type { StudyDirection } from '../types/models'

type StartStudy = (
  direction: StudyDirection,
  answerMethod: StudyAnswerMethod,
) => void

export function startStudyWithSelectedOptions(
  onStart: StartStudy,
  direction: StudyDirection,
  answerMethod: StudyAnswerMethod,
): void {
  onStart(direction, answerMethod)
}
