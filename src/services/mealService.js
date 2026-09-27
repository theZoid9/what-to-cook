import { collection, getDocs } from 'firebase/firestore';
import { db, firebaseConfigured, friendlyFirebaseError } from './firebase';
import { sampleMeals } from '../data/sampleMeals';

function normaliseMeal(id, data) {
  return {
    id,
    name: data.name,
    type: data.type,
    description: data.description || '',
    imageUrl: data.imageUrl || '',
    ingredients: data.ingredients || [],
    instructions: data.instructions || [],
    cookingTime: data.cookingTime || 'Not specified',
    servings: data.servings || 'Not specified',
    difficulty: data.difficulty || 'Not specified'
  };
}

export async function getMeals() {
  if (!firebaseConfigured) {
    return sampleMeals;
  }

  try {
    const snapshot = await getDocs(collection(db, 'meals'));
    const mealsById = new Map(sampleMeals.map((meal) => [meal.id, meal]));
    snapshot.docs.forEach((meal) => mealsById.set(meal.id, normaliseMeal(meal.id, meal.data())));
    return [...mealsById.values()];
  } catch (error) {
    throw new Error(friendlyFirebaseError(error));
  }
}

