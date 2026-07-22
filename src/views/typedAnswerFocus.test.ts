import { describe, expect, it, vi } from 'vitest'
import { focusTypedAnswerInput } from './typedAnswerFocus'

describe('focusTypedAnswerInput', () => {
  it('preserves the top position when the typed study page first opens', () => {
    const input = {
      focus: vi.fn(),
      scrollIntoView: vi.fn(),
    }

    focusTypedAnswerInput(input, true)

    expect(input.focus).toHaveBeenCalledWith({ preventScroll: true })
    expect(input.scrollIntoView).not.toHaveBeenCalled()
  })

  it('keeps the existing centered focus behavior for later cards', () => {
    const input = {
      focus: vi.fn(),
      scrollIntoView: vi.fn(),
    }

    focusTypedAnswerInput(input, false)

    expect(input.focus).toHaveBeenCalledWith()
    expect(input.scrollIntoView).toHaveBeenCalledWith({
      block: 'center',
      inline: 'nearest',
    })
  })
})
