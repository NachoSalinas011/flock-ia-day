import { Injectable } from '@nestjs/common';
import { NotebookStatus } from '@prisma/client';
import { EmbeddingsService } from '../embeddings/embeddings.service';
import { PrismaService } from '../prisma/prisma.service';
import { ChunkMeta } from './ingestion/chunker';
import { SourcesRepository } from './sources.repository';

export interface RetrievedChunk {
  id: string;
  content: string;
  meta: ChunkMeta;
  sourceId: string;
  filename: string;
  notebookId: string;
  notebookName: string;
  score: number;
}

/** Semantic search over chunks; used by chat and proposal generation. */
@Injectable()
export class RetrievalService {
  constructor(
    private readonly embeddings: EmbeddingsService,
    private readonly repository: SourcesRepository,
    private readonly prisma: PrismaService,
  ) {}

  async search(
    query: string,
    notebookIds: string[],
    limit = 8,
  ): Promise<RetrievedChunk[]> {
    if (notebookIds.length === 0) return [];
    const embedding = await this.embeddings.embedQuery(query);
    const rows = await this.repository.searchChunks(
      embedding,
      notebookIds,
      limit,
    );
    return rows.map((row) => ({
      ...row,
      meta: (row.meta ?? {}) as ChunkMeta,
      score: Number(row.score),
    }));
  }

  /** Every chunk of a notebook in reading order (for whole-scope tasks like estimating). */
  async allChunks(notebookId: string) {
    const chunks = await this.repository.findChunksByNotebook(notebookId);
    return chunks.map((chunk) => ({
      id: chunk.id,
      content: chunk.content,
      meta: (chunk.meta ?? {}) as ChunkMeta,
      sourceId: chunk.sourceId,
      filename: chunk.source.filename,
    }));
  }

  /** Similarity of each notebook chunk to each text (one map chunkId → score per text). */
  async scoreChunksAgainst(
    texts: string[],
    notebookId: string,
  ): Promise<Map<string, number>[]> {
    const embeddings = await Promise.all(
      texts.map((text) => this.embeddings.embedQuery(text)),
    );
    return Promise.all(
      embeddings.map(async (embedding) => {
        const rows = await this.repository.scoreNotebookChunks(
          embedding,
          notebookId,
        );
        return new Map(rows.map((row) => [row.id, Number(row.score)]));
      }),
    );
  }

  async closedNotebookIds(): Promise<string[]> {
    const notebooks = await this.prisma.notebook.findMany({
      where: { status: NotebookStatus.CLOSED },
      select: { id: true },
    });
    return notebooks.map((n) => n.id);
  }
}
