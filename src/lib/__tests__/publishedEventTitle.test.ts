import { describe, expect, it } from 'vitest'

import { cleanPublishedEventTitle } from '../publishedEventTitle'

describe('cleanPublishedEventTitle', () => {
  it('removes text after a double dash separator', () => {
    expect(cleanPublishedEventTitle('YEBBA -- Jean Tour at Vogue Theatre')).toBe('YEBBA')
  })

  it('removes parenthetical suffixes', () => {
    expect(cleanPublishedEventTitle("Jane's Walk Vancouver Festival (official schedule)")).toBe(
      "Jane's Walk Vancouver Festival",
    )
  })

  it('removes bracket suffixes', () => {
    expect(cleanPublishedEventTitle('Vancouver Market [free RSVP]')).toBe('Vancouver Market')
  })

  it('keeps normal titles unchanged', () => {
    expect(cleanPublishedEventTitle('Sunset Food Truck Social')).toBe('Sunset Food Truck Social')
  })

  it('falls back to the original title if cleanup would be too short', () => {
    expect(cleanPublishedEventTitle('A -- Extra details')).toBe('A -- Extra details')
  })
})
