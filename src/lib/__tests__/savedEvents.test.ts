import { describe, it, expect, beforeEach } from 'vitest'
import { getSavedSlugs, saveSlug, removeSlug, toggleSaved } from '../savedEvents'

beforeEach(() => {
  localStorage.clear()
})

describe('savedEvents', () => {
  it('saves and removes slugs', () => {
    saveSlug('a')
    saveSlug('b')
    expect(getSavedSlugs()).toEqual(['b', 'a'])

    removeSlug('b')
    expect(getSavedSlugs()).toEqual(['a'])
  })

  it('toggles', () => {
    expect(toggleSaved('x')).toBe(true)
    expect(getSavedSlugs()).toEqual(['x'])
    expect(toggleSaved('x')).toBe(false)
    expect(getSavedSlugs()).toEqual([])
  })
})
