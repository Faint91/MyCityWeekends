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
      className="rounded-full border border-[#007AFF] bg-[#007AFF] px-3 py-1.5 text-sm font-medium text-white transition hover:border-[#0066D6] hover:bg-[#0066D6]"
      aria-label="Share this event"
    >
      Share
    </button>
  )
}
