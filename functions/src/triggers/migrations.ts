import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { auth } from 'firebase-functions/v1';

const db = admin.firestore();

const assertAdmin = async (uid: string) => {
  const userDoc = await db.collection('users').doc(uid).get();
  const isAdmin = userDoc.exists && userDoc.data()?.role === 'admin';
  if (!isAdmin) {
    throw new HttpsError('permission-denied', 'Admin role required.');
  }
};

export const migrateSubItems = onCall({ region: 'asia-southeast1' }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Authentication required.');
  await assertAdmin(request.auth.uid);

  const itemsSnapshot = await db.collection('items').get();
  let migratedCount = 0;

  for (const itemDoc of itemsSnapshot.docs) {
    const item = itemDoc.data() as any;
    const itemRef = itemDoc.ref;
    const batch = db.batch();
    let touched = false;

    const migrateArray = (field: string, subcollection: string) => {
      const entries = Array.isArray(item[field]) ? item[field] : [];
      entries.forEach((entry: any) => {
        const entryId = entry?.id || db.collection('_').doc().id;
        batch.set(itemRef.collection(subcollection).doc(entryId), entry, { merge: true });
      });
      if (entries.length > 0) {
        batch.update(itemRef, { [field]: admin.firestore.FieldValue.delete() });
        touched = true;
      }
    };

    migrateArray('memories', 'memories');
    migrateArray('progress', 'progress');
    migrateArray('expenses', 'expenses');
    migrateArray('reflections', 'reflections');
    migrateArray('inspirations', 'inspirations');

    if (touched) {
      await batch.commit();
      migratedCount += 1;
    }
  }

  return { migratedCount };
});

export const migrateLikes = onCall({ region: 'asia-southeast1' }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Authentication required.');
  await assertAdmin(request.auth.uid);

  const itemsSnapshot = await db.collection('items').get();
  let migratedCount = 0;

  for (const itemDoc of itemsSnapshot.docs) {
    const item = itemDoc.data() as any;
    const likes = Array.isArray(item.likes) ? item.likes : [];
    if (likes.length === 0 && typeof item.likesCount === 'number') continue;

    const batch = db.batch();
    likes.forEach((uid: string) => {
      const likeRef = itemDoc.ref.collection('likes').doc(uid);
      batch.set(likeRef, { createdAt: Date.now() }, { merge: true });
    });
    batch.update(itemDoc.ref, {
      likesCount: likes.length,
      likes: admin.firestore.FieldValue.delete(),
    });

    await batch.commit();
    migratedCount += 1;
  }

  return { migratedCount };
});

export const onUserDeletedCleanup = auth.user().onDelete(async (user) => {
    const uid = user.uid;
    if (!uid) return;

    await Promise.allSettled([
      db.doc(`users/${uid}/private/settings`).delete(),
      db.doc(`users/${uid}/private/keys`).delete(),
      db.doc(`users/${uid}`).delete(),
    ]);
});
