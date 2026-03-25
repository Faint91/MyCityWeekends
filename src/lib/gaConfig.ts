export function getGAId(): string | null {
  const id = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim()

  if (!id) return null

  // Ignore obvious placeholder values in local/dev
  if (id === 'G-XXXXXXXXXX') return null

  return id
}
