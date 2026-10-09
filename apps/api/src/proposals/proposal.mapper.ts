import { ProposalModule, ScopeVariant, Tier } from '@prisma/client';
import { businessDaysBetween, todayUtcDay } from '../estimation/business-days';
import {
  calculateEstimation,
  DEV_ROLES,
  DevRole,
  HOURS_PER_DAY,
  RoleHours,
  sumRoleHours,
} from '../estimation/estimation.engine';
import {
  Architecture,
  inferArchitecture,
  inferContainerKey,
  withoutSystemActors,
} from './architecture';
import {
  AnalogyDto,
  ProposalModuleResponseDto,
  ProposalOptionResponseDto,
  ProposalResponseDto,
} from './dto/proposal-response.dto';
import { ProposalWithRelations } from './proposals.repository';

export const TIER_LABEL: Record<Tier, string> = {
  MVP: 'MVP',
  BALANCED: 'Equilibrada',
  COMPLETE: 'Completa',
};

const round1 = (n: number) => Math.round(n * 10) / 10;

export class ProposalMapper {
  static toResponse(
    proposal: ProposalWithRelations,
    today = todayUtcDay(),
  ): ProposalResponseDto {
    const stored = proposal.architecture as unknown as Architecture | null;
    const architecture = stored
      ? { ...stored, actors: withoutSystemActors(stored) }
      : inferArchitecture();
    const view = (module: ProposalModule, variant: ScopeVariant) =>
      ProposalMapper.moduleView(module, variant, architecture);
    const targetDays = proposal.targetDate
      ? businessDaysBetween(today, proposal.targetDate)
      : null;

    return {
      id: proposal.id,
      notebookId: proposal.notebookId,
      version: proposal.version,
      summary: proposal.summary,
      assumptions: proposal.assumptions,
      outOfScope: proposal.outOfScope,
      risks: proposal.risks,
      openQuestions: proposal.openQuestions,
      lessons: proposal.lessons,
      model: proposal.model,
      createdAt: proposal.createdAt,
      targetDate: proposal.targetDate,
      targetSource: proposal.targetSource,
      targetDays,
      architecture,
      modules: proposal.modules.map((m) => view(m, 'FULL')),
      options: proposal.options.map((option): ProposalOptionResponseDto => {
        const variants = new Map(
          option.modules.map((link) => [link.moduleId, link.variant]),
        );
        const included = proposal.modules
          .filter((m) => variants.has(m.id))
          .map((m) => view(m, variants.get(m.id)!));
        const estimation = calculateEstimation({
          modules: included,
          team: option.team,
          pmOverheadPct: option.pmOverheadPct,
          contingencyPct: option.contingencyPct,
        });
        const durationDays = estimation.team.durationDays;
        const unstaffedRoles: DevRole[] = DEV_ROLES.filter(
          (role) =>
            estimation.hoursByRole[role] > 0 &&
            !option.team.some((m) => m.role === role && m.count > 0),
        );
        return {
          id: option.id,
          proposalId: proposal.id,
          notebookId: proposal.notebookId,
          version: proposal.version,
          tier: option.tier,
          label: TIER_LABEL[option.tier],
          isFormal: option.isFormal,
          pmOverheadPct: option.pmOverheadPct,
          contingencyPct: option.contingencyPct,
          team: option.team.map((member) => ({
            id: member.id,
            role: member.role,
            seniority: member.seniority,
            count: member.count,
            dedication: member.dedication,
          })),
          modules: included,
          excludedModules: proposal.modules
            .filter((m) => !variants.has(m.id))
            .map((m) => ({
              id: m.id,
              name: m.name,
              priority: m.priority,
              totalHours: sumRoleHours(
                m.estimatedHours as unknown as RoleHours,
              ),
            })),
          estimation,
          actual: ProposalMapper.actualTotals(included),
          target: {
            targetDays,
            durationDays,
            unstaffedRoles,
            fits:
              targetDays === null || durationDays === null
                ? null
                : durationDays <= targetDays,
          },
        };
      }),
    };
  }

  static moduleView(
    module: ProposalModule,
    variant: ScopeVariant,
    architecture: Architecture,
  ): ProposalModuleResponseDto {
    const fullHours = module.estimatedHours as unknown as RoleHours;
    const reducedHours =
      (module.reducedHours as unknown as RoleHours | null) ?? null;
    const usesReduced = variant === 'REDUCED' && reducedHours !== null;
    const hours = usesReduced ? reducedHours : fullHours;
    const actualHours =
      (module.actualHours as unknown as RoleHours | null) ?? null;
    const totalHours = sumRoleHours(hours);
    return {
      id: module.id,
      position: module.position,
      name: module.name,
      description:
        usesReduced && module.reducedDescription
          ? module.reducedDescription
          : module.description,
      complexity: module.complexity,
      confidence: module.confidence,
      priority: module.priority,
      variant: usesReduced ? 'REDUCED' : 'FULL',
      estimatedHours: hours,
      fullHours,
      fullDescription: module.description,
      reducedDescription: module.reducedDescription,
      reducedHours,
      actualHours,
      totalHours,
      actualTotalHours: actualHours ? sumRoleHours(actualHours) : null,
      daysFullTime: round1(totalHours / HOURS_PER_DAY.FT),
      daysPartTime: round1(totalHours / HOURS_PER_DAY.PT),
      analogies: module.analogies as unknown as AnalogyDto[],
      sourceChunkIds: module.sourceChunkIds,
      notes: module.notes,
      containerKey:
        module.containerKey ??
        inferContainerKey(
          { name: module.name, estimatedHours: fullHours },
          architecture,
        ),
      integrations: module.integrations,
      dependsOn: module.dependsOn,
    };
  }

  private static actualTotals(
    modules: { actualHours: RoleHours | null }[],
  ): ProposalOptionResponseDto['actual'] {
    if (!modules.some((m) => m.actualHours)) return null;
    const hoursByRole: RoleHours = { UX: 0, FRONTEND: 0, BACKEND: 0, QA: 0 };
    for (const module of modules) {
      for (const role of DEV_ROLES) {
        hoursByRole[role] += module.actualHours?.[role] ?? 0;
      }
    }
    return { hoursByRole, devHours: sumRoleHours(hoursByRole) };
  }
}
