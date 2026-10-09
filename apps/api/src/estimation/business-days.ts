/**
 * Date-only helpers. Every date is normalized to UTC midnight so results don't
 * depend on the server timezone or the time of day.
 */

const isWeekend = (date: Date) => {
  const weekday = date.getUTCDay();
  return weekday === 0 || weekday === 6;
};

/** The same calendar day (in UTC) at 00:00 UTC. */
export function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

/**
 * Today's calendar day (in the server's local timezone, i.e. the user's day in
 * this deployment) as UTC midnight, comparable with date-only inputs like
 * "2026-12-15", which JS parses as UTC midnight.
 */
export function todayUtcDay(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

/** UTC midnight `days` business days (Mon–Fri) after the day of `from`. */
export function addBusinessDays(from: Date, days: number): Date {
  const date = startOfUtcDay(from);
  let added = 0;
  while (added < days) {
    date.setUTCDate(date.getUTCDate() + 1);
    if (!isWeekend(date)) added++;
  }
  return date;
}

/** Business days (Mon–Fri) after the day of `from` up to and including the day of `to`. */
export function businessDaysBetween(from: Date, to: Date): number {
  const end = startOfUtcDay(to);
  let days = 0;
  for (const d = startOfUtcDay(from); d < end;) {
    d.setUTCDate(d.getUTCDate() + 1);
    if (!isWeekend(d)) days++;
  }
  return days;
}

/** True when the day of `date` is strictly after the day of `today` (both UTC, date-only). */
export function isAfterDay(date: Date, today: Date): boolean {
  return startOfUtcDay(date).getTime() > startOfUtcDay(today).getTime();
}
