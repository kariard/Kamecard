import { useEffect, useRef } from 'react'

/** Follow Safari's visual viewport: layout viewport units exclude neither the
 * keyboard nor the automatic viewport pan when an input receives focus. */
export function useStudyKeyboardLayout(enabled: boolean) {
  const pageRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const page = pageRef.current
    if (!enabled || !page) return

    const viewport = window.visualViewport
    const mobile = window.matchMedia('(max-width: 900px) and (pointer: coarse)')
    let frame = 0

    const update = () => {
      const form = page.querySelector('.typed-answer-form')
      const focused = form?.contains(document.activeElement) ?? false
      const keyboardOpen = viewport
        ? document.documentElement.clientHeight - viewport.height > 100
          && viewport.scale === 1
        : false
      // Keep the layout stable while tapping the submit button, even if Safari
      // briefly moves focus away from the input before dispatching the click.
      const compact = mobile.matches && (focused || keyboardOpen)
      page.classList.toggle('study-page--typing', compact)
      page.style.setProperty('--study-visible-height', `${viewport?.height ?? window.innerHeight}px`)
      page.style.setProperty('--study-visible-top', `${viewport?.offsetTop ?? 0}px`)
    }
    const scheduleUpdate = () => {
      window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(update)
    }

    update()
    viewport?.addEventListener('resize', scheduleUpdate)
    viewport?.addEventListener('scroll', scheduleUpdate)
    window.addEventListener('resize', scheduleUpdate)
    document.addEventListener('focusin', scheduleUpdate)
    document.addEventListener('focusout', scheduleUpdate)
    mobile.addEventListener('change', scheduleUpdate)

    return () => {
      window.cancelAnimationFrame(frame)
      viewport?.removeEventListener('resize', scheduleUpdate)
      viewport?.removeEventListener('scroll', scheduleUpdate)
      window.removeEventListener('resize', scheduleUpdate)
      document.removeEventListener('focusin', scheduleUpdate)
      document.removeEventListener('focusout', scheduleUpdate)
      mobile.removeEventListener('change', scheduleUpdate)
      page.classList.remove('study-page--typing')
      page.style.removeProperty('--study-visible-height')
      page.style.removeProperty('--study-visible-top')
    }
  }, [enabled])

  return pageRef
}
