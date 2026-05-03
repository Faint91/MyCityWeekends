import { cleanString } from './discovery/dedupe'

export function cleanPublishedEventTitle(value: unknown): string | undefined {
  const original = cleanString(value)
  if (!original) return undefined

  const cleaned =
    cleanString(
      original
        // Remove anything after sentence-style double dash separators.
        // Example: "YEBBA -- Jean Tour at Vogue Theatre" -> "YEBBA"
        .replace(/\s*--\s*.*$/u, '')

        // Remove parenthetical/bracket suffixes.
        // Example: "Market Night (free RSVP)" -> "Market Night"
        // Example: "Comedy Show [19+]" -> "Comedy Show"
        .replace(/\s*[\[(].*$/u, '')

        // Normalize whitespace.
        .replace(/\s+/g, ' '),
    ) ?? original

  // Safety: if the cleanup produces something too tiny, keep the original title.
  if (cleaned.length < 3) {
    return original
  }

  return cleaned
}
