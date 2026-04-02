import { z } from 'zod'
import type { MemoryNodeId } from '@mnemai/shared-types'
import { getDb } from '../graph/store.js'
import { getNode } from '../graph/node.js'
import { embedText, isEmbeddingsConfigured, upsertNodeEmbedding, embeddingsTableExists } from '../retrieval/embedding.js'

export const embedNodeSchema = z.object({
  nodeId: z.string().min(1).describe('Node whose content + tags will be embedded and stored'),
})

export async function handleEmbedNode(args: z.infer<typeof embedNodeSchema>) {
  if (!isEmbeddingsConfigured()) {
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            error: 'embeddings_not_configured',
            hint: 'Set TENGU_MEMORY_EMBED_URL (OpenAI-compatible embeddings endpoint), TENGU_MEMORY_EMBED_KEY, and optionally TENGU_MEMORY_EMBED_MODEL.',
          }, null, 2),
        },
      ],
      isError: true,
    }
  }

  const node = getNode(args.nodeId as MemoryNodeId)
  if (!node) {
    return {
      content: [{ type: 'text' as const, text: `Error: node ${args.nodeId} not found` }],
      isError: true,
    }
  }

  const db = getDb()
  if (!embeddingsTableExists(db)) {
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({ error: 'embeddings_table_missing', hint: 'Re-open DB to run migrations.' }, null, 2),
        },
      ],
      isError: true,
    }
  }

  const text = `${node.content}\n${node.tags.join(' ')}`.slice(0, 8000)
  try {
    const vec = await embedText(text)
    if (!vec) {
      return {
        content: [{ type: 'text' as const, text: JSON.stringify({ error: 'empty_embedding_response' }, null, 2) }],
        isError: true,
      }
    }
    const dims = vec.length
    upsertNodeEmbedding(db, node.nodeId, vec)
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({ nodeId: node.nodeId, dims, ok: true }, null, 2),
        },
      ],
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return {
      content: [{ type: 'text' as const, text: JSON.stringify({ error: 'embed_failed', message }, null, 2) }],
      isError: true,
    }
  }
}