import { describe, expect, it } from 'vitest'

import { extractImageUrlsFromHtml, normalizeRemoteImageUrl } from '@/lib/imageSourceUrls'

describe('imageSourceUrls', () => {
  it('normalizes Next image proxy URLs', () => {
    const result = normalizeRemoteImageUrl(
      'https://example.com/_next/image?url=https%3A%2F%2Fcdn.example.com%2Fevents%2Fposter.jpg&w=1200&q=75',
    )

    expect(result).toBe('https://cdn.example.com/events/poster.jpg')
  })

  it('extracts og image secure URLs', () => {
    const html = `
      <html>
        <head>
          <meta property="og:image:secure_url" content="/images/event-poster.webp" />
        </head>
      </html>
    `

    expect(extractImageUrlsFromHtml(html, 'https://example.com/events/test')).toEqual([
      'https://example.com/images/event-poster.webp',
    ])
  })

  it('extracts JSON-LD image arrays', () => {
    const html = `
      <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@type": "Event",
          "name": "Test Event",
          "image": [
            "https://cdn.example.com/uploads/test-event-1.jpg",
            "https://cdn.example.com/uploads/test-event-2.jpg"
          ]
        }
      </script>
    `

    expect(extractImageUrlsFromHtml(html, 'https://example.com/events/test')).toEqual([
      'https://cdn.example.com/uploads/test-event-1.jpg',
      'https://cdn.example.com/uploads/test-event-2.jpg',
    ])
  })

  it('rejects obvious logos and favicons', () => {
    const html = `
      <meta property="og:image" content="https://example.com/logo.png" />
      <meta name="twitter:image" content="https://example.com/events/real-poster.jpg" />
    `

    expect(extractImageUrlsFromHtml(html, 'https://example.com/events/test')).toEqual([
      'https://example.com/events/real-poster.jpg',
    ])
  })

  it('extracts high-confidence img tags', () => {
    const html = `
      <img alt="Venue logo" src="/logo.png" />
      <img alt="Event poster" src="/uploads/comedy-night-poster.jpg" />
    `

    expect(extractImageUrlsFromHtml(html, 'https://example.com/events/test')).toEqual([
      'https://example.com/uploads/comedy-night-poster.jpg',
    ])
  })
})
