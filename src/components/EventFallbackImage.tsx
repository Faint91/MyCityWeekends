'use client'

import Image from 'next/image'
import React, { useState } from 'react'

import {
  getEventVisualCategory,
  getEventVisualCategoryImagePath,
  type EventVisualCategoryInput,
} from '@/lib/eventVisualCategory'
import { cn } from '@/utilities/ui'

type Props = EventVisualCategoryInput & {
  className?: string
}

export function EventFallbackImage({
  title,
  description,
  venueName,
  neighborhood,
  tags,
  className,
}: Props) {
  const { key, definition } = getEventVisualCategory({
    title,
    description,
    venueName,
    neighborhood,
    tags,
  })

  const defaultImagePath = getEventVisualCategoryImagePath('default')
  const categoryImagePath = getEventVisualCategoryImagePath(key)

  const [imageSrc, setImageSrc] = useState(categoryImagePath)
  const [imageFailed, setImageFailed] = useState(false)

  const fallbackLabel = `${definition.label} fallback image for ${title ?? 'event'}`

  return (
    <div
      className={cn(
        'relative flex h-full min-h-full w-full overflow-hidden bg-gradient-to-br from-[#071A3A] via-[#007AFF] to-[#FFB84D] text-white',
        className,
      )}
      role="img"
      aria-label={fallbackLabel}
    >
      {!imageFailed ? (
        <Image
          fill
          src={imageSrc}
          alt=""
          sizes="(max-width: 640px) 40vw, 900px"
          className="object-cover"
          onError={() => {
            if (imageSrc !== defaultImagePath) {
              setImageSrc(defaultImagePath)
              return
            }

            setImageFailed(true)
          }}
        />
      ) : null}

      <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-transparent" />

      <div className="relative mt-auto flex w-full items-end justify-between gap-3 p-3">
        <div className="rounded-full border border-white/35 bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-white shadow-sm backdrop-blur">
          {definition.label}
        </div>

        {imageFailed ? <div className="text-3xl drop-shadow-sm">{definition.emoji}</div> : null}
      </div>
    </div>
  )
}
