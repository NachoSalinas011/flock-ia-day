import { ChunkMeta } from './ingestion/chunker';

/** Human-readable location of a chunk inside its source, for citations. */
export function formatChunkLocation(meta: ChunkMeta): string {
  return [
    meta.page ? `pág. ${meta.page}` : null,
    meta.timestamp ? `min ${meta.timestamp}` : null,
    meta.heading ?? null,
  ]
    .filter(Boolean)
    .join(' · ');
}
