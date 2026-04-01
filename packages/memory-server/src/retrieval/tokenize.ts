/** Minimal English stopwords — keeps the portable index small and noisy-term free. */
const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'as', 'by', 'is', 'it', 'be',
  'we', 'you', 'they', 'this', 'that', 'with', 'from', 'are', 'was', 'were', 'has', 'have', 'had', 'not',
])

const MAX_TOKENS_PER_FIELD = 256

function normalizeWord(raw: string): string | null {
  const w = raw.toLowerCase().replace(/[^a-z0-9_]/g, '')
  if (w.length < 2 || STOPWORDS.has(w)) return null
  return w
}

/**
 * Token frequencies for indexing (word -> count in field).
 */
export function tokenFrequenciesFromText(text: string): Map<string, number> {
  const out = new Map<string, number>()
  const words = text.toLowerCase().split(/[\s/.,;:!?()[\]{}'"`]+/g)
  let added = 0
  for (const raw of words) {
    const w = normalizeWord(raw)
    if (!w) continue
    out.set(w, (out.get(w) ?? 0) + 1)
    added++
    if (added >= MAX_TOKENS_PER_FIELD) break
  }
  return out
}

export function mergeTokenMaps(a: Map<string, number>, b: Map<string, number>): Map<string, number> {
  const out = new Map(a)
  for (const [k, v] of b) {
    out.set(k, (out.get(k) ?? 0) + v)
  }
  return out
}

export function queryTermsFromString(query: string): string[] {
  const freq = tokenFrequenciesFromText(query)
  return [...freq.keys()]
}
