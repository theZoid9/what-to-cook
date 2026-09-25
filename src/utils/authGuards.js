export function canSaveWeeklyMeal(user) {
  return Boolean(user && user.uid);
}
