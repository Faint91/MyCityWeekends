export type GAEventParams = Record<string, string | number | boolean | null | undefined>

export function trackEvent(name: string, params?: GAEventParams) {
  if (typeof window === 'undefined') return

  const gtag = (
    window as Window & {
      gtag?: (...args: unknown[]) => void
    }
  ).gtag

  if (!gtag) return
  gtag('event', name, params)
}
