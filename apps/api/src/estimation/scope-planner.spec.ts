import {
  businessDaysBetween,
  planBalanced,
  planComplete,
  PlannerModule,
  PlannerSettings,
  planMvp,
} from './scope-planner';

const hours = (BACKEND: number) => ({ UX: 0, FRONTEND: 0, BACKEND, QA: 0 });

const catalog: PlannerModule[] = [
  {
    id: 'auth',
    name: 'Auth',
    priority: 'MUST',
    estimatedHours: hours(80),
    reducedHours: null,
  },
  {
    id: 'booking',
    name: 'Reservas',
    priority: 'MUST',
    estimatedHours: hours(160),
    reducedHours: hours(120),
  },
  {
    id: 'notifications',
    name: 'WhatsApp',
    priority: 'SHOULD',
    estimatedHours: hours(120),
    reducedHours: hours(40),
  },
  {
    id: 'payments',
    name: 'Pagos',
    priority: 'SHOULD',
    estimatedHours: hours(80),
    reducedHours: null,
  },
  {
    id: 'reports',
    name: 'Reportes',
    priority: 'COULD',
    estimatedHours: hours(80),
    reducedHours: null,
  },
];

// 1 backend SSR full time = 8 h/day, no PM or contingency to keep numbers readable
const settings: PlannerSettings = {
  team: [{ role: 'BACKEND', seniority: 'SSR', count: 1, dedication: 'FT' }],
  pmOverheadPct: 0,
  contingencyPct: 0,
};

describe('scope planner', () => {
  it('complete option includes every module in full', () => {
    expect(planComplete(catalog)).toHaveLength(5);
    expect(planComplete(catalog).every((m) => m.variant === 'FULL')).toBe(true);
  });

  it('MVP keeps only MUST modules, reduced when possible', () => {
    expect(planMvp(catalog)).toEqual([
      { moduleId: 'auth', variant: 'FULL' },
      { moduleId: 'booking', variant: 'REDUCED' },
    ]);
  });

  it('balanced adds SHOULD modules while they fit the deadline', () => {
    // MUST = 240 h = 30 days; target 50 days leaves 160 h
    const plan = planBalanced(catalog, settings, 50);

    // WhatsApp full (120 h) fits → 45 days; Pagos (80 h) would be 55 → left out
    expect(plan.modules).toEqual([
      { moduleId: 'auth', variant: 'FULL' },
      { moduleId: 'booking', variant: 'FULL' },
      { moduleId: 'notifications', variant: 'FULL' },
    ]);
    expect(plan.durationDays).toBe(45);
    expect(plan.fits).toBe(true);
  });

  it('balanced falls back to the reduced variant of a SHOULD module', () => {
    // 240 h MUST + 40 h reduced WhatsApp = 35 days; full would be 45
    const plan = planBalanced(catalog, settings, 40);

    expect(plan.modules.find((m) => m.moduleId === 'notifications')).toEqual({
      moduleId: 'notifications',
      variant: 'REDUCED',
    });
    expect(plan.modules.some((m) => m.moduleId === 'payments')).toBe(false);
    expect(plan.fits).toBe(true);
  });

  it('balanced never includes COULD modules', () => {
    const plan = planBalanced(catalog, settings, 1000);

    expect(plan.modules.some((m) => m.moduleId === 'reports')).toBe(false);
  });

  it('balanced reduces MUST modules when they alone miss the deadline', () => {
    // MUST full = 30 days; with reduced booking = 25 days
    const plan = planBalanced(catalog, settings, 26);

    expect(plan.modules).toEqual([
      { moduleId: 'auth', variant: 'FULL' },
      { moduleId: 'booking', variant: 'REDUCED' },
    ]);
    expect(plan.fits).toBe(true);
  });

  it('reports when even the reduced MUST scope misses the deadline', () => {
    const plan = planBalanced(catalog, settings, 10);

    expect(plan.fits).toBe(false);
    expect(plan.durationDays).toBe(25);
  });

  describe('with a role that has hours but nobody assigned', () => {
    // WhatsApp needs FRONTEND hours and the team has no frontend
    const withFrontend: PlannerModule[] = catalog.map((m) =>
      m.id === 'notifications'
        ? {
            ...m,
            estimatedHours: { ...hours(120), FRONTEND: 40 },
            reducedHours: { ...hours(40), FRONTEND: 16 },
          }
        : m,
    );

    it('does not add SHOULD modules whose duration is unknown', () => {
      const plan = planBalanced(withFrontend, settings, 1000);

      expect(plan.modules.some((m) => m.moduleId === 'notifications')).toBe(
        false,
      );
      // Pagos is backend only: its duration is known and fits
      expect(plan.modules.some((m) => m.moduleId === 'payments')).toBe(true);
      expect(plan.fits).toBe(true);
    });

    it('reports fits as null and reduces MUST when MUST itself is unstaffed', () => {
      const unstaffedMust: PlannerModule[] = catalog.map((m) =>
        m.id === 'booking'
          ? {
              ...m,
              estimatedHours: { ...hours(160), QA: 20 },
              reducedHours: { ...hours(120), QA: 10 },
            }
          : m,
      );
      const plan = planBalanced(unstaffedMust, settings, 1000);

      expect(plan.fits).toBeNull();
      expect(plan.durationDays).toBeNull();
      expect(plan.modules).toEqual([
        { moduleId: 'auth', variant: 'FULL' },
        { moduleId: 'booking', variant: 'REDUCED' },
      ]);
    });
  });

  it('counts business days excluding weekends', () => {
    // Fri 2026-10-09 → Fri 2026-10-16 = Mon..Fri = 5
    expect(
      businessDaysBetween(new Date('2026-10-09'), new Date('2026-10-16')),
    ).toBe(5);
  });
});
