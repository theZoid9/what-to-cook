import { describe, expect, it } from 'vitest';
import { canSaveWeeklyMeal } from './authGuards';

describe('saving authentication guard', () => {
  it('allows an authenticated user to save a meal', () => {
    expect(canSaveWeeklyMeal({ uid: 'user-123' })).toBe(true);
  });

  it('prompts an unauthenticated user to log in instead of saving', () => {
    expect(canSaveWeeklyMeal(null)).toBe(false);
  });
});
