'use client'

import React from 'react'

export function ShareButton() {
  const onShare = async () => {
    const url = window.location.href
    const title = document.title

    // Native share on mobile when available
    if (navigator.share) {
      try {
        await navigator.share({ title, url })
        return
      } catch {
        // user cancelled — ignore
      }
    }

    // Fallback: copy link
    await navigator.clipboard.writeText(url)
    alert('Link copied!')
  }

  return (
    <button
      type="button"
      onClick={onShare}
      className="rounded-full border px-4 py-2 text-sm font-medium"
      aria-label="Share this event"
    >
      Share
    </button>
  )
}
