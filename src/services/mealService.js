import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
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
    return snapshot.docs.map((meal) => normaliseMeal(meal.id, meal.data()));
  } catch (error) {
    throw new Error(friendlyFirebaseError(error));
  }
}

export async function getMealById(mealId) {
  if (!firebaseConfigured) {
    return sampleMeals.find((meal) => meal.id === mealId) || null;
  }

  try {
    const snapshot = await getDoc(doc(db, 'meals', mealId));
    return snapshot.exists() ? normaliseMeal(snapshot.id, snapshot.data()) : null;
  } catch (error) {
    throw new Error(friendlyFirebaseError(error));
  }
}
