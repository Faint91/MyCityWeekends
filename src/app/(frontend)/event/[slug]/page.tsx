import React from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import type { Event, Media as MediaDoc } from '@/payload-types'
import { getPayloadClient } from '@/lib/payload'
import { formatPrice, formatWhen, getVenueName } from '@/lib/weekendDrop'
import { ShareButton } from '@/components/ShareButton'
import { SaveToggleButton } from '@/components/SaveToggleButton'
import { mergeOpenGraph } from '@/utilities/mergeOpenGraph'
import { Media } from '@/components/Media'
import { getServerSideURL } from '@/utilities/getURL'
import { MapPin } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ back?: string | string[] }>
}

function getEventImage(event: Event): MediaDoc | null {
  if (!event.image || typeof event.image !== 'object') return null
  return event.image
}

function getEventImageUrl(event: Event): string | null {
  const image = getEventImage(event)
  if (!image) return null

  return image.sizes?.square?.url ?? image.url ?? null
}

function getEventLongDescription(event: Event): string | null {
  if (typeof event.description !== 'string') return null

  const cleaned = event.description.trim()
  return cleaned.length ? cleaned : null
}

function getEventGoogleMapsUrl(event: Event): string | null {
  if (!event.venue || typeof event.venue !== 'object') return null
  if (typeof event.venue.googleMapsUrl !== 'string') return null

  const cleaned = event.venue.googleMapsUrl.trim()
  return cleaned.length ? cleaned : null
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function truncateForMeta(value: string, max = 160): string {
  if (value.length <= max) return value
  return `${value.slice(0, max - 1).trimEnd()}…`
}

function buildEventDescription(event: Event): string {
  const longDescription = getEventLongDescription(event)

  if (longDescription) {
    return truncateForMeta(normalizeWhitespace(longDescription))
  }

  const when = formatWhen(event.startAt)
  const venueName = getVenueName(event)
  const where = venueName ?? event.neighborhood ?? null
  const price = formatPrice(event)

  const parts = [
    event.title ? `${event.title} in Vancouver` : 'Budget-friendly Vancouver event',
    when ? `on ${when}` : null,
    where ? `at ${where}` : null,
    price ? `${price}.` : null,
    'Curated by MyCityWeekends.',
  ].filter(Boolean)

  return parts.join(' ')
}

function toAbsoluteUrl(url?: string | null): string | null {
  if (!url) return null
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return `${getServerSideURL()}${url.startsWith('/') ? url : `/${url}`}`
}

function cleanObject<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined && value !== null),
  ) as T
}

function buildEventLocation(event: Event): Record<string, unknown> | null {
  if (event.venue && typeof event.venue === 'object') {
    const venueName = event.venue.name ?? event.neighborhood ?? 'Vancouver'
    const neighborhood = event.venue.neighborhood ?? event.neighborhood ?? undefined

    return cleanObject({
      '@type': 'Place',
      name: venueName,
      address: cleanObject({
        '@type': 'PostalAddress',
        addressLocality: neighborhood ?? 'Vancouver',
        addressRegion: 'BC',
        addressCountry: 'CA',
      }),
    })
  }

  if (event.neighborhood) {
    return {
      '@type': 'Place',
      name: event.neighborhood,
      address: {
        '@type': 'PostalAddress',
        addressLocality: event.neighborhood,
        addressRegion: 'BC',
        addressCountry: 'CA',
      },
    }
  }

  return {
    '@type': 'Place',
    name: 'Vancouver',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Vancouver',
      addressRegion: 'BC',
      addressCountry: 'CA',
    },
  }
}

function buildEventOffers(event: Event, officialUrl?: string): Record<string, unknown> | null {
  const url = toAbsoluteUrl(officialUrl)
  const currency = event.currency ?? 'CAD'

  if (event.isFree) {
    return cleanObject({
      '@type': 'Offer',
      price: 0,
      priceCurrency: currency,
      url,
    })
  }

  const min = event.priceMin
  const max = event.priceMax

  if (typeof min === 'number' && typeof max === 'number' && min !== max) {
    return cleanObject({
      '@type': 'AggregateOffer',
      lowPrice: min,
      highPrice: max,
      priceCurrency: currency,
      url,
    })
  }

  if (typeof min === 'number') {
    return cleanObject({
      '@type': 'Offer',
      price: min,
      priceCurrency: currency,
      url,
    })
  }

  if (typeof max === 'number') {
    return cleanObject({
      '@type': 'Offer',
      price: max,
      priceCurrency: currency,
      url,
    })
  }

  if (url) {
    return cleanObject({
      '@type': 'Offer',
      url,
      priceCurrency: currency,
    })
  }

  return null
}

function buildEventStructuredData(event: Event, slug: string): Record<string, unknown> {
  const pageUrl = `${getServerSideURL()}/event/${slug}`
  const officialUrl = event.ticketUrl ?? event.sourceUrl ?? undefined
  const imageUrl = toAbsoluteUrl(getEventImageUrl(event))

  return cleanObject({
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title ?? 'Event',
    description: getEventLongDescription(event) ?? buildEventDescription(event),
    startDate: event.startAt ?? undefined,
    endDate: event.endAt ?? undefined,
    url: pageUrl,
    image: imageUrl ? [imageUrl] : undefined,
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: buildEventLocation(event),
    offers: buildEventOffers(event, officialUrl),
    isAccessibleForFree: event.isFree ?? undefined,
    organizer: {
      '@type': 'Organization',
      name: 'MyCityWeekends',
      url: getServerSideURL(),
    },
  })
}

function sanitizeBackHref(value: string | string[] | undefined): string | null {
  const raw = Array.isArray(value) ? value[0] : value
  if (!raw) return null

  if (!raw.startsWith('/')) return null
  if (raw.startsWith('//')) return null

  const allowedPrefixes = ['/', '/free', '/under-15', '/saved', '/search']

  const isAllowed = allowedPrefixes.some((prefix) => {
    if (prefix === '/') {
      return raw === '/' || raw.startsWith('/?')
    }

    return raw === prefix || raw.startsWith(`${prefix}?`)
  })

  return isAllowed ? raw : null
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
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

  const event = res.docs?.[0] as Event | undefined

  if (!event) {
    return {
      title: 'Event not found | MyCityWeekends',
      description: 'This event could not be found on MyCityWeekends.',
      robots: {
        index: false,
        follow: false,
      },
    }
  }

  const title = `${event.title ?? 'Event'} | MyCityWeekends`
  const description = buildEventDescription(event)
  const imageUrl = getEventImageUrl(event)

  return {
    title,
    description,
    alternates: {
      canonical: `/event/${slug}`,
    },
    openGraph: mergeOpenGraph({
      title,
      description,
      url: `/event/${slug}`,
      type: 'article',
      images: imageUrl
        ? [
            {
              url: imageUrl,
              alt: event.title ?? 'Event image',
            },
          ]
        : undefined,
    }),
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: imageUrl ? [imageUrl] : undefined,
    },
  }
}

export default async function Page({ params, searchParams }: Props) {
  const { slug } = await params
  const { back } = await searchParams
  const backHref = sanitizeBackHref(back) ?? '/'
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

  const event = res.docs?.[0] as Event | undefined
  if (!event) return notFound()

  const price = formatPrice(event)
  const when = formatWhen(event.startAt)
  const venueName = getVenueName(event)
  const where = venueName ?? event.neighborhood ?? null
  const officialUrl = (event.ticketUrl ?? event.sourceUrl) as string | undefined
  const googleMapsUrl = getEventGoogleMapsUrl(event)
  const structuredData = buildEventStructuredData(event, slug)
  const eventImage = getEventImage(event)
  const longDescription = getEventLongDescription(event)

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <div className="pt-6 md:pt-8 pb-24">
        <div className="container space-y-6">
          <header className="space-y-3">
            <Link
              href={backHref}
              className="inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/10"
            >
              ← Back
            </Link>
            <h1 className="text-2xl font-semibold">{event.title ?? 'Untitled event'}</h1>
            <div className="flex flex-wrap items-center gap-2">
              {price ? (
                <span className="rounded-full border px-3 py-1 text-sm font-medium">{price}</span>
              ) : null}
              {when ? (
                <span className="text-sm text-black/70 dark:text-white/70">{when}</span>
              ) : null}
              {where ? (
                <span className="text-sm text-black/70 dark:text-white/70">{where}</span>
              ) : null}
            </div>
          </header>

          {eventImage ? (
            <div className="overflow-hidden rounded-2xl border">
              <Media
                className="w-full"
                priority
                resource={eventImage}
                imgClassName="h-auto w-full"
                size="(max-width: 768px) 100vw, 900px"
              />
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <ShareButton />
            {event.slug ? <SaveToggleButton slug={event.slug} /> : null}

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

            {googleMapsUrl ? (
              <a
                className="inline-flex items-center justify-center rounded-full border px-3 py-2"
                href={googleMapsUrl}
                target="_blank"
                rel="noreferrer"
                aria-label="Open in Google Maps"
                title="Open in Google Maps"
              >
                <MapPin className="h-4 w-4" />
              </a>
            ) : null}
          </div>

          {longDescription ? (
            <section className="space-y-2">
              <h2 className="text-lg font-semibold">About this event</h2>
              <p className="whitespace-pre-line text-sm leading-7 text-black/80 dark:text-white/80">
                {longDescription}
              </p>
            </section>
          ) : null}

          {Array.isArray(event.tags) && event.tags.length ? (
            <div className="flex flex-wrap gap-2">
              {event.tags.map((t: string) => (
                <span
                  key={t}
                  className="rounded-full bg-black/5 px-3 py-1 text-xs dark:bg-white/10"
                >
                  {t}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </>
  )
}
