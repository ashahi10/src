import { z } from 'zod'
import type { MemoryNodeId } from '@mnemai/shared-types'
import { attachEvidence } from '../graph/evidence.js'
import { getNode } from '../graph/node.js'

export const attachEvidenceSchema = z.object({
  nodeId: z.string().describe('Node ID to attach evidence to'),
  evidenceRefs: z.array(z.object({
    type: z.enum(['transcript', 'tool_result', 'verification', 'code_anchor', 'decision_record', 'external']),
    uri: z.string(),
    label: z.string().optional(),
    timestamp: z.number().int().optional(),
  })).min(1).describe('Evidence references to attach'),
})

export function handleAttachEvidence(args: z.infer<typeof attachEvidenceSchema>) {
  const node = getNode(args.nodeId as MemoryNodeId)
  if (!node) {
    return {
      content: [{ type: 'text' as const, text: `Error: node ${args.nodeId} not found` }],
      isError: true,
    }
  }

  const allEvidence = attachEvidence(args.nodeId as MemoryNodeId, args.evidenceRefs)

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify({
          nodeId: args.nodeId,
          totalEvidenceCount: allEvidence.length,
          attached: args.evidenceRefs.length,
          evidence: allEvidence,
        }, null, 2),
      },
    ],
  }
}
