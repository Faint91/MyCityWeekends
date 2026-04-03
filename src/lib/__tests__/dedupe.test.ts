import { describe, expect, it } from 'vitest'
import {
  areLikelyDuplicateEvents,
  areTitlesLikelyDuplicate,
  buildDuplicateFingerprint,
  getLocalDateKey,
} from '../discovery/dedupe'

describe('discovery dedupe helpers', () => {
  it('treats same-day same-venue similar titles as duplicates', () => {
    expect(
      areLikelyDuplicateEvents(
        {
          title: 'Farmers Market — Opening Day',
          startAt: '2026-05-09T18:00:00.000Z',
          venueName: 'Downtown Plaza',
          venueAddress: '123 Main St, Vancouver, BC',
          sourceUrl: 'https://example.com/a',
        },
        {
          title: 'Summer Market - Summer Opening',
          startAt: '2026-05-09T20:00:00.000Z',
          venueName: 'Downtown Plaza',
          venueAddress: '123 Main Street, Vancouver, BC',
          ticketUrl: 'https://example.com/b',
        },
      ),
    ).toBe(true)
  })

  it('does not collapse unrelated events at different venues', () => {
    expect(
      areLikelyDuplicateEvents(
        {
          title: 'Jazz Night',
          startAt: '2026-05-09T18:00:00.000Z',
          venueName: 'Venue A',
          venueAddress: '123 Main St, Vancouver, BC',
        },
        {
          title: 'Jazz Night',
          startAt: '2026-05-09T18:30:00.000Z',
          venueName: 'Venue B',
          venueAddress: '999 Granville St, Vancouver, BC',
        },
      ),
    ).toBe(false)
  })

  it('builds the same fingerprint when only the source url differs', () => {
    const first = buildDuplicateFingerprint({
      title: 'Sunset Food Truck Social',
      startAt: '2026-05-09T18:00:00.000Z',
      venueName: 'Canada Place',
      sourceUrl: 'https://example.com/one',
    })

    const second = buildDuplicateFingerprint({
      title: 'Sunset Food Truck Social',
      startAt: '2026-05-09T18:00:00.000Z',
      venueName: 'Canada Place',
      sourceUrl: 'https://example.com/two',
    })

    expect(first).toBe(second)
  })

  it('uses the Vancouver local day for duplicate checks', () => {
    expect(getLocalDateKey('2026-05-09T06:30:00.000Z')).toBe('2026-05-08')
  })

  it('flags strongly overlapping titles as likely duplicates', () => {
    expect(areTitlesLikelyDuplicate('Indie Comedy Basement Night', 'Comedy Basement Night')).toBe(
      true,
    )
  })
})
