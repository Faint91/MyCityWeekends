import React from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPayloadClient } from '@/lib/payload'
import { formatPrice, formatWhen, getVenueName } from '@/lib/weekendDrop'
import { ShareButton } from '@/components/ShareButton'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const payload = await getPayloadClient()

  const res = await payload.find({
    collection: 'events',
    where: {
      and: [{ slug: { equals: slug } }, { _status: { equals: 'published' } }],
    },
    limit: 1,
    depth: 2,
    overrideAccess: true,
    draft: false,
  })

  const event = res.docs?.[0] as any
  if (!event) {
    return { title: 'Event not found — MyCityWeekends' }
  }

  return {
    title: `${event.title ?? 'Event'} — MyCityWeekends`,
    description: `Budget weekend pick in Vancouver: ${event.title ?? 'Event'}`,
  }
}

export default async function Page({ params }: Props) {
  const { slug } = await params
  const payload = await getPayloadClient()

  const res = await payload.find({
    collection: 'events',
    where: {
      and: [{ slug: { equals: slug } }, { _status: { equals: 'published' } }],
    },
    limit: 1,
    depth: 5,
    overrideAccess: true,
    draft: false,
  })

  const event = res.docs?.[0] as any
  if (!event) return notFound()

  const price = formatPrice(event)
  const when = formatWhen(event.startAt)
  const venueName = getVenueName(event)
  const where = venueName ?? event.neighborhood ?? null
  const officialUrl = (event.ticketUrl ?? event.sourceUrl) as string | undefined

  return (
    <div className="pt-24">
      <div className="container space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">{event.title ?? 'Untitled event'}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border px-3 py-1 text-sm font-medium">{price}</span>
            {when ? <span className="text-sm text-black/70 dark:text-white/70">{when}</span> : null}
            {where ? (
              <span className="text-sm text-black/70 dark:text-white/70">• {where}</span>
            ) : null}
          </div>
        </header>

        <div className="flex flex-wrap gap-3">
          <ShareButton />
          {officialUrl ? (
            <a
              className="rounded-full border px-4 py-2 text-sm font-medium underline"
              href={officialUrl}
              target="_blank"
              rel="noreferrer"
            >
              Official link
            </a>
          ) : null}
        </div>

        {Array.isArray(event.tags) && event.tags.length ? (
          <div className="flex flex-wrap gap-2">
            {event.tags.map((t: string) => (
              <span key={t} className="rounded-full bg-black/5 px-3 py-1 text-xs dark:bg-white/10">
                {t}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}
