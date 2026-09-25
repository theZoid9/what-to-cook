import { describe, expect, it } from 'vitest';
import { getWeekKey, startOfCookingWeek } from './weekUtils';

describe('cooking week utilities', () => {
  it('uses Monday as the first day of a cooking week', () => {
    expect(getWeekKey(new Date('2026-09-21T12:00:00'))).toBe('2026-09-21');
  });

  it('keeps Sunday in the Monday-started cooking week', () => {
    expect(getWeekKey(new Date('2026-09-27T12:00:00'))).toBe('2026-09-21');
  });

  it('starts a fresh key on the following Monday', () => {
    const monday = startOfCookingWeek(new Date('2026-09-28T12:00:00'));
    expect(getWeekKey(monday)).toBe('2026-09-28');
  });
});
