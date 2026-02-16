/**
 * Journey update triggers
 * Detects request accepted/rejected, participant joined, and journey metadata updates.
 */

import * as admin from "firebase-admin";
import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { notifyUser } from "../utils/notifications";

const db = admin.firestore();

const RECENT_NOTIFICATION_WINDOW_MS = 30_000;

function hasMeaningfulJourneyUpdate(before: any, after: any): boolean {
  const beforeSettings = JSON.stringify(before?.settings ?? null);
  const afterSettings = JSON.stringify(after?.settings ?? null);
  if (beforeSettings !== afterSettings) return true;

  const beforePreview = JSON.stringify(before?.preview ?? null);
  const afterPreview = JSON.stringify(after?.preview ?? null);
  if (beforePreview !== afterPreview) return true;

  if ((before?.status ?? null) !== (after?.status ?? null)) return true;

  return false;
}

/**
 * Trigger: Firestore onUpdate on journeys/{journeyId}
 * Detects:
 * - Request accepted: userId removed from requests[] AND added to participants[]
 * - Request rejected: userId removed from requests[] but NOT added to participants[]
 * - New participant joined (direct): new entry in participants[] not from requests
 * - Chat added: participant was added to journey and should get a chat_added notification
 * - Journey metadata changed: notify other participants with journey_updated
 */
export const onJourneyUpdate = onDocumentUpdated(
  "journeys/{journeyId}",
  async (event) => {
    if (!event.data) return;

    const before = event.data.before.data();
    const after = event.data.after.data();
    const journeyId = event.params.journeyId;

    const beforeRequests: string[] = before.requests ?? [];
    const afterRequests: string[] = after.requests ?? [];
    const beforeParticipants: string[] = before.participants ?? [];
    const afterParticipants: string[] = after.participants ?? [];

    const dreamTitle = after.preview?.title || "a journey";
    const dreamId = after.dreamId;
    const chatId = typeof after.chatId === "string" ? after.chatId : "";

    // Find users removed from requests
    const removedFromRequests = beforeRequests.filter(
      (uid) => !afterRequests.includes(uid)
    );

    // Find users added to participants
    const addedToParticipants = afterParticipants.filter(
      (uid) => !beforeParticipants.includes(uid)
    );

    const promises: Promise<void>[] = [];

    // Notify newly added participants that they were added to the journey chat (deduped).
    const thirtySecondsAgo = Date.now() - RECENT_NOTIFICATION_WINDOW_MS;
    for (const newUserId of addedToParticipants) {
      const recentQuery = await db
        .collection("notifications")
        .where("userId", "==", newUserId)
        .where("type", "==", "chat_added")
        .where("createdAt", ">", thirtySecondsAgo)
        .limit(5)
        .get();

      const hasRecentJourneyChatAdded = recentQuery.docs.some((doc) => {
        const data = doc.data()?.data;
        return data?.journeyId === journeyId;
      });

      if (!hasRecentJourneyChatAdded) {
        const data: Record<string, string> = { journeyId, dreamId };
        if (chatId) data.chatId = chatId;

        promises.push(
          notifyUser(newUserId, "chat_added", {
            title: "Added to Journey Chat",
            body: `You were added to the chat for "${dreamTitle}"`,
            data,
          })
        );
      }
    }

    for (const userId of removedFromRequests) {
      if (addedToParticipants.includes(userId)) {
        // Request ACCEPTED
        promises.push(
          notifyUser(userId, "journey_request_accepted", {
            title: "Request Accepted",
            body: `Your request to join "${dreamTitle}" was accepted!`,
            data: { journeyId, dreamId },
          })
        );
      } else {
        // Request REJECTED
        promises.push(
          notifyUser(userId, "journey_request_rejected", {
            title: "Request Update",
            body: `Your request to join "${dreamTitle}" was not accepted.`,
            data: { journeyId, dreamId },
          })
        );
      }
    }

    const updatedBy = typeof after.updatedBy === "string" ? after.updatedBy : "";
    if (updatedBy && hasMeaningfulJourneyUpdate(before, after)) {
      const actorDoc = await db.collection("users").doc(updatedBy).get();
      const actorName = actorDoc.data()?.displayName || "Someone";

      for (const participantId of afterParticipants) {
        if (participantId === updatedBy) continue;

        promises.push(
          notifyUser(participantId, "journey_updated", {
            title: "Journey Updated",
            body: `${actorName} updated "${dreamTitle}"`,
            data: { journeyId, dreamId },
            actorId: updatedBy,
            actorName,
          })
        );
      }
    }

    // Detect new participants that weren't in requests (direct join)
    const directJoins = addedToParticipants.filter(
      (uid) => !removedFromRequests.includes(uid)
    );

    if (directJoins.length > 0) {
      for (const newUserId of directJoins) {
        const userDoc = await db.collection("users").doc(newUserId).get();
        const newUserName = userDoc.data()?.displayName || "Someone";

        const existingParticipants = beforeParticipants.filter(
          (uid) => uid !== newUserId
        );

        for (const existingUid of existingParticipants) {
          promises.push(
            notifyUser(existingUid, "journey_participant_joined", {
              title: "New Journey Member",
              body: `${newUserName} joined "${dreamTitle}"`,
              data: { journeyId, dreamId },
              actorId: newUserId,
              actorName: newUserName,
            })
          );
        }
      }
    }

    await Promise.all(promises);
  }
);
