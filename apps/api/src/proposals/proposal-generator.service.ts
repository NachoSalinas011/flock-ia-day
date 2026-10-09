import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { RoleHours, sumRoleHours } from '../estimation/estimation.engine';
import { LlmService } from '../llm/llm.service';
import { NotebookResponseDto } from '../notebooks/dto/notebook-response.dto';
import { formatChunkLocation } from '../sources/chunk-location';
import { RetrievalService } from '../sources/retrieval.service';
import { AnalogyDto } from './dto/proposal-response.dto';
import {
  buildProposalMessages,
  buildRepairMessage,
  HistoricalProject,
  PromptChunk,
} from './proposal.prompt';
import { GeneratedProposal, parseGeneratedProposal } from './proposal.schema';
import { ProposalsRepository } from './proposals.repository';

/** Keeps the prompt within what free models answer in reasonable time. */
const MAX_SOURCE_CHARS = 60_000;

export interface GeneratedProposalDraft {
  proposal: GeneratedProposal;
  model: string;
  chunkIdsByRef: Map<string, string>;
  history: HistoricalProject[];
}

@Injectable()
export class ProposalGeneratorService {
  private readonly logger = new Logger(ProposalGeneratorService.name);

  constructor(
    private readonly llm: LlmService,
    private readonly retrieval: RetrievalService,
    private readonly repository: ProposalsRepository,
  ) {}

  /** `fresh` skips the LLM disk cache read (forces a new answer from the model). */
  async generate(
    notebook: NotebookResponseDto,
    instructions?: string,
    fresh = false,
  ): Promise<GeneratedProposalDraft> {
    const chunks = await this.selectChunks(notebook.id);
    const history = await this.loadHistory();
    const messages = buildProposalMessages({
      notebookName: notebook.name,
      client: notebook.client,
      chunks,
      history,
      instructions,
    });
    const mock = () => JSON.stringify(mockProposal(history, chunks));
    const accept = (content: string) => {
      try {
        parseGeneratedProposal(content);
        return true;
      } catch {
        return false;
      }
    };

    const first = await this.llm.complete(messages, {
      accept,
      mock,
      skipCache: fresh,
    });
    let model = first.model;
    let proposal: GeneratedProposal;
    try {
      proposal = parseGeneratedProposal(first.content);
    } catch (error) {
      const reason =
        error instanceof Error ? error.message.slice(0, 500) : String(error);
      this.logger.warn(`JSON inválido del modelo, reintentando: ${reason}`);
      const retry = await this.llm.complete(
        [...messages, ...buildRepairMessage(first.content, reason)],
        { accept, mock, skipCache: fresh },
      );
      model = retry.model;
      try {
        proposal = parseGeneratedProposal(retry.content);
      } catch {
        throw new BadRequestException(
          'El modelo devolvió una estimación con formato inválido. Probá generar de nuevo.',
        );
      }
    }

    return {
      proposal,
      model,
      chunkIdsByRef: new Map(chunks.map((c) => [c.ref, c.id])),
      history,
    };
  }

  /** Replaces the model's analogy names with the real historical numbers. */
  resolveAnalogies(
    analogies: GeneratedProposal['modules'][number]['analogies'],
    history: HistoricalProject[],
  ): AnalogyDto[] {
    const normalize = (s: string) =>
      s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

    const resolved: AnalogyDto[] = [];
    for (const analogy of analogies) {
      const project = history.find(
        (p) =>
          normalize(p.project).includes(normalize(analogy.project)) ||
          normalize(analogy.project).includes(normalize(p.project)),
      );
      const module = project?.modules.find(
        (m) =>
          normalize(m.name) === normalize(analogy.module) ||
          normalize(m.name).includes(normalize(analogy.module)) ||
          normalize(analogy.module).includes(normalize(m.name)),
      );
      if (!project || !module) continue;
      if (
        resolved.some(
          (r) => r.project === project.project && r.module === module.name,
        )
      )
        continue;

      const estimated = sumRoleHours(module.estimatedHours);
      const actual = module.actualHours
        ? sumRoleHours(module.actualHours)
        : null;
      resolved.push({
        project: project.project,
        module: module.name,
        estimatedHours: estimated,
        actualHours: actual,
        deviationPct:
          actual !== null && estimated > 0
            ? Math.round(((actual - estimated) / estimated) * 1000) / 10
            : null,
      });
    }
    return resolved;
  }

  private async selectChunks(
    notebookId: string,
  ): Promise<(PromptChunk & { id: string })[]> {
    const chunks = await this.retrieval.allChunks(notebookId);
    if (chunks.length === 0) {
      throw new BadRequestException(
        'Cargá al menos una fuente (y esperá a que termine de procesarse) antes de generar la propuesta.',
      );
    }
    const selected: (PromptChunk & { id: string })[] = [];
    let total = 0;
    for (const [index, chunk] of chunks.entries()) {
      total += chunk.content.length;
      if (total > MAX_SOURCE_CHARS) {
        this.logger.warn(
          `Fuentes truncadas: se usan ${selected.length} de ${chunks.length} chunks`,
        );
        break;
      }
      selected.push({
        id: chunk.id,
        ref: `C${index + 1}`,
        filename: chunk.filename,
        location: formatChunkLocation(chunk.meta),
        content: chunk.content,
      });
    }
    return selected;
  }

  private async loadHistory(): Promise<HistoricalProject[]> {
    const proposals = await this.repository.findHistoricalFormal();
    return proposals.map((proposal) => ({
      project: proposal.notebook.name,
      client: proposal.notebook.client,
      industry: proposal.notebook.industry,
      year: proposal.notebook.year,
      modules: proposal.modules.map((module) => ({
        name: module.name,
        description: module.description,
        complexity: module.complexity,
        estimatedHours: module.estimatedHours as Prisma.JsonObject as Record<
          string,
          number
        >,
        actualHours:
          (module.actualHours as Record<string, number> | null) ?? null,
        notes: module.notes,
      })),
      lessons: proposal.lessons,
    }));
  }
}

/** Canned answer for LLM_MOCK=true: reuses the first historical project as a draft. */
function mockProposal(
  history: HistoricalProject[],
  chunks: PromptChunk[],
): GeneratedProposal {
  const base = history[0];
  return {
    summary: '[MOCK] Estimación de ejemplo generada sin llamar al modelo.',
    modules: (base?.modules ?? []).map((module, index) => ({
      name: module.name,
      description: module.description,
      complexity: module.complexity as 'LOW' | 'MEDIUM' | 'HIGH',
      confidence: 'MEDIUM',
      estimatedHours: (module.actualHours ??
        module.estimatedHours) as RoleHours,
      rationale: `Basado en las horas reales de ${base.project}.`,
      analogies: [{ project: base.project, module: module.name }],
      priority: index < 3 ? 'MUST' : index < 5 ? 'SHOULD' : 'COULD',
      reducedScope: null,
      container: null,
      integrations: [],
      dependsOn: [],
      sourceRefs: chunks[index % chunks.length]
        ? [chunks[index % chunks.length].ref]
        : [],
    })),
    teams: {},
    deadline: null,
    team: [
      { role: 'PM', seniority: 'SSR', count: 1, dedication: 'PT' },
      { role: 'UX', seniority: 'SSR', count: 1, dedication: 'PT' },
      { role: 'FRONTEND', seniority: 'SSR', count: 1, dedication: 'FT' },
      { role: 'BACKEND', seniority: 'SR', count: 1, dedication: 'FT' },
      { role: 'QA', seniority: 'SSR', count: 1, dedication: 'PT' },
    ],
    assumptions: ['[MOCK] El cliente provee los accesos a tiempo.'],
    outOfScope: ['[MOCK] App mobile nativa.'],
    risks: ['[MOCK] Integraciones con terceros.'],
    openQuestions: ['[MOCK] ¿Cuántos usuarios concurrentes se esperan?'],
    architecture: null,
  };
}
