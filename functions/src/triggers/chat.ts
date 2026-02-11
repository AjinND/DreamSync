/**
 * Chat message trigger
 * Notifies chat participants when a new message is sent
 */

import * as admin from "firebase-admin";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { onValueCreated } from "firebase-functions/v2/database";
import { notifyUser } from "../utils/notifications";

const db = admin.firestore();
const rtdb = admin.database();

/**
 * Trigger: RTDB onCreate on /messages/{chatId}/{messageId}
 * Sends chat_message notifications to all participants except the sender.
 * Dedup: skips if another chat_message notification for the same chatId+userId
 * was created in the last 30 seconds.
 */
export const onNewChatMessage = onValueCreated(
  {
    ref: "/messages/{chatId}/{messageId}",
    instance: "dreamsync-b3a54-default-rtdb",
    region: "asia-southeast1",
  },
  async (event) => {
    const chatId = event.params.chatId;
    const message = event.data.val();

    if (!message) return;

    const senderId: string = message.senderId || message.userId;
    if (!senderId) return;
    const senderName: string = message.userName || "Someone";
    const messageText: string = message.text || "";

    // Get chat participants from Firestore
    const chatDoc = await db.collection("chats").doc(chatId).get();
    if (!chatDoc.exists) return;

    const participants: string[] = chatDoc.data()?.participants ?? [];

    const thirtySecondsAgo = Date.now() - 30_000;

    // Notify each participant except the sender
    const notifyPromises = participants
      .filter((uid) => uid !== senderId)
      .map(async (recipientId) => {
        // Dedup check: skip if recent notification exists for same chat+user
        const recentQuery = await db
          .collection("notifications")
          .where("userId", "==", recipientId)
          .where("type", "==", "chat_message")
          .where("data.chatId", "==", chatId)
          .where("createdAt", ">", thirtySecondsAgo)
          .limit(1)
          .get();

        if (!recentQuery.empty) return;

        // Use generic text for encrypted messages to avoid leaking content
        const isEncrypted = message.encrypted === true;
        const notificationBody = isEncrypted
          ? "Sent an encrypted message"
          : messageText.length > 100
            ? messageText.substring(0, 100) + "..."
            : messageText || "Sent a message";

        await notifyUser(recipientId, "chat_message", {
          title: senderName,
          body: notificationBody,
          data: { chatId },
          actorId: senderId,
          actorName: senderName,
        });
      });

    await Promise.all(notifyPromises);
  }
);

/**
 * Mirrors Firestore chat participants into RTDB chatParticipants/{chatId}
 * so RTDB message rules can enforce chat membership on reads/writes.
 */
export const syncChatParticipants = onDocumentWritten(
  {
    document: "chats/{chatId}",
    region: "asia-southeast1",
  },
  async (event) => {
    const chatId = event.params.chatId;
    const participantsRef = rtdb.ref(`chatParticipants/${chatId}`);
    const after = event.data?.after;

    if (!after?.exists) {
      await participantsRef.remove();
      return;
    }

    const chat = after.data();
    const participants = Array.isArray(chat?.participants) ? chat.participants : [];

    const participantMap: Record<string, true> = {};
    for (const uid of participants) {
      if (typeof uid === "string" && uid.length > 0) {
        participantMap[uid] = true;
      }
    }

    await participantsRef.set(participantMap);
  }
);
