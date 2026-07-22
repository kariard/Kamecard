import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createPageScrollResetter,
  PAGE_SCROLL_TO_TOP_OPTIONS,
  scrollPageToTop,
} from './usePageScrollReset'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('page scroll reset', () => {
  it('scrolls to the top without animation', () => {
    const scrollTo = vi.fn()

    expect(scrollPageToTop({ scrollTo })).toBe(true)
    expect(scrollTo).toHaveBeenCalledOnce()
    expect(scrollTo).toHaveBeenCalledWith({
      top: 0,
      left: 0,
      behavior: 'auto',
    })
    expect(PAGE_SCROLL_TO_TOP_OPTIONS).toEqual({
      top: 0,
      left: 0,
      behavior: 'auto',
    })
  })

  it('uses the browser window scroll function through the default path', () => {
    const scrollTo = vi.fn()
    vi.stubGlobal('window', { scrollTo })

    expect(scrollPageToTop()).toBe(true)
    expect(scrollTo).toHaveBeenCalledWith({
      top: 0,
      left: 0,
      behavior: 'auto',
    })
  })

  it('resets only when the page key changes', () => {
    const scrollToTop = vi.fn()
    const resetForPage = createPageScrollResetter(scrollToTop)

    expect(resetForPage('overview')).toBe(true)
    expect(resetForPage('overview')).toBe(false)
    expect(resetForPage('deck:deck-1')).toBe(true)
    expect(resetForPage('deck:deck-1')).toBe(false)

    expect(scrollToTop).toHaveBeenCalledTimes(2)
  })

  it('is safe when no browser scroll target is available', () => {
    expect(scrollPageToTop(null)).toBe(false)
  })

  it('does not crash when a browser rejects the options overload', () => {
    const scrollTo = vi.fn(() => {
      throw new TypeError('Unsupported scroll options')
    })

    expect(scrollPageToTop({ scrollTo })).toBe(false)
  })
})
