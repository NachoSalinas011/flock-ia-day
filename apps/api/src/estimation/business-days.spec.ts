import {
  addBusinessDays,
  businessDaysBetween,
  isAfterDay,
  startOfUtcDay,
  todayUtcDay,
} from './business-days';

describe('business days', () => {
  it('normalizes any time of day to UTC midnight', () => {
    expect(startOfUtcDay(new Date('2026-10-09T23:59:59Z')).toISOString()).toBe(
      '2026-10-09T00:00:00.000Z',
    );
  });

  it('adds business days skipping weekends and returns UTC midnight', () => {
    // Fri 2026-10-09 late in the day + 1 → Mon 2026-10-12
    expect(
      addBusinessDays(new Date('2026-10-09T22:30:00Z'), 1).toISOString(),
    ).toBe('2026-10-12T00:00:00.000Z');
    expect(addBusinessDays(new Date('2026-10-09'), 5).toISOString()).toBe(
      '2026-10-16T00:00:00.000Z',
    );
  });

  it('is the inverse of businessDaysBetween regardless of the time of day', () => {
    const from = new Date('2026-10-07T23:45:00Z');
    expect(businessDaysBetween(from, addBusinessDays(from, 12))).toBe(12);
  });

  it('does not depend on the process timezone', () => {
    const original = process.env.TZ;
    try {
      // getUTC* ignores TZ: a local-time implementation would drift here
      process.env.TZ = 'America/Argentina/Buenos_Aires';
      const from = new Date('2026-10-09T01:00:00Z'); // Thu 22:00 in ART
      expect(addBusinessDays(from, 1).toISOString()).toBe(
        '2026-10-12T00:00:00.000Z',
      );
      expect(businessDaysBetween(from, new Date('2026-10-16'))).toBe(5);
    } finally {
      process.env.TZ = original;
    }
  });

  it('takes today as the local calendar day, so "tomorrow" is valid late at night', () => {
    const original = process.env.TZ;
    try {
      process.env.TZ = 'America/Argentina/Buenos_Aires';
      const now = new Date('2026-10-10T00:30:00Z'); // Fri 21:30 in ART
      const today = todayUtcDay(now);
      expect(today.toISOString()).toBe('2026-10-09T00:00:00.000Z');
      expect(isAfterDay(new Date('2026-10-10'), today)).toBe(true);
    } finally {
      process.env.TZ = original;
    }
  });

  it('compares days, not instants', () => {
    const today = new Date('2026-10-09T23:30:00Z');
    expect(isAfterDay(new Date('2026-10-10'), today)).toBe(true);
    expect(isAfterDay(new Date('2026-10-09'), today)).toBe(false);
  });
});
