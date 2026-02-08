/**
 * Journey update triggers
 * Detects request accepted/rejected, participant joined
 */

import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { notifyUser } from "../utils/notifications";

const db = admin.firestore();

/**
 * Trigger: Firestore onUpdate on journeys/{journeyId}
 * Detects:
 * - Request accepted: userId removed from requests[] AND added to participants[]
 * - Request rejected: userId removed from requests[] but NOT added to participants[]
 * - New participant joined (direct): new entry in participants[] not from requests
 */
export const onJourneyUpdate = functions.firestore
  .document("journeys/{journeyId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const journeyId = context.params.journeyId;

    const beforeRequests: string[] = before.requests ?? [];
    const afterRequests: string[] = after.requests ?? [];
    const beforeParticipants: string[] = before.participants ?? [];
    const afterParticipants: string[] = after.participants ?? [];

    const dreamTitle = after.preview?.title || "a journey";
    const dreamId = after.dreamId;

    // Find users removed from requests
    const removedFromRequests = beforeRequests.filter(
      (uid) => !afterRequests.includes(uid)
    );

    // Find users added to participants
    const addedToParticipants = afterParticipants.filter(
      (uid) => !beforeParticipants.includes(uid)
    );

    const promises: Promise<void>[] = [];

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

    // Detect new participants that weren't in requests (direct join)
    const directJoins = addedToParticipants.filter(
      (uid) => !removedFromRequests.includes(uid)
    );

    if (directJoins.length > 0) {
      // Notify existing participants about new joiners
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
  });
