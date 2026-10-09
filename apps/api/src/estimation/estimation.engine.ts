import { Dedication, Role, Seniority } from '@prisma/client';

/** Roles whose hours are estimated per module (PM is a % overhead). */
export const DEV_ROLES = ['UX', 'FRONTEND', 'BACKEND', 'QA'] as const;
export type DevRole = (typeof DEV_ROLES)[number];
export type RoleHours = Record<DevRole, number>;

/** Hours are expressed as SSR-equivalent; a JR needs 1.3x, a SR 0.8x. */
export const SENIORITY_FACTORS: Record<Seniority, number> = {
  JR: 1.3,
  SSR: 1.0,
  SR: 0.8,
};

export const HOURS_PER_DAY: Record<Dedication, number> = { FT: 8, PT: 4 };

export interface EstimationModuleInput {
  name: string;
  estimatedHours: RoleHours;
}

export interface EstimationTeamInput {
  role: Role;
  seniority: Seniority;
  count: number;
  dedication: Dedication;
}

export interface EstimationInput {
  modules: EstimationModuleInput[];
  team: EstimationTeamInput[];
  pmOverheadPct: number;
  contingencyPct: number;
}

export interface ModuleBreakdown {
  name: string;
  totalHours: number;
  /** person-days of 8 hours */
  daysFullTime: number;
  /** person-days of 4 hours */
  daysPartTime: number;
}

export interface TeamScenario {
  /** SSR-equivalent hours the role delivers per business day */
  dailyCapacityByRole: Record<Role, number>;
  daysByRole: Record<DevRole, number | null>;
  /** business days, including contingency; null if a role with hours has no one assigned */
  durationDays: number | null;
  bottleneckRole: DevRole | null;
}

export interface EstimationResult {
  modules: ModuleBreakdown[];
  hoursByRole: RoleHours & { PM: number };
  devHours: number;
  pmHours: number;
  contingencyHours: number;
  totalHours: number;
  /** the team as configured */
  team: TeamScenario;
  /** same composition, everyone full time */
  allFullTime: TeamScenario;
  /** same composition, everyone part time */
  allPartTime: TeamScenario;
  warnings: string[];
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export function sumRoleHours(hours: Partial<RoleHours>): number {
  return DEV_ROLES.reduce((acc, role) => acc + (hours[role] ?? 0), 0);
}

export function calculateTeamScenario(
  hoursByRole: RoleHours,
  team: EstimationTeamInput[],
  contingencyPct: number,
): TeamScenario {
  const dailyCapacityByRole = {
    PM: 0,
    UX: 0,
    FRONTEND: 0,
    BACKEND: 0,
    QA: 0,
  } as Record<Role, number>;
  for (const member of team) {
    dailyCapacityByRole[member.role] +=
      (member.count * HOURS_PER_DAY[member.dedication]) /
      SENIORITY_FACTORS[member.seniority];
  }

  const daysByRole = {} as Record<DevRole, number | null>;
  let maxDays = 0;
  let bottleneckRole: DevRole | null = null;
  let unstaffed = false;
  for (const role of DEV_ROLES) {
    const hours = hoursByRole[role];
    const capacity = dailyCapacityByRole[role];
    if (hours === 0) {
      daysByRole[role] = 0;
      continue;
    }
    if (capacity === 0) {
      daysByRole[role] = null;
      unstaffed = true;
      continue;
    }
    const days = hours / capacity;
    daysByRole[role] = round1(days);
    if (days > maxDays) {
      maxDays = days;
      bottleneckRole = role;
    }
  }

  return {
    dailyCapacityByRole,
    daysByRole,
    durationDays: unstaffed
      ? null
      : Math.ceil(maxDays * (1 + contingencyPct / 100)),
    bottleneckRole,
  };
}

export function calculateEstimation(input: EstimationInput): EstimationResult {
  const hoursByRole: RoleHours = { UX: 0, FRONTEND: 0, BACKEND: 0, QA: 0 };
  const modules = input.modules.map((module) => {
    for (const role of DEV_ROLES) {
      hoursByRole[role] += module.estimatedHours[role] ?? 0;
    }
    const totalHours = sumRoleHours(module.estimatedHours);
    return {
      name: module.name,
      totalHours,
      daysFullTime: round1(totalHours / HOURS_PER_DAY.FT),
      daysPartTime: round1(totalHours / HOURS_PER_DAY.PT),
    };
  });

  const devHours = sumRoleHours(hoursByRole);
  const pmHours = Math.round((devHours * input.pmOverheadPct) / 100);
  const contingencyHours = Math.round(
    ((devHours + pmHours) * input.contingencyPct) / 100,
  );

  const withDedication = (dedication: Dedication) =>
    input.team.map((member) => ({ ...member, dedication }));

  const warnings = DEV_ROLES.filter(
    (role) =>
      hoursByRole[role] > 0 &&
      !input.team.some((member) => member.role === role && member.count > 0),
  ).map((role) => `Hay ${hoursByRole[role]} h de ${role} sin nadie asignado.`);

  return {
    modules,
    hoursByRole: { ...hoursByRole, PM: pmHours },
    devHours,
    pmHours,
    contingencyHours,
    totalHours: devHours + pmHours + contingencyHours,
    team: calculateTeamScenario(hoursByRole, input.team, input.contingencyPct),
    allFullTime: calculateTeamScenario(
      hoursByRole,
      withDedication('FT'),
      input.contingencyPct,
    ),
    allPartTime: calculateTeamScenario(
      hoursByRole,
      withDedication('PT'),
      input.contingencyPct,
    ),
    warnings,
  };
}
