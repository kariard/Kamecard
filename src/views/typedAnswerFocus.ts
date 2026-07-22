interface TypedAnswerInput {
  focus(options?: FocusOptions): void
  scrollIntoView(options?: ScrollIntoViewOptions): void
}

export function focusTypedAnswerInput(
  input: TypedAnswerInput,
  keepPageAtTop: boolean,
): void {
  if (keepPageAtTop) {
    input.focus({ preventScroll: true })
    return
  }

  input.focus()
  input.scrollIntoView({
    block: 'center',
    inline: 'nearest',
  })
}
