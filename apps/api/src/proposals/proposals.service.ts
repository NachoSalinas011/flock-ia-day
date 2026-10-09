import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ScopeVariant, Tier } from '@prisma/client';
import {
  addBusinessDays,
  businessDaysBetween,
  isAfterDay,
  startOfUtcDay,
  todayUtcDay,
} from '../estimation/business-days';
import {
  DEV_ROLES,
  RoleHours,
  sumRoleHours,
} from '../estimation/estimation.engine';
import {
  DEFAULT_TARGET_RATIO,
  durationOf,
  planBalanced,
  planComplete,
  PlannedModule,
  PlannerModule,
  planMvp,
} from '../estimation/scope-planner';
import { NotebooksService } from '../notebooks/notebooks.service';
import { normalizeArchitecture } from './architecture';
import { GenerateProposalDto } from './dto/generate-proposal.dto';
import { AnalogyDto, ProposalResponseDto } from './dto/proposal-response.dto';
import { UpdateModuleDto } from './dto/update-module.dto';
import { UpdateOptionModuleDto } from './dto/update-option-module.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { TeamMemberDto } from './dto/update-team.dto';
import { ProposalGeneratorService } from './proposal-generator.service';
import { ProposalMapper } from './proposal.mapper';
import { renderProposalMarkdown } from './proposal.markdown';
import { renderC4Mermaid } from './proposal.mermaid';
import { GeneratedProposal } from './proposal.schema';
import {
  OptionInput,
  ProposalsRepository,
  ProposalWithRelations,
} from './proposals.repository';

const DEFAULT_PM_OVERHEAD_PCT = 15;
const DEFAULT_CONTINGENCY_PCT = 10;
/** Below this share of the smallest analogy, a module's hours are logged as suspicious. */
const SUSPICIOUS_HOURS_RATIO = 0.4;
const ESTIMATED_TARGET_SOURCE = `Estimada: ${Math.round(DEFAULT_TARGET_RATIO * 100)} % de la duración de la opción Completa`;

@Injectable()
export class ProposalsService {
  private readonly logger = new Logger(ProposalsService.name);

  constructor(
    private readonly repository: ProposalsRepository,
    private readonly notebooks: NotebooksService,
    private readonly generator: ProposalGeneratorService,
  ) {}

  /** One LLM call → module catalog → three scope options built by the planner. */
  async generate(
    notebookId: string,
    dto: GenerateProposalDto,
  ): Promise<ProposalResponseDto> {
    const notebook = await this.notebooks.findOne(notebookId);
    const { proposal, model, chunkIdsByRef, history } =
      await this.generator.generate(notebook, dto.instructions, dto.fresh);

    const { architecture, placements } = normalizeArchitecture(
      proposal.architecture,
      proposal.modules.map((m) => ({ ...m, containerKey: m.container })),
    );

    const catalog: PlannerModule[] = proposal.modules.map((m, position) => ({
      id: String(position),
      name: m.name,
      priority: m.priority,
      estimatedHours: m.estimatedHours,
      reducedHours: reducedHoursOf(m),
    }));
    const teams = resolveTeams(proposal);
    const settings = (tier: Tier) => ({
      team: teams[tier],
      pmOverheadPct: DEFAULT_PM_OVERHEAD_PCT,
      contingencyPct: DEFAULT_CONTINGENCY_PCT,
    });

    const today = todayUtcDay();
    const deadline = parseDeadline(proposal.deadline?.date, today);
    const targetDays =
      deadline !== null
        ? businessDaysBetween(today, deadline)
        : estimatedTargetDays(
            durationOf(catalog, planComplete(catalog), settings('BALANCED')),
          );

    const plans: Record<Tier, PlannedModule[]> = {
      MVP: planMvp(catalog),
      BALANCED: planBalanced(catalog, settings('BALANCED'), targetDays).modules,
      COMPLETE: planComplete(catalog),
    };
    const options: OptionInput[] = (
      ['MVP', 'BALANCED', 'COMPLETE'] as const
    ).map((tier) => ({
      tier,
      pmOverheadPct: DEFAULT_PM_OVERHEAD_PCT,
      contingencyPct: DEFAULT_CONTINGENCY_PCT,
      team: teams[tier],
      modules: plans[tier].map((p) => ({
        position: Number(p.moduleId),
        variant: p.variant,
      })),
    }));

    const analogiesByPosition = proposal.modules.map((module) =>
      this.generator.resolveAnalogies(module.analogies, history),
    );
    this.warnSuspiciousHours(proposal, analogiesByPosition);

    const created = await this.repository.createWithOptions(
      {
        notebookId,
        summary: proposal.summary,
        assumptions: proposal.assumptions,
        outOfScope: proposal.outOfScope,
        risks: proposal.risks,
        openQuestions: proposal.openQuestions,
        lessons: [],
        model,
        architecture: architecture as unknown as Prisma.InputJsonValue,
        targetDate: deadline ?? addBusinessDays(today, targetDays),
        targetSource: deadline
          ? (proposal.deadline?.quote ?? 'Fecha indicada en las fuentes')
          : ESTIMATED_TARGET_SOURCE,
      },
      proposal.modules.map((module, position) => ({
        position,
        name: module.name,
        description: module.description,
        complexity: module.complexity,
        confidence: module.confidence,
        priority: module.priority,
        estimatedHours: module.estimatedHours,
        reducedDescription: reducedHoursOf(module)
          ? (module.reducedScope?.description ?? null)
          : null,
        reducedHours: reducedHoursOf(module) ?? Prisma.DbNull,
        analogies: analogiesByPosition[
          position
        ] as unknown as Prisma.InputJsonValue,
        sourceChunkIds: module.sourceRefs
          .map((ref) => chunkIdsByRef.get(ref.replace(/[[\]]/g, '').trim()))
          .filter((id): id is string => Boolean(id)),
        notes: module.rationale || null,
        containerKey: placements[position].containerKey,
        integrations: placements[position].integrations,
        dependsOn: placements[position].dependsOn,
      })),
      options,
    );
    return ProposalMapper.toResponse(created);
  }

  async findByNotebook(notebookId: string): Promise<ProposalResponseDto[]> {
    await this.notebooks.assertExists(notebookId);
    const proposals = await this.repository.findByNotebook(notebookId);
    return proposals.map((p) => ProposalMapper.toResponse(p));
  }

  async findOne(id: string): Promise<ProposalResponseDto> {
    return ProposalMapper.toResponse(await this.getOrThrow(id));
  }

  async markFormal(optionId: string): Promise<ProposalResponseDto> {
    const option = await this.getOptionOrThrow(optionId);
    await this.repository.markFormal(optionId, option.proposal.notebookId);
    return this.findOne(option.proposalId);
  }

  async updateTeam(
    optionId: string,
    team: TeamMemberDto[],
  ): Promise<ProposalResponseDto> {
    const option = await this.getOptionOrThrow(optionId);
    await this.repository.replaceTeam(optionId, team);
    return this.findOne(option.proposalId);
  }

  async updateSettings(
    optionId: string,
    dto: UpdateSettingsDto,
  ): Promise<ProposalResponseDto> {
    const option = await this.getOptionOrThrow(optionId);
    await this.repository.updateOption(optionId, dto);
    return this.findOne(option.proposalId);
  }

  async setOptionModule(
    optionId: string,
    moduleId: string,
    dto: UpdateOptionModuleDto,
  ): Promise<ProposalResponseDto> {
    const option = await this.getOptionOrThrow(optionId);
    const module = await this.repository.findModule(
      option.proposalId,
      moduleId,
    );
    if (!module) throw new NotFoundException('El módulo no existe.');
    const variant = dto.variant ?? ScopeVariant.FULL;
    if (variant === ScopeVariant.REDUCED && !module.reducedHours) {
      throw new BadRequestException(
        'Este módulo no tiene una versión reducida.',
      );
    }
    await this.repository.setOptionModule(
      optionId,
      moduleId,
      dto.included,
      variant,
    );
    return this.findOne(option.proposalId);
  }

  /** Re-fits the balanced option to the deadline with its current team. */
  async replan(optionId: string): Promise<ProposalResponseDto> {
    const option = await this.getOptionOrThrow(optionId);
    if (option.tier !== Tier.BALANCED) {
      throw new BadRequestException(
        'Solo la opción Equilibrada se ajusta a la fecha objetivo.',
      );
    }
    await this.replanBalanced(await this.getOrThrow(option.proposalId));
    return this.findOne(option.proposalId);
  }

  /** Changes the deadline (null = estimated) and re-fits the balanced option. */
  async updateTarget(
    proposalId: string,
    targetDate: string | null,
  ): Promise<ProposalResponseDto> {
    const proposal = await this.getOrThrow(proposalId);
    const today = todayUtcDay();
    let date: Date;
    let source: string;
    if (targetDate) {
      date = startOfUtcDay(new Date(targetDate));
      source = 'Definida manualmente';
      if (!isAfterDay(date, today)) {
        throw new BadRequestException(
          'La fecha objetivo tiene que ser futura.',
        );
      }
    } else {
      const balanced = proposal.options.find((o) => o.tier === Tier.BALANCED);
      const catalog = toCatalog(proposal);
      date = addBusinessDays(
        today,
        estimatedTargetDays(
          durationOf(catalog, planComplete(catalog), {
            team: balanced?.team ?? [],
            pmOverheadPct: balanced?.pmOverheadPct ?? DEFAULT_PM_OVERHEAD_PCT,
            contingencyPct: balanced?.contingencyPct ?? DEFAULT_CONTINGENCY_PCT,
          }),
        ),
      );
      source = ESTIMATED_TARGET_SOURCE;
    }
    await this.repository.update(proposalId, {
      targetDate: date,
      targetSource: source,
    });
    await this.replanBalanced(await this.getOrThrow(proposalId));
    return this.findOne(proposalId);
  }

  async updateModule(
    proposalId: string,
    moduleId: string,
    dto: UpdateModuleDto,
  ): Promise<ProposalResponseDto> {
    const module = await this.repository.findModule(proposalId, moduleId);
    if (!module) throw new NotFoundException('El módulo no existe.');
    if (dto.reducedHours && !module.reducedHours) {
      throw new BadRequestException(
        'Este módulo no tiene una versión reducida.',
      );
    }
    const { estimatedHours, reducedHours, ...fields } = dto;
    await this.repository.updateModule(moduleId, {
      ...fields,
      ...(estimatedHours && { estimatedHours: { ...estimatedHours } }),
      ...(reducedHours && { reducedHours: { ...reducedHours } }),
    });
    return this.findOne(proposalId);
  }

  async remove(id: string): Promise<void> {
    await this.getOrThrow(id);
    await this.repository.delete(id);
  }

  async exportMarkdown(
    id: string,
  ): Promise<{ filename: string; content: string }> {
    const proposal = await this.findOne(id);
    const notebook = await this.notebooks.findOne(proposal.notebookId);
    return {
      filename: `propuesta-${slug(notebook.name)}-v${proposal.version}.md`,
      content: renderProposalMarkdown(notebook, proposal),
    };
  }

  async exportC4(id: string): Promise<string> {
    const proposal = await this.findOne(id);
    const notebook = await this.notebooks.findOne(proposal.notebookId);
    return renderC4Mermaid(notebook.name, proposal);
  }

  private async replanBalanced(proposal: ProposalWithRelations) {
    const balanced = proposal.options.find((o) => o.tier === Tier.BALANCED);
    if (!balanced || !proposal.targetDate) return;
    const plan = planBalanced(
      toCatalog(proposal),
      {
        team: balanced.team,
        pmOverheadPct: balanced.pmOverheadPct,
        contingencyPct: balanced.contingencyPct,
      },
      businessDaysBetween(todayUtcDay(), proposal.targetDate),
    );
    await this.repository.replaceOptionModules(balanced.id, plan.modules);
  }

  /**
   * Prompt-injection / hallucination sanity check: a module far cheaper than
   * its most similar historical modules is suspicious. Logs only.
   */
  private warnSuspiciousHours(
    proposal: GeneratedProposal,
    analogiesByPosition: AnalogyDto[][],
  ) {
    proposal.modules.forEach((module, position) => {
      const references = analogiesByPosition[position].map(
        (a) => a.actualHours ?? a.estimatedHours,
      );
      if (!references.length) return;
      const smallest = Math.min(...references);
      const total = sumRoleHours(module.estimatedHours);
      if (total < smallest * SUSPICIOUS_HOURS_RATIO) {
        this.logger.warn(
          `Módulo "${module.name}" con ${total} h: menos del ${SUSPICIOUS_HOURS_RATIO * 100} % de su analogía más chica (${smallest} h)`,
        );
      }
    });
  }

  private async getOrThrow(id: string) {
    const proposal = await this.repository.findById(id);
    if (!proposal) throw new NotFoundException('La propuesta no existe.');
    return proposal;
  }

  private async getOptionOrThrow(optionId: string) {
    const option = await this.repository.findOption(optionId);
    if (!option) throw new NotFoundException('La opción no existe.');
    return option;
  }
}

function toCatalog(proposal: ProposalWithRelations): PlannerModule[] {
  return proposal.modules.map((m) => ({
    id: m.id,
    name: m.name,
    priority: m.priority,
    estimatedHours: m.estimatedHours as unknown as RoleHours,
    reducedHours: (m.reducedHours as unknown as RoleHours | null) ?? null,
  }));
}

/** Without a deadline in the sources, aim at a share of the complete duration. */
function estimatedTargetDays(completeDurationDays: number | null): number {
  return Math.max(
    5,
    Math.round((completeDurationDays ?? 40) * DEFAULT_TARGET_RATIO),
  );
}

/** A reduced scope only counts if it is actually cheaper than the full one. */
function reducedHoursOf(
  module: GeneratedProposal['modules'][number],
): RoleHours | null {
  const reduced = module.reducedScope?.estimatedHours;
  if (!reduced) return null;
  const total = (h: RoleHours) => h.UX + h.FRONTEND + h.BACKEND + h.QA;
  return total(reduced) > 0 && total(reduced) < total(module.estimatedHours)
    ? reduced
    : null;
}

/**
 * Model-suggested team per option, falling back to the single team or a
 * default. Any dev role with hours in the catalog but nobody in the suggested
 * team gets one SSR full time, so no option starts with an unknown duration.
 */
function resolveTeams(
  proposal: GeneratedProposal,
): Record<Tier, TeamMemberDto[]> {
  const moduleHours = proposal.modules.map((m) => m.estimatedHours);
  const fallback = proposal.team.length
    ? proposal.team
    : defaultTeam(moduleHours);
  const pick = (tier: Tier) => {
    const team = proposal.teams[tier];
    return withStaffedRoles(team && team.length ? team : fallback, moduleHours);
  };
  return {
    MVP: pick('MVP'),
    BALANCED: pick('BALANCED'),
    COMPLETE: pick('COMPLETE'),
  };
}

const rolesWithHours = (moduleHours: RoleHours[]) =>
  DEV_ROLES.filter((role) => moduleHours.some((hours) => hours[role] > 0));

/** One SSR per role that has hours (PM part time), when the model suggests no team. */
function defaultTeam(moduleHours: RoleHours[]): TeamMemberDto[] {
  return [
    { role: 'PM', seniority: 'SSR', count: 1, dedication: 'PT' },
    ...rolesWithHours(moduleHours).map(ssrFullTime),
  ];
}

function withStaffedRoles(
  team: TeamMemberDto[],
  moduleHours: RoleHours[],
): TeamMemberDto[] {
  const missing = rolesWithHours(moduleHours).filter(
    (role) => !team.some((member) => member.role === role && member.count > 0),
  );
  return [...team, ...missing.map(ssrFullTime)];
}

const ssrFullTime = (role: TeamMemberDto['role']): TeamMemberDto => ({
  role,
  seniority: 'SSR',
  count: 1,
  dedication: 'FT',
});

/** Valid future dates only (date-only, UTC midnight); anything else means "no deadline in the sources". */
function parseDeadline(value: string | null | undefined, today: Date) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return isAfterDay(date, today) ? startOfUtcDay(date) : null;
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
