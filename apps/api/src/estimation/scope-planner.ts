import { Priority, ScopeVariant, Tier } from '@prisma/client';
import {
  calculateEstimation,
  EstimationTeamInput,
  RoleHours,
  sumRoleHours,
} from './estimation.engine';

export interface PlannerModule {
  id: string;
  name: string;
  priority: Priority;
  estimatedHours: RoleHours;
  reducedHours: RoleHours | null;
}

export interface PlannedModule {
  moduleId: string;
  variant: ScopeVariant;
}

export interface PlannerSettings {
  team: EstimationTeamInput[];
  pmOverheadPct: number;
  contingencyPct: number;
}

export interface BalancedPlan {
  modules: PlannedModule[];
  targetDays: number;
  durationDays: number | null;
  /** null when the duration can't be computed (a role without people) */
  fits: boolean | null;
}

/** Without an explicit deadline, the balanced option aims at 65% of the complete duration. */
export const DEFAULT_TARGET_RATIO = 0.65;

export const variantHours = (module: PlannerModule, variant: ScopeVariant) =>
  variant === 'REDUCED' && module.reducedHours
    ? module.reducedHours
    : module.estimatedHours;

export function durationOf(
  catalog: PlannerModule[],
  plan: PlannedModule[],
  settings: PlannerSettings,
): number | null {
  const byId = new Map(catalog.map((m) => [m.id, m]));
  return calculateEstimation({
    modules: plan.map((p) => {
      const module = byId.get(p.moduleId)!;
      return {
        name: module.name,
        estimatedHours: variantHours(module, p.variant),
      };
    }),
    team: settings.team,
    pmOverheadPct: settings.pmOverheadPct,
    contingencyPct: settings.contingencyPct,
  }).team.durationDays;
}

/** Everything the client asked for, full scope. */
export function planComplete(catalog: PlannerModule[]): PlannedModule[] {
  return catalog.map((m) => ({ moduleId: m.id, variant: 'FULL' }));
}

/** Only what is indispensable, in its reduced version when there is one. */
export function planMvp(catalog: PlannerModule[]): PlannedModule[] {
  const must = catalog.filter((m) => m.priority === 'MUST');
  const core = must.length
    ? must
    : catalog.filter((m) => m.priority === 'SHOULD');
  return core.map((m) => ({
    moduleId: m.id,
    variant: m.reducedHours ? 'REDUCED' : 'FULL',
  }));
}

/**
 * The most scope that fits the deadline: all MUST modules (reduced if needed
 * to fit), then SHOULD modules in catalog order, full if they fit, otherwise
 * reduced, otherwise left out. COULD modules stay in the complete option.
 * An unknown duration (a role with hours and nobody assigned) never counts as
 * fitting: MUST modules get reduced, no SHOULD module is added, and the result
 * reports `fits: null`.
 */
export function planBalanced(
  catalog: PlannerModule[],
  settings: PlannerSettings,
  targetDays: number,
): BalancedPlan {
  const plan: PlannedModule[] = catalog
    .filter((m) => m.priority === 'MUST')
    .map((m) => ({ moduleId: m.id, variant: 'FULL' }));
  const duration = () => durationOf(catalog, plan, settings);
  const fits = () => {
    const days = duration();
    return days === null ? null : days <= targetDays;
  };
  // While selecting scope, an unknown duration (a role with hours and nobody
  // assigned) counts as NOT fitting, so the deadline is never ignored.
  const fitsKnown = () => fits() === true;

  // MUST modules don't fit: reduce the ones that save the most hours first.
  if (!fitsKnown()) {
    const reducible = catalog
      .filter((m) => m.priority === 'MUST' && m.reducedHours)
      .sort(
        (a, b) =>
          sumRoleHours(b.estimatedHours) -
          sumRoleHours(b.reducedHours!) -
          (sumRoleHours(a.estimatedHours) - sumRoleHours(a.reducedHours!)),
      );
    for (const module of reducible) {
      plan.find((p) => p.moduleId === module.id)!.variant = 'REDUCED';
      if (fitsKnown()) break;
    }
  }

  for (const module of catalog.filter((m) => m.priority === 'SHOULD')) {
    plan.push({ moduleId: module.id, variant: 'FULL' });
    if (fitsKnown()) continue;
    if (module.reducedHours) {
      plan[plan.length - 1].variant = 'REDUCED';
      if (fitsKnown()) continue;
    }
    plan.pop();
  }

  // keep catalog order
  const order = new Map(catalog.map((m, i) => [m.id, i]));
  plan.sort((a, b) => order.get(a.moduleId)! - order.get(b.moduleId)!);
  return { modules: plan, targetDays, durationDays: duration(), fits: fits() };
}

export const TIER_ORDER: Tier[] = ['MVP', 'BALANCED', 'COMPLETE'];

export { businessDaysBetween } from './business-days';
