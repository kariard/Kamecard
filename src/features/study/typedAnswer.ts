const LATIN_SEGMENTS = /\p{Script=Latin}+/gu
const CONSECUTIVE_WHITESPACE = /\s+/gu

export interface TypedAnswerSubmission<RateResult> {
  input: string
  expected: string
  knewAnswer: boolean
  rateResult: RateResult
}

export interface PendingTypedAnswerAttempt {
  status: 'pending'
}

export interface SubmittedTypedAnswerAttempt<RateResult> {
  status: 'submitted'
  submission: TypedAnswerSubmission<RateResult>
}

export type TypedAnswerAttempt<RateResult = unknown> =
  | PendingTypedAnswerAttempt
  | SubmittedTypedAnswerAttempt<RateResult>

export function normalizeTypedAnswer(value: string): string {
  return value
    .normalize('NFKC')
    .trim()
    .replace(CONSECUTIVE_WHITESPACE, ' ')
    .replace(LATIN_SEGMENTS, (segment) => segment.toLowerCase())
}

export function isTypedAnswerCorrect(
  input: string,
  expected: string,
): boolean {
  return normalizeTypedAnswer(input) === normalizeTypedAnswer(expected)
}

export function createTypedAnswerAttempt(): PendingTypedAnswerAttempt {
  return { status: 'pending' }
}

export function submitTypedAnswer<RateResult>(
  attempt: TypedAnswerAttempt<RateResult>,
  input: string,
  expected: string,
  rate: (knewAnswer: boolean) => RateResult,
): SubmittedTypedAnswerAttempt<RateResult> {
  if (attempt.status === 'submitted') {
    return attempt
  }

  const knewAnswer = isTypedAnswerCorrect(input, expected)

  return {
    status: 'submitted',
    submission: {
      input,
      expected,
      knewAnswer,
      rateResult: rate(knewAnswer),
    },
  }
}
