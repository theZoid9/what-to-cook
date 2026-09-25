import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { sampleMeals } from '../src/data/sampleMeals.js';

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error('Set GOOGLE_APPLICATION_CREDENTIALS to your Firebase service-account JSON path before running this script.');
  process.exit(1);
}

if (!getApps().length) {
  initializeApp({ credential: applicationDefault() });
}

const db = getFirestore();

await Promise.all(
  sampleMeals.map(({ id, ...meal }) =>
    db.collection('meals').doc(id).set(
      {
        ...meal,
        updatedAt: new Date().toISOString()
      },
      { merge: true }
    )
  )
);

console.log('Seeded ' + sampleMeals.length + ' meals.');
