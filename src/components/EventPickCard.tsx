'use client'

import React from 'react'
import Link from 'next/link'
import type { Media as MediaDoc } from '@/payload-types'
import { trackEvent } from '@/lib/ga'
import { SaveToggleButton } from '@/components/SaveToggleButton'
import { Media } from '@/components/Media'
import { EventFallbackImage } from '@/components/EventFallbackImage'

type Props = {
  rank?: number | null
  title: string
  when?: string | null
  where?: string | null
  price: string | null
  whyWorthIt?: string | null
  internalHref?: string | null
  saveSlug?: string | null
  image?: MediaDoc | null
  backHref?: string | null
  description?: string | null
  tags?: string[] | null
  venueName?: string | null
}

export function EventPickCard({
  rank: _rank,
  title,
  when,
  where,
  price,
  whyWorthIt,
  internalHref,
  saveSlug,
  image,
  backHref,
  description,
  tags,
  venueName,
}: Props) {
  const eventHref =
    internalHref && backHref
      ? `${internalHref}${internalHref.includes('?') ? '&' : '?'}back=${encodeURIComponent(backHref)}`
      : internalHref

  const imageContent = image ? (
    <Media
      htmlElement={null}
      fill
      resource={image}
      imgClassName="object-cover"
      size="(max-width: 640px) 32vw, 220px"
    />
  ) : (
    <EventFallbackImage
      title={title}
      description={description ?? whyWorthIt ?? null}
      venueName={venueName ?? where ?? null}
      neighborhood={where ?? null}
      tags={tags}
    />
  )

  return (
    <article className="mcw-card-surface rounded-2xl border p-4 text-slate-900 md:p-5">
      <div className="flex items-stretch gap-3">
        {eventHref ? (
          <Link
            href={eventHref}
            aria-label={`Open ${title}`}
            className="relative -ml-1 -my-1 w-[36%] min-w-[132px] shrink-0 self-stretch overflow-hidden rounded-2xl border border-slate-200 bg-white min-h-[168px] sm:w-[35%] sm:min-h-[184px]"
            onClick={() => trackEvent('open_event_page', { href: eventHref, source: 'card_image' })}
          >
            {imageContent}
          </Link>
        ) : (
          <div className="relative -ml-1 -my-1 w-[36%] min-w-[132px] shrink-0 self-stretch overflow-hidden rounded-2xl border border-slate-200 bg-white min-h-[168px] sm:w-[35%] sm:min-h-[184px]">
            {imageContent}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="min-w-0 space-y-1">
            {price ? (
              <div className="flex justify-end">
                <div className="shrink-0 rounded-full border border-slate-300 bg-white/80 px-3 py-1 text-sm font-medium text-slate-800">
                  {price}
                </div>
              </div>
            ) : null}

            <div className="min-w-0">
              {eventHref ? (
                <h3 className="truncate text-base font-semibold text-slate-950">
                  <Link
                    className="underline underline-offset-2 decoration-slate-300"
                    href={eventHref}
                  >
                    {title}
                  </Link>
                </h3>
              ) : (
                <h3 className="truncate text-base font-semibold text-slate-950">{title}</h3>
              )}
            </div>

            {when || where ? (
              <div className="truncate whitespace-nowrap text-sm text-slate-600">
                {when ? <span>{when}</span> : null}
                {when && where ? ' ' : null}
                {where ? <span>{where}</span> : null}
              </div>
            ) : null}

            {whyWorthIt ? (
              <p className="text-[15px] leading-6 text-slate-800">{whyWorthIt}</p>
            ) : null}
          </div>

          <div className="mt-3 flex items-center justify-center gap-3">
            {saveSlug ? <SaveToggleButton slug={saveSlug} /> : null}

            {eventHref ? (
              <Link
                href={eventHref}
                aria-label="Event details"
                className="whitespace-nowrap rounded-full border border-[#007AFF] bg-[#007AFF] px-3 py-1.5 text-sm font-medium text-white transition hover:border-[#0066D6] hover:bg-[#0066D6]"
                onClick={() =>
                  trackEvent('open_event_page', { href: eventHref, source: 'card_button' })
                }
              >
                <span className="max-[376px]:hidden">Event details</span>
                <span className="hidden max-[376px]:inline">Details</span>
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  )
}
