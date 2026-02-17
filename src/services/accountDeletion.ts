import { auth, db, rtdb } from '@/firebaseConfig';
import { useBucketStore } from '@/src/store/useBucketStore';
import { useChatStore } from '@/src/store/useChatStore';
import { useNotificationStore } from '@/src/store/useNotificationStore';
import { AppError, ErrorCode } from '@/src/utils/AppError';
import { deleteUser } from 'firebase/auth';
import {
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  writeBatch,
} from 'firebase/firestore';
import { get, ref, update } from 'firebase/database';
import { JourneysService } from './journeys';
import { KeyManager } from './keyManager';
import { NotificationService } from './notifications';
import { StorageService } from './storage';
import { ItemService } from './items';

const BATCH_LIMIT = 450;

const chunk = <T>(items: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
};

const batchDeleteByPath = async (paths: { collectionPath: string; id: string }[]) => {
  const groups = chunk(paths, BATCH_LIMIT);
  for (const group of groups) {
    const batch = writeBatch(db);
    group.forEach(({ collectionPath, id }) => {
      batch.delete(doc(db, collectionPath, id));
    });
    await batch.commit();
  }
};

const deleteOwnedDreams = async (userId: string): Promise<void> => {
  const itemsSnap = await getDocs(query(collection(db, 'items'), where('userId', '==', userId)));

  for (const itemDoc of itemsSnap.docs) {
    const dreamId = itemDoc.id;
    const itemData = itemDoc.data() as any;

    const commentsSnap = await getDocs(collection(db, 'items', dreamId, 'comments'));
    if (!commentsSnap.empty) {
      await batchDeleteByPath(
        commentsSnap.docs.map((commentDoc) => ({
          collectionPath: `items/${dreamId}/comments`,
          id: commentDoc.id,
        }))
      );
    }

    const [memories, progressEntries] = await Promise.all([
      ItemService.getMemories(dreamId).catch(() => []),
      ItemService.getProgress(dreamId).catch(() => []),
    ]);
    await StorageService.deleteDreamAssets(
      userId,
      dreamId,
      { id: dreamId, ...itemData, memories, progress: progressEntries } as any
    ).catch(() => {});
    if (typeof itemData.mainImage === 'string' && itemData.mainImage.length > 0) {
      await StorageService.deleteImageByUrl(itemData.mainImage).catch(() => {});
    }

    await deleteDoc(doc(db, 'items', dreamId));
  }
};

const leaveOrDeleteJourneys = async (userId: string): Promise<void> => {
  const journeys = await JourneysService.getUserJourneys(userId);
  for (const journey of journeys) {
    if (journey.ownerId === userId) {
      await JourneysService.deleteJourney(journey.id, userId);
    } else {
      await JourneysService.leaveJourney(journey.id, userId);
    }
  }
};

const deleteAuthoredComments = async (userId: string): Promise<void> => {
  const commentsSnap = await getDocs(
    query(collectionGroup(db, 'comments'), where('userId', '==', userId))
  );
  if (commentsSnap.empty) return;

  const groups = chunk(commentsSnap.docs, BATCH_LIMIT);
  for (const group of groups) {
    const batch = writeBatch(db);
    group.forEach((commentDoc) => batch.delete(commentDoc.ref));
    await batch.commit();
  }
};

const deleteUserMessagesFromChats = async (userId: string): Promise<void> => {
  const chatsSnap = await getDocs(
    query(collection(db, 'chats'), where('participants', 'array-contains', userId))
  );

  for (const chatDoc of chatsSnap.docs) {
    const chatId = chatDoc.id;
    const messagesRef = ref(rtdb, `messages/${chatId}`);
    const snapshot = await get(messagesRef);
    const messages = snapshot.val() as Record<string, any> | null;
    if (!messages) continue;

    const updates: Record<string, null> = {};
    Object.entries(messages).forEach(([messageId, message]) => {
      if (message?.senderId === userId) {
        updates[messageId] = null;
      }
    });

    if (Object.keys(updates).length > 0) {
      await update(messagesRef, updates);
    }
  }
};

const deleteUserProfileDocs = async (userId: string): Promise<void> => {
  await Promise.allSettled([
    deleteDoc(doc(db, 'users', userId, 'private', 'settings')),
    deleteDoc(doc(db, 'users', userId, 'private', 'keys')),
  ]);
  await deleteDoc(doc(db, 'users', userId));
};

export const AccountDeletionService = {
  async deleteCurrentAccount(onProgress?: (message: string) => void): Promise<void> {
    const user = auth.currentUser;
    if (!user) {
      throw new AppError('User not authenticated', ErrorCode.AUTH_REQUIRED, 'Please sign in first.');
    }

    const userId = user.uid;

    try {
      onProgress?.('Cleaning up journeys...');
      await leaveOrDeleteJourneys(userId);

      onProgress?.('Deleting dreams and media...');
      await deleteOwnedDreams(userId);

      onProgress?.('Removing comments and messages...');
      await Promise.all([
        deleteAuthoredComments(userId),
        deleteUserMessagesFromChats(userId),
      ]);

      onProgress?.('Deleting profile and private data...');
      await NotificationService.removeStoredPushTokenFromServer().catch(() => {});
      await deleteUserProfileDocs(userId);

      onProgress?.('Deleting authentication account...');
      await deleteUser(user);
    } catch (error: any) {
      if (error?.code === 'auth/requires-recent-login') {
        throw new AppError(
          'Recent login required',
          ErrorCode.AUTH_REQUIRED,
          'Please sign in again, then retry account deletion.'
        );
      }
      throw new AppError(
        `Account deletion failed: ${String(error?.message || error)}`,
        ErrorCode.UNKNOWN,
        'Could not delete your account completely. Please try again.'
      );
    } finally {
      onProgress?.('Clearing local data...');
      await KeyManager.clearKeys().catch(() => {});
      useChatStore.getState().clear();
      useNotificationStore.getState().clear();
      useBucketStore.getState().clearSubscriptions();
      useBucketStore.setState({
        items: [],
        filteredItems: [],
        itemMap: {},
        itemsCursor: null,
        hasMore: true,
        isFetchingMore: false,
        searchQuery: '',
        error: null,
      });
    }
  },
};
