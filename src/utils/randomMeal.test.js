import { describe, expect, it } from 'vitest';
import { selectMealCombination } from './randomMeal';

const meals = [
  { id: 'main-1', type: 'main' },
  { id: 'main-2', type: 'main' },
  { id: 'main-3', type: 'main' },
  { id: 'main-4', type: 'main' },
  { id: 'main-5', type: 'main' },
  { id: 'side-1', type: 'side' },
  { id: 'side-2', type: 'side' },
  { id: 'side-3', type: 'side' },
  { id: 'side-4', type: 'side' },
  { id: 'side-5', type: 'side' }
];

describe('selectMealCombination', () => {
  it('never selects a main or side that was already cooked this week', () => {
    const excluded = new Set(['main-2', 'side-3']);
    for (let attempt = 0; attempt < 50; attempt += 1) {
      const result = selectMealCombination(meals, excluded);
      expect(result.status).toBe('ready');
      expect(result.main.id).not.toBe('main-2');
      expect(result.sides.map((side) => side.id)).not.toContain('side-3');
    }
  });

  it('returns an empty state when every main has been cooked', () => {
    const result = selectMealCombination(meals, new Set(['main-1', 'main-2', 'main-3', 'main-4', 'main-5']));
    expect(result).toEqual({ status: 'no-mains' });
  });

  it('returns the empty state when there are no meals at all', () => {
    expect(selectMealCombination([], new Set())).toEqual({ status: 'no-mains' });
  });
});
