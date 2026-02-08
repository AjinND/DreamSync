/**
 * Community triggers
 * Notifies dream owners about new comments and likes on public dreams
 */

import * as admin from "firebase-admin";
import {
  onDocumentCreated,
  onDocumentUpdated,
} from "firebase-functions/v2/firestore";
import { notifyUser } from "../utils/notifications";

const db = admin.firestore();

/**
 * Comment trigger: Firestore onCreate on items/{dreamId}/comments/{commentId}
 * Notifies the dream owner when someone else comments
 */
export const onNewComment = onDocumentCreated(
  "items/{dreamId}/comments/{commentId}",
  async (event) => {
    if (!event.data) return;

    const dreamId = event.params.dreamId;
    const commentId = event.params.commentId;
    const comment = event.data.data();

    const commenterId: string = comment.userId;
    const commenterName: string = comment.userName || "Someone";

    // Get the dream to find owner
    const dreamDoc = await db.collection("items").doc(dreamId).get();
    if (!dreamDoc.exists) return;

    const ownerId: string = dreamDoc.data()?.userId;
    const dreamTitle: string = dreamDoc.data()?.title || "your dream";

    // Don't notify if owner commented on their own dream
    if (commenterId === ownerId) return;

    const truncatedText =
      comment.text && comment.text.length > 80
        ? comment.text.substring(0, 80) + "..."
        : comment.text || "Left a comment";

    await notifyUser(ownerId, "community_comment", {
      title: `${commenterName} commented`,
      body: `"${truncatedText}" on "${dreamTitle}"`,
      data: { dreamId, commentId },
      actorId: commenterId,
      actorName: commenterName,
      actorAvatar: comment.userAvatar,
    });
  }
);

/**
 * Like trigger: Firestore onUpdate on items/{dreamId}
 * Diffs before/after likes arrays and notifies the owner for each new liker
 */
export const onDreamLiked = onDocumentUpdated(
  "items/{dreamId}",
  async (event) => {
    if (!event.data) return;

    const dreamId = event.params.dreamId;
    const before = event.data.before.data();
    const after = event.data.after.data();

    const beforeLikes: string[] = before.likes ?? [];
    const afterLikes: string[] = after.likes ?? [];

    // Find newly added likers
    const newLikers = afterLikes.filter((uid) => !beforeLikes.includes(uid));
    if (newLikers.length === 0) return;

    const ownerId: string = after.userId;
    const dreamTitle: string = after.title || "your dream";

    const promises = newLikers
      .filter((uid) => uid !== ownerId) // Don't notify self-like
      .map(async (likerId) => {
        const userDoc = await db.collection("users").doc(likerId).get();
        const likerName = userDoc.data()?.displayName || "Someone";
        const likerAvatar = userDoc.data()?.avatar;

        await notifyUser(ownerId, "community_like", {
          title: `${likerName} liked your dream`,
          body: `"${dreamTitle}" got some love!`,
          data: { dreamId },
          actorId: likerId,
          actorName: likerName,
          actorAvatar: likerAvatar,
        });
      });

    await Promise.all(promises);
  }
);
