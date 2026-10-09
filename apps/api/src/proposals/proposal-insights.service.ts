import { Injectable, NotFoundException } from '@nestjs/common';
import { EmbeddingsService } from '../embeddings/embeddings.service';
import { formatChunkLocation } from '../sources/chunk-location';
import { ChunkMeta } from '../sources/ingestion/chunker';
import { RetrievalService } from '../sources/retrieval.service';
import {
  ChunkRefDto,
  ProposalInsightsDto,
  TraceabilityCellDto,
  UncoveredChunkDto,
} from './dto/proposal-insights.dto';
import { ProposalsRepository } from './proposals.repository';

/** Chunk-level similarity from which a fragment is shown as related evidence. */
const RELATED_THRESHOLD = 0.85;
/** Requirement-level similarity from which a sentence counts as covered by a module. */
const COVERED_THRESHOLD = 0.86;
/** Lines shorter than this (titles, labels) are not treated as requirements. */
const MIN_REQUIREMENT_CHARS = 40;
const MAX_RELATED_PER_MODULE = 2;
const MAX_UNCOVERED = 10;

interface NotebookChunk {
  id: string;
  content: string;
  meta: ChunkMeta;
  sourceId: string;
  filename: string;
}

interface RequirementUnit {
  chunk: NotebookChunk;
  text: string;
}

/**
 * Traceability between identified modules and the notebook sources: which
 * fragments back each module (cited by the model or semantically related),
 * and which sentences of the sources no module covers.
 */
@Injectable()
export class ProposalInsightsService {
  /** Sentence embeddings are stable: cache them across requests. */
  private readonly unitEmbeddings = new Map<string, number[]>();

  constructor(
    private readonly repository: ProposalsRepository,
    private readonly retrieval: RetrievalService,
    private readonly embeddings: EmbeddingsService,
  ) {}

  async getInsights(proposalId: string): Promise<ProposalInsightsDto> {
    const proposal = await this.repository.findById(proposalId);
    if (!proposal) throw new NotFoundException('La propuesta no existe.');

    const chunks: NotebookChunk[] = await this.retrieval.allChunks(
      proposal.notebookId,
    );
    const byId = new Map(chunks.map((c) => [c.id, c]));
    const moduleTexts = proposal.modules.map(
      (m) => `${m.name}: ${m.description}`,
    );
    const chunkScores = await this.retrieval.scoreChunksAgainst(
      moduleTexts,
      proposal.notebookId,
    );

    const modules = proposal.modules.map((module, index) => {
      const cited = module.sourceChunkIds
        .map((id) => byId.get(id))
        .filter((c): c is NotebookChunk => Boolean(c));
      const citedIds = new Set(cited.map((c) => c.id));
      const related = [...chunkScores[index].entries()]
        .filter(
          ([id, score]) => score >= RELATED_THRESHOLD && !citedIds.has(id),
        )
        .sort((a, b) => b[1] - a[1])
        .slice(0, MAX_RELATED_PER_MODULE)
        .map(([id, score]) => toRef(byId.get(id)!, score));
      return {
        moduleId: module.id,
        cited: cited.map((c) => toRef(c, chunkScores[index].get(c.id))),
        related,
      };
    });

    const traceability: TraceabilityCellDto[] = [];
    for (const evidence of modules) {
      const counts = new Map<string, { cited: number; related: number }>();
      for (const ref of evidence.cited) bump(counts, ref.sourceId, 'cited');
      for (const ref of evidence.related) bump(counts, ref.sourceId, 'related');
      for (const [sourceId, count] of counts) {
        traceability.push({ moduleId: evidence.moduleId, sourceId, ...count });
      }
    }

    const { uncovered, coveragePct } = await this.findUncovered(
      chunks,
      moduleTexts,
      proposal.modules.map((m) => m.id),
    );

    const sources = [
      ...new Map(chunks.map((c) => [c.sourceId, c.filename])).entries(),
    ].map(([sourceId, filename]) => ({ sourceId, filename }));

    return {
      threshold: COVERED_THRESHOLD,
      coveragePct,
      sources,
      modules,
      traceability,
      uncovered,
    };
  }

  /** Compares every requirement-like sentence of the sources with every module. */
  private async findUncovered(
    chunks: NotebookChunk[],
    moduleTexts: string[],
    moduleIds: string[],
  ): Promise<{ uncovered: UncoveredChunkDto[]; coveragePct: number }> {
    const units = chunks.flatMap((chunk) =>
      splitRequirements(chunk.content).map((text) => ({ chunk, text })),
    );
    if (units.length === 0 || moduleTexts.length === 0) {
      return { uncovered: [], coveragePct: 100 };
    }

    const [unitVectors, moduleVectors] = await Promise.all([
      this.embedUnits(units),
      Promise.all(moduleTexts.map((t) => this.embeddings.embedQuery(t))),
    ]);

    const uncovered: UncoveredChunkDto[] = [];
    const seen = new Set<string>();
    units.forEach((unit, i) => {
      let best = 0;
      let closest: string | null = null;
      moduleVectors.forEach((vector, m) => {
        const score = dot(unitVectors[i], vector);
        if (score > best) {
          best = score;
          closest = moduleIds[m];
        }
      });
      if (best < COVERED_THRESHOLD && !seen.has(unit.text)) {
        seen.add(unit.text);
        uncovered.push({
          ...toRef(unit.chunk, best),
          excerpt: unit.text,
          closestModuleId: closest,
        });
      }
    });

    uncovered.sort((a, b) => (a.score ?? 0) - (b.score ?? 0));
    return {
      uncovered: uncovered.slice(0, MAX_UNCOVERED),
      coveragePct: Math.round(
        ((units.length - uncovered.length) / units.length) * 100,
      ),
    };
  }

  private async embedUnits(units: RequirementUnit[]): Promise<number[][]> {
    const missing = [
      ...new Set(
        units.map((u) => u.text).filter((t) => !this.unitEmbeddings.has(t)),
      ),
    ];
    if (missing.length) {
      const vectors = await this.embeddings.embedPassages(missing);
      missing.forEach((text, i) => this.unitEmbeddings.set(text, vectors[i]));
    }
    return units.map((u) => this.unitEmbeddings.get(u.text)!);
  }
}

/**
 * Splits a chunk into requirement-like sentences: bullet items, transcript
 * turns and prose sentences, without headings, table rules or speaker labels.
 */
export function splitRequirements(content: string): string[] {
  return content
    .split(/\r?\n/)
    .map((line) =>
      line
        .replace(/^\s*(#{1,6}\s.*|\|?\s*[-:| ]+\|?\s*)$/, '') // headings, table rules
        .replace(/^\s*([-*+]|\d+[.)])\s+/, '') // bullets
        .replace(/^\s*\[\d{1,2}:\d{2}(?::\d{2})?\]\s*[^:]{1,60}:\s*/, '') // [mm:ss] Speaker:
        .replace(/\*\*/g, '')
        .trim(),
    )
    .flatMap((line) =>
      line.length > 220 ? line.split(/(?<=[.!?])\s+/) : [line],
    )
    .map((line) => line.trim())
    .filter((line) => line.length >= MIN_REQUIREMENT_CHARS);
}

const dot = (a: number[], b: number[]) =>
  a.reduce((acc, value, i) => acc + value * b[i], 0);

function toRef(chunk: NotebookChunk, score?: number): ChunkRefDto {
  return {
    chunkId: chunk.id,
    sourceId: chunk.sourceId,
    filename: chunk.filename,
    location: formatChunkLocation(chunk.meta),
    excerpt: chunk.content.slice(0, 700),
    ...(score !== undefined && { score: Math.round(score * 1000) / 1000 }),
  };
}

function bump(
  counts: Map<string, { cited: number; related: number }>,
  sourceId: string,
  kind: 'cited' | 'related',
) {
  const current = counts.get(sourceId) ?? { cited: 0, related: 0 };
  current[kind]++;
  counts.set(sourceId, current);
}
