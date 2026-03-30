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
      className={`rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200 ${
        saved ? 'border-yellow-400/50 bg-yellow-400/8' : ''
      } ${
        justSaved
          ? 'scale-[1.01] shadow-[0_0_0_2px_rgba(250,204,21,0.10),0_0_6px_rgba(250,204,21,0.18)]'
          : ''
      }`}
      aria-label={saved ? 'Unsave event' : 'Save event'}
      data-testid="save-toggle"
    >
      {saved ? 'Saved' : 'Save'}
    </button>
  )
}
