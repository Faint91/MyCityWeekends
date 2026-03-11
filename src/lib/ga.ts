'use client'

export function trackEvent(name: string, params?: Record<string, any>) {
  if (typeof window === 'undefined') return
  if (!window.gtag) return
  window.gtag('event', name, params ?? {})
}
