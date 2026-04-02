import type { MemoryNodeId } from '@mnemai/shared-types'

export type QueryRetrievalBudget = {
  /** At or below this node count, load the full graph (simplest recall). */
  fullScanMaxNodes: number
  /** Minimum cap for index hits; effective cap is max(this, limit * 25). */
  indexCandidateCapFloor: number
  /** Union this many most-recent nodes (after filters) to hedge index skew / hot edits. */
  recentSeedSize: number
}

function parseNonNegativeInt(raw: string | undefined, fallback: number): number {
  if (raw == null || raw === '') return fallback
  const n = Number.parseInt(raw, 10)
  if (!Number.isFinite(n) || n < 0) return fallback
  return n
}

/** `TENGU_MEMORY_QUERY_FULL_SCAN_MAX_NODES=0` means always use smart path when index has hits (tests only). */
export function parseQueryRetrievalBudget(): QueryRetrievalBudget {
  return {
    fullScanMaxNodes: parseNonNegativeInt(process.env.TENGU_MEMORY_QUERY_FULL_SCAN_MAX_NODES, 1600),
    indexCandidateCapFloor: Math.max(1, parseNonNegativeInt(process.env.TENGU_MEMORY_QUERY_INDEX_CANDIDATE_CAP, 600)),
    recentSeedSize: parseNonNegativeInt(process.env.TENGU_MEMORY_QUERY_RECENT_SEED, 200),
  }
}

export function effectiveIndexHitCap(limit: number, capFloor: number): number {
  return Math.max(capFloor, limit * 25)
}

/**
 * When index hits exceed `cap`, keep the strongest BM25 ids only.
 */
export function selectIndexHitNodeIds(rawScores: Map<string, number>, cap: number): MemoryNodeId[] {
  if (rawScores.size <= cap) {
    return [...rawScores.keys()] as MemoryNodeId[]
  }
  return [...rawScores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, cap)
    .map(([id]) => id as MemoryNodeId)
}

export function mergeCandidateNodeIds(indexIds: MemoryNodeId[], recentIds: MemoryNodeId[]): MemoryNodeId[] {
  const seen = new Set<string>()
  const out: MemoryNodeId[] = []
  for (const id of indexIds) {
    const k = String(id)
    if (seen.has(k)) continue
    seen.add(k)
    out.push(id)
  }
  for (const id of recentIds) {
    const k = String(id)
    if (seen.has(k)) continue
    seen.add(k)
    out.push(id)
  }
  return out
}
