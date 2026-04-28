import { describe, expect, it } from 'vitest'

import {
  getEventVisualCategory,
  getEventVisualCategoryImagePath,
  normalizeEventVisualCategoryKey,
} from '@/lib/eventVisualCategory'

describe('eventVisualCategory', () => {
  it('uses granular tags before broad text inference', () => {
    const result = getEventVisualCategory({
      title: 'Community sports night',
      tags: ['sports', 'hockey'],
    })

    expect(result.key).toBe('sports')
  })

  it('normalizes visual category aliases', () => {
    expect(normalizeEventVisualCategoryKey('Live Music')).toBe('live-music')
    expect(normalizeEventVisualCategoryKey('DJ / Dance')).toBe('dj-dance')
    expect(normalizeEventVisualCategoryKey('Theater')).toBe('theatre')
  })

  it('infers hockey from Canucks wording', () => {
    const result = getEventVisualCategory({
      title: 'Vancouver Canucks Watch Party',
      description: 'A downtown screening for the NHL playoff game.',
      tags: ['sports'],
    })

    expect(result.key).toBe('sports')
  })

  it('infers hockey when no broad tag overrides it', () => {
    const result = getEventVisualCategory({
      title: 'Vancouver Canucks Watch Party',
      description: 'A downtown screening for the NHL playoff game.',
      tags: [],
    })

    expect(result.key).toBe('hockey')
  })

  it('does not accidentally classify party as art', () => {
    const result = getEventVisualCategory({
      title: 'Late Night Dance Party',
      tags: [],
    })

    expect(result.key).not.toBe('art')
  })

  it('builds image paths from visual category keys', () => {
    expect(getEventVisualCategoryImagePath('basketball')).toBe('/event-defaults/basketball.webp')
  })
})
