'use client'

const KEY = 'mycityweekends:saved_slugs'

function read(): string[] {
  try {
    const raw = localStorage.getItem(KEY)
    const arr = raw ? JSON.parse(raw) : []
    return Array.isArray(arr) ? arr.filter(Boolean) : []
  } catch {
    return []
  }
}

function write(slugs: string[]) {
  localStorage.setItem(KEY, JSON.stringify(slugs))
}

export function getSavedSlugs(): string[] {
  return read()
}

export function isSaved(slug: string): boolean {
  return read().includes(slug)
}

export function saveSlug(slug: string) {
  const current = read()
  if (current.includes(slug)) return
  write([slug, ...current]) // newest first
}

export function removeSlug(slug: string) {
  const current = read().filter((s) => s !== slug)
  write(current)
}

export function toggleSaved(slug: string): boolean {
  const current = read()
  if (current.includes(slug)) {
    write(current.filter((s) => s !== slug))
    return false
  }
  write([slug, ...current])
  return true
}
