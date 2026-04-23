'use client'

import React, { useEffect, useState } from 'react'
import { isSaved, subscribeToSavedSlugs, toggleSaved } from '@/lib/savedEvents'
import { trackEvent } from '@/lib/ga'

export function SaveToggleButton({ slug }: { slug: string }) {
  const [saved, setSaved] = useState(false)
  const [justSaved, setJustSaved] = useState(false)

  useEffect(() => {
    setSaved(isSaved(slug))

    return subscribeToSavedSlugs((slugs) => {
      setSaved(slugs.includes(slug))
    })
  }, [slug])

  const onClick = () => {
    const wasSaved = saved
    const nowSaved = toggleSaved(slug)

    setSaved(nowSaved)
    trackEvent(nowSaved ? 'save_event' : 'unsave_event', { slug })

    if (!wasSaved && nowSaved) {
      setJustSaved(true)
      window.setTimeout(() => setJustSaved(false), 550)
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-sm font-medium text-white transition-all duration-200 ${
        saved ? 'border-[#0066D6] bg-[#0066D6]' : 'border-[#007AFF] bg-[#007AFF]'
      } ${
        justSaved
          ? 'scale-[1.01] shadow-[0_0_0_2px_rgba(0,122,255,0.14),0_0_8px_rgba(0,122,255,0.22)]'
          : ''
      } hover:border-[#0066D6] hover:bg-[#0066D6]`}
      aria-label={saved ? 'Unsave event' : 'Save event'}
      data-testid="save-toggle"
    >
      {saved ? 'Saved' : 'Save'}
    </button>
  )
}
