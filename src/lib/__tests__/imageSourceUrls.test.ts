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

  it('normalizes Google Sites image URLs without file extensions', () => {
    const result = normalizeRemoteImageUrl(
      'https://lh3.googleusercontent.com/sitesv/example-image-token%3Dw1280',
    )

    expect(result).toBe('https://lh3.googleusercontent.com/sitesv/example-image-token%3Dw1280')
  })

  it('extracts Google Sites img tags from official event pages', () => {
    const html = `
      <html>
        <body>
          <img alt="Jane's Walk Vancouver logo" src="https://example.com/logo.png" />
          <h1>2026 Walk Schedule</h1>
          <section>
            <img
              alt="Jane's Walk Vancouver Festival kickoff walk"
              src="https://lh3.googleusercontent.com/sitesv/janes-walk-photo%3Dw1280"
            />
            <h2>Jane's Walk Vancouver Festival — citizen-led neighbourhood walks</h2>
          </section>
        </body>
      </html>
    `

    expect(
      extractImageUrlsFromHtml(html, 'https://www.janeswalkvancouver.ca/2026-walk-schedule', {
        eventTitle: "Jane's Walk Vancouver Festival — citizen-led neighbourhood walks",
      })[0],
    ).toBe('https://lh3.googleusercontent.com/sitesv/janes-walk-photo%3Dw1280')
  })

  it('prefers an image near the event title over a generic page image', () => {
    const html = `
      <html>
        <body>
          <img alt="Generic venue image" src="https://cdn.example.com/images/generic-venue.jpg" />

          <section>
            <h2>Vancouver Canucks Watch Party</h2>
            <img alt="Canucks watch party crowd" src="https://cdn.example.com/images/canucks-watch-party.jpg" />
          </section>
        </body>
      </html>
    `

    expect(
      extractImageUrlsFromHtml(html, 'https://example.com/events', {
        eventTitle: 'Vancouver Canucks Watch Party',
      })[0],
    ).toBe('https://cdn.example.com/images/canucks-watch-party.jpg')
  })

  it('extracts Ticketmaster-style image URLs embedded in script data', () => {
    const html = `
      <html>
        <body>
          <script>
            window.__EVENT_DATA__ = {
              "title": "YEBBA",
              "heroImage": "https:\\/\\/s1.ticketm.net\\/dam\\/a\\/abc\\/yebba_TABLET_LANDSCAPE_16_9.jpg"
            }
          </script>
        </body>
      </html>
    `

    expect(
      extractImageUrlsFromHtml(
        html,
        'https://www.ticketmaster.ca/yebba-jean-tour-vancouver-british-columbia-05-01-2026/event/11006462CBD3976D',
        {
          eventTitle: 'YEBBA',
        },
      )[0],
    ).toBe('https://s1.ticketm.net/dam/a/abc/yebba_TABLET_LANDSCAPE_16_9.jpg')
  })
})
