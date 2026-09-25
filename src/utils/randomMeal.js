function pickRandom(items) {
  return items[Math.floor(Math.random() * items.length)];
}

export function getAvailableMeals(meals, madeMealIds = new Set()) {
  return meals.filter((meal) => !madeMealIds.has(meal.id));
}

export function selectMealCombination(meals, madeMealIds = new Set()) {
  const available = getAvailableMeals(meals, madeMealIds);
  const mains = available.filter((meal) => meal.type === 'main');
  const sides = available.filter((meal) => meal.type === 'side');

  if (!mains.length) {
    return { status: 'no-mains' };
  }

  if (!sides.length) {
    return { status: 'no-sides' };
  }

  const main = pickRandom(mains);
  const sideCount = sides.length > 1 ? 2 : 1;
  const shuffledSides = [...sides].sort(() => Math.random() - 0.5);

  return {
    status: 'ready',
    main,
    sides: shuffledSides.slice(0, sideCount)
  };
}
