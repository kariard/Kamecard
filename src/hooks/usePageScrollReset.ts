import { useEffect, useRef } from 'react'

export const PAGE_SCROLL_TO_TOP_OPTIONS = {
  top: 0,
  left: 0,
  behavior: 'auto',
} satisfies ScrollToOptions

interface PageScrollTarget {
  scrollTo(options: ScrollToOptions): void
}

type PageScrollResetter = (pageKey: string) => boolean

function getBrowserScrollTarget(): PageScrollTarget | null {
  if (typeof window === 'undefined' || typeof window.scrollTo !== 'function') {
    return null
  }

  return window
}

export function scrollPageToTop(
  target?: PageScrollTarget | null,
): boolean {
  const scrollTarget =
    target === undefined ? getBrowserScrollTarget() : target

  if (!scrollTarget) {
    return false
  }

  try {
    scrollTarget.scrollTo(PAGE_SCROLL_TO_TOP_OPTIONS)
    return true
  } catch {
    return false
  }
}

export function createPageScrollResetter(
  scrollToTop: () => void = () => {
    scrollPageToTop()
  },
): PageScrollResetter {
  let previousPageKey: string | undefined

  return (pageKey) => {
    if (pageKey === previousPageKey) {
      return false
    }

    previousPageKey = pageKey
    scrollToTop()
    return true
  }
}

export function usePageScrollReset(pageKey: string): void {
  const resetterRef = useRef<PageScrollResetter | null>(null)

  useEffect(() => {
    resetterRef.current ??= createPageScrollResetter()
    resetterRef.current(pageKey)
  }, [pageKey])
}
