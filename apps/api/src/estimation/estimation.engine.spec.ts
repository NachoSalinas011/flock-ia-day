import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { calculateEstimation, EstimationInput } from './estimation.engine';

const loadFixture = (folder: string) =>
  JSON.parse(
    readFileSync(join(__dirname, '__fixtures__', `${folder}.json`), 'utf8'),
  );

const toInput = (seed: any): EstimationInput => ({
  modules: seed.modules,
  team: seed.team,
  pmOverheadPct: seed.parameters.pmOverheadPct,
  contingencyPct: seed.parameters.contingencyPct,
});

describe('calculateEstimation', () => {
  it('reproduces a historical formal proposal without contingency', () => {
    const seed = loadFixture('historico-sin-contingencia');

    const result = calculateEstimation(toInput(seed));

    expect(result.devHours).toBe(seed.summary.estimated.devHours);
    expect(result.pmHours).toBe(seed.summary.estimated.pmHours);
    expect(result.totalHours).toBe(seed.summary.estimated.totalHours);
    expect(result.team.durationDays).toBe(
      seed.summary.estimated.durationBusinessDays,
    );
  });

  it('reproduces a historical formal proposal with 10% contingency', () => {
    const seed = loadFixture('historico-con-contingencia');

    const result = calculateEstimation(toInput(seed));

    expect(result.contingencyHours).toBe(
      seed.summary.estimated.contingencyHours,
    );
    expect(result.totalHours).toBe(seed.summary.estimated.totalHours);
    expect(result.team.durationDays).toBe(
      seed.summary.estimated.durationBusinessDays,
    );
    expect(result.team.bottleneckRole).toBe('QA');
  });

  it('computes 8h and 4h person-days per module', () => {
    const result = calculateEstimation({
      modules: [
        {
          name: 'Login',
          estimatedHours: { UX: 8, FRONTEND: 16, BACKEND: 16, QA: 8 },
        },
      ],
      team: [],
      pmOverheadPct: 0,
      contingencyPct: 0,
    });

    expect(result.modules[0]).toEqual({
      name: 'Login',
      totalHours: 48,
      daysFullTime: 6,
      daysPartTime: 12,
    });
  });

  it('doubles the duration when the whole team goes part time', () => {
    const result = calculateEstimation({
      modules: [
        {
          name: 'API',
          estimatedHours: { UX: 0, FRONTEND: 0, BACKEND: 80, QA: 0 },
        },
      ],
      team: [{ role: 'BACKEND', seniority: 'SSR', count: 1, dedication: 'FT' }],
      pmOverheadPct: 0,
      contingencyPct: 0,
    });

    expect(result.allFullTime.durationDays).toBe(10);
    expect(result.allPartTime.durationDays).toBe(20);
  });

  it('flags roles with hours but nobody assigned', () => {
    const result = calculateEstimation({
      modules: [
        {
          name: 'UI',
          estimatedHours: { UX: 0, FRONTEND: 40, BACKEND: 0, QA: 0 },
        },
      ],
      team: [{ role: 'BACKEND', seniority: 'SR', count: 1, dedication: 'FT' }],
      pmOverheadPct: 15,
      contingencyPct: 10,
    });

    expect(result.team.durationDays).toBeNull();
    expect(result.warnings).toEqual([
      'Hay 40 h de FRONTEND sin nadie asignado.',
    ]);
  });
});
