'use client'

const KEY = 'mycityweekends:saved_slugs'
const EVENT = 'mycityweekends:saved-changed'

function read(): string[] {
  try {
    const raw = localStorage.getItem(KEY)
    const arr = raw ? JSON.parse(raw) : []
    return Array.isArray(arr) ? arr.filter(Boolean) : []
  } catch {
    return []
  }
}

function emit(slugs: string[]) {
  window.dispatchEvent(
    new CustomEvent<string[]>(EVENT, {
      detail: slugs,
    }),
  )
}

function write(slugs: string[]) {
  localStorage.setItem(KEY, JSON.stringify(slugs))
  emit(slugs)
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

export function replaceSavedSlugs(slugs: string[]) {
  const unique = Array.from(new Set(slugs.filter(Boolean)))
  write(unique)
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

export function subscribeToSavedSlugs(onChange: (slugs: string[]) => void) {
  const handleStorage = (e: StorageEvent) => {
    if (e.key === KEY) onChange(read())
  }

  const handleCustom = (e: Event) => {
    const custom = e as CustomEvent<string[]>
    onChange(Array.isArray(custom.detail) ? custom.detail : read())
  }

  window.addEventListener('storage', handleStorage)
  window.addEventListener(EVENT, handleCustom)

  return () => {
    window.removeEventListener('storage', handleStorage)
    window.removeEventListener(EVENT, handleCustom)
  }
}
