/**
 * Server-side notification utilities
 * Creates in-app notifications and sends push via Expo Push API
 */

import * as admin from "firebase-admin";
import fetch from "node-fetch";

const db = admin.firestore();

interface CreateNotificationPayload {
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  actorId?: string;
  actorName?: string;
  actorAvatar?: string;
}

/**
 * Write a notification document to the `notifications` collection
 */
export async function createNotification(
  payload: CreateNotificationPayload
): Promise<string> {
  const docRef = await db.collection("notifications").add({
    userId: payload.userId,
    type: payload.type,
    title: payload.title,
    body: payload.body,
    data: payload.data ?? {},
    actorId: payload.actorId ?? null,
    actorName: payload.actorName ?? null,
    actorAvatar: payload.actorAvatar ?? null,
    read: false,
    createdAt: Date.now(),
  });
  return docRef.id;
}

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  sound?: string;
  channelId?: string;
}

/**
 * Send push notifications via the Expo Push API
 */
export async function sendPushNotification(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<void> {
  if (tokens.length === 0) return;

  const messages: ExpoPushMessage[] = tokens.map((token) => ({
    to: token,
    title,
    body,
    data,
    sound: "default",
    channelId: "dreamsync-default",
  }));

  try {
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages),
    });
  } catch (error) {
    console.error("Failed to send push notification:", error);
  }
}

// Map notification type → preference key
const PREF_MAP: Record<string, string> = {
  chat_message: "chatMessages",
  chat_added: "chatAdded",
  journey_request_accepted: "journeyRequests",
  journey_request_rejected: "journeyRequests",
  journey_participant_joined: "journeyUpdates",
  journey_updated: "journeyUpdates",
  community_comment: "communityComments",
  community_like: "communityLikes",
  due_date_reminder: "dueDateReminders",
};

/**
 * Check whether a user has the given notification type enabled
 */
export async function shouldNotify(
  userId: string,
  notificationType: string
): Promise<boolean> {
  const userDoc = await db.collection("users").doc(userId).get();
  if (!userDoc.exists) return true; // Default to sending if no settings

  const settings = userDoc.data()?.settings?.notifications;
  if (!settings) return true;

  // Master toggle
  if (settings.pushEnabled === false) return false;

  const prefKey = PREF_MAP[notificationType];
  if (prefKey && settings[prefKey] === false) return false;

  return true;
}

/**
 * Orchestrates: check prefs → create in-app notification → send push
 */
export async function notifyUser(
  userId: string,
  type: string,
  payload: Omit<CreateNotificationPayload, "userId" | "type">
): Promise<void> {
  const enabled = await shouldNotify(userId, type);
  if (!enabled) return;

  // Create in-app notification
  await createNotification({ userId, type, ...payload });

  // Send push
  const userDoc = await db.collection("users").doc(userId).get();
  const tokens: string[] = userDoc.data()?.pushTokens ?? [];
  if (tokens.length > 0) {
    await sendPushNotification(tokens, payload.title, payload.body, payload.data);
  }
}
