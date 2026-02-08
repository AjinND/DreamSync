/**
 * Chat message trigger
 * Notifies chat participants when a new message is sent
 */

import * as admin from "firebase-admin";
import { onValueCreated } from "firebase-functions/v2/database";
import { notifyUser } from "../utils/notifications";

const db = admin.firestore();

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

    if (!message || !message.userId) return;

    const senderId: string = message.userId;
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

        const truncatedText =
          messageText.length > 100
            ? messageText.substring(0, 100) + "..."
            : messageText;

        await notifyUser(recipientId, "chat_message", {
          title: senderName,
          body: truncatedText || "Sent a message",
          data: { chatId },
          actorId: senderId,
          actorName: senderName,
        });
      });

    await Promise.all(notifyPromises);
  }
);
