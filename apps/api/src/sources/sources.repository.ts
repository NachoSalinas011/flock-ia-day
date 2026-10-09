import { Injectable } from '@nestjs/common';
import { Prisma, SourceStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TextChunk } from './ingestion/chunker';

export interface ChunkSearchRow {
  id: string;
  content: string;
  meta: Prisma.JsonValue;
  sourceId: string;
  filename: string;
  notebookId: string;
  notebookName: string;
  score: number;
}

const toVectorLiteral = (vector: number[]) => `[${vector.join(',')}]`;

@Injectable()
export class SourcesRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.SourceUncheckedCreateInput) {
    return this.prisma.source.create({ data });
  }

  findByNotebook(notebookId: string) {
    return this.prisma.source.findMany({
      where: { notebookId },
      include: { _count: { select: { chunks: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  findById(id: string) {
    return this.prisma.source.findUnique({
      where: { id },
      include: { _count: { select: { chunks: true } } },
    });
  }

  updateStatus(
    id: string,
    status: SourceStatus,
    extra: { rawText?: string; errorMessage?: string | null } = {},
  ) {
    return this.prisma.source.update({
      where: { id },
      data: { status, ...extra },
    });
  }

  delete(id: string) {
    return this.prisma.source.delete({ where: { id } });
  }

  /** Marks every source still pending or processing as failed; returns how many. */
  async failUnfinished(errorMessage: string): Promise<number> {
    const { count } = await this.prisma.source.updateMany({
      where: {
        status: { in: [SourceStatus.PENDING, SourceStatus.PROCESSING] },
      },
      data: { status: SourceStatus.ERROR, errorMessage },
    });
    return count;
  }

  /** Replaces all chunks of a source in one transaction (pgvector needs raw SQL). */
  async replaceChunks(
    sourceId: string,
    notebookId: string,
    chunks: TextChunk[],
    embeddings: number[][],
  ) {
    await this.prisma.$transaction([
      this.prisma.chunk.deleteMany({ where: { sourceId } }),
      ...chunks.map(
        (chunk, position) => this.prisma.$executeRaw`
          INSERT INTO "Chunk" (id, "sourceId", "notebookId", position, content, meta, embedding)
          VALUES (gen_random_uuid(), ${sourceId}, ${notebookId}, ${position}, ${chunk.content},
                  ${JSON.stringify(chunk.meta)}::jsonb, ${toVectorLiteral(embeddings[position])}::vector)`,
      ),
    ]);
  }

  searchChunks(
    embedding: number[],
    notebookIds: string[],
    limit: number,
  ): Promise<ChunkSearchRow[]> {
    const vector = toVectorLiteral(embedding);
    return this.prisma.$queryRaw<ChunkSearchRow[]>`
      SELECT c.id, c.content, c.meta, c."sourceId", s.filename, c."notebookId", n.name AS "notebookName",
             1 - (c.embedding <=> ${vector}::vector) AS score
      FROM "Chunk" c
      JOIN "Source" s ON s.id = c."sourceId"
      JOIN "Notebook" n ON n.id = c."notebookId"
      WHERE c."notebookId" = ANY(${notebookIds}::text[]) AND c.embedding IS NOT NULL
      ORDER BY c.embedding <=> ${vector}::vector
      LIMIT ${limit}`;
  }

  /** Cosine similarity of every chunk of a notebook against one embedding. */
  scoreNotebookChunks(
    embedding: number[],
    notebookId: string,
  ): Promise<{ id: string; score: number }[]> {
    return this.prisma.$queryRaw`
      SELECT c.id, 1 - (c.embedding <=> ${toVectorLiteral(embedding)}::vector) AS score
      FROM "Chunk" c
      WHERE c."notebookId" = ${notebookId} AND c.embedding IS NOT NULL`;
  }

  findChunksByNotebook(notebookId: string) {
    return this.prisma.chunk.findMany({
      where: { notebookId, source: { status: 'READY' } },
      include: { source: { select: { filename: true } } },
      orderBy: [{ source: { createdAt: 'asc' } }, { position: 'asc' }],
    });
  }

  findChunksByIds(ids: string[]) {
    return this.prisma.chunk.findMany({
      where: { id: { in: ids } },
      include: { source: { select: { filename: true } } },
    });
  }
}
