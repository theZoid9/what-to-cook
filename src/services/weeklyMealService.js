import { addDoc, collection, doc, getDocs, orderBy, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
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

export async function saveVotedMealToWeek(userId, poll) {
  try {
    const recordId = `${userId}-${poll.id}`;
    const payload = {
      userId,
      mainMealId: poll.main.id,
      sideMealIds: [poll.side.id],
      mainMeal: { id: poll.main.id, name: poll.main.name },
      sideMeals: [{ id: poll.side.id, name: poll.side.name }],
      sourceVoteId: poll.id,
      weekKey: getWeekKey(),
      dateMade: new Date().toISOString(),
      createdAt: serverTimestamp()
    };
    await setDoc(doc(db, 'weeklyMeals', recordId), payload, { merge: true });
    return recordId;
  } catch (error) {
    throw new Error(friendlyFirebaseError(error));
  }
}
