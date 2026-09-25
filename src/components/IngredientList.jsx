import React from 'react';

export default function IngredientList({ ingredients }) {
  if (!ingredients.length) {
    return <p className="muted">Ingredients will be added soon.</p>;
  }

  return (
    <ul className="ingredient-list">
      {ingredients.map((ingredient, index) => (
        <li key={ingredient.name + index}>
          <span>{ingredient.name}</span>
          <strong>
            {ingredient.quantity ? ingredient.quantity + ' ' : ''}
            {ingredient.unit}
          </strong>
        </li>
      ))}
    </ul>
  );
}
