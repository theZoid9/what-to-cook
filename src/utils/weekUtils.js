export function startOfCookingWeek(date = new Date()) {
  const current = new Date(date);
  current.setHours(0, 0, 0, 0);
  const day = current.getDay();
  const daysSinceMonday = (day + 6) % 7;
  current.setDate(current.getDate() - daysSinceMonday);
  return current;
}

export function getWeekKey(date = new Date()) {
  const monday = startOfCookingWeek(date);
  const year = monday.getFullYear();
  const month = String(monday.getMonth() + 1).padStart(2, '0');
  const day = String(monday.getDate()).padStart(2, '0');
  return year + '-' + month + '-' + day;
}

export function formatMealDate(value) {
  const date = value?.toDate ? value.toDate() : new Date(value);
  return new Intl.DateTimeFormat('en', {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  }).format(date);
}

export function getWeekLabel(date = new Date()) {
  const monday = startOfCookingWeek(date);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const format = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' });
  return format.format(monday) + ' – ' + format.format(sunday);
}
