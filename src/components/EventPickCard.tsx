'use client'

import React from 'react'
import Link from 'next/link'
import { trackEvent } from '@/lib/ga'
import { SaveToggleButton } from '@/components/SaveToggleButton'

type Props = {
  rank?: number | null
  title: string
  when?: string | null
  where?: string | null
  price: string
  whyWorthIt?: string | null
  detailsUrl?: string | null
  internalHref?: string | null
  saveSlug?: string | null
}

export function EventPickCard({
  rank,
  title,
  when,
  where,
  price,
  whyWorthIt,
  detailsUrl,
  internalHref,
  saveSlug,
}: Props) {
  return (
    <article className="rounded-xl border p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          {typeof rank === 'number' ? (
            <div className="text-sm text-black/60 dark:text-white/60">#{rank}</div>
          ) : null}

          {internalHref ? (
            <h3 className="truncate text-base font-semibold">
              <Link className="underline underline-offset-2" href={internalHref}>
                {title}
              </Link>
            </h3>
          ) : (
            <h3 className="truncate text-base font-semibold">{title}</h3>
          )}

          {when || where ? (
            <div className="text-sm text-black/70 dark:text-white/70">
              {when ? <span>{when}</span> : null}
              {when && where ? ' • ' : null}
              {where ? <span>{where}</span> : null}
            </div>
          ) : null}

          {whyWorthIt ? <p className="text-sm">{whyWorthIt}</p> : null}
        </div>

        <div className="shrink-0 rounded-full border px-3 py-1 text-sm font-medium">{price}</div>
      </div>

      <div className="mt-3 flex flex-wrap gap-3">
        {saveSlug ? <SaveToggleButton slug={saveSlug} /> : null}
        {internalHref ? (
          <Link
            href={internalHref}
            className="rounded-full border px-4 py-2 text-sm font-medium"
            onClick={() => trackEvent('open_event_page', { href: internalHref })}
          >
            Open event page
          </Link>
        ) : null}

        {detailsUrl ? (
          <a
            className="rounded-full border px-4 py-2 text-sm font-medium underline"
            href={detailsUrl}
            target="_blank"
            rel="noreferrer"
            onClick={() => trackEvent('official_link_click', { href: detailsUrl })}
          >
            Official link
          </a>
        ) : null}
      </div>
    </article>
  )
}
