import { addDoc, collection, getDocs, orderBy, query, serverTimestamp, where } from 'firebase/firestore';
import { db, friendlyFirebaseError } from './firebase';
import { getWeekKey } from '../utils/weekUtils';

export function getMadeMealIds(records) {
  return new Set(
    records.flatMap((record) => [record.mainMealId, ...(record.sideMealIds || [])]).filter(Boolean)
  );
}

export async function getCurrentWeekMeals(userId) {
  try {
    const weeklyQuery = query(
      collection(db, 'weeklyMeals'),
      where('userId', '==', userId),
      where('weekKey', '==', getWeekKey()),
      orderBy('dateMade', 'desc')
    );
    const snapshot = await getDocs(weeklyQuery);
    return snapshot.docs.map((record) => ({ id: record.id, ...record.data() }));
  } catch (error) {
    throw new Error(friendlyFirebaseError(error));
  }
}

export async function markMealCombinationMade(userId, selection) {
  try {
    const payload = {
      userId,
      mainMealId: selection.main.id,
      sideMealIds: selection.sides.map((side) => side.id),
      mainMeal: { id: selection.main.id, name: selection.main.name },
      sideMeals: selection.sides.map((side) => ({ id: side.id, name: side.name })),
      weekKey: getWeekKey(),
      dateMade: new Date().toISOString(),
      createdAt: serverTimestamp()
    };
    const result = await addDoc(collection(db, 'weeklyMeals'), payload);
    return result.id;
  } catch (error) {
    throw new Error(friendlyFirebaseError(error));
  }
}
