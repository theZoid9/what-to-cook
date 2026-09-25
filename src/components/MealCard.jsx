import React from 'react';
import { Clock3, UsersRound } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function MealCard({ meal, compact = false }) {
  return (
    <article className={'meal-card ' + (compact ? 'meal-card--compact' : '')}>
      <div className="meal-card__type">{meal.type === 'main' ? 'Main' : 'Side'}</div>
      <h3>{meal.name}</h3>
      {!compact && <p>{meal.description}</p>}
      <div className="meal-card__meta">
        <span><Clock3 size={15} aria-hidden="true" /> {meal.cookingTime}</span>
        <span><UsersRound size={15} aria-hidden="true" /> {meal.servings}</span>
      </div>
      <Link className="text-link" to={'/meals/' + meal.id}>View recipe</Link>
    </article>
  );
}
