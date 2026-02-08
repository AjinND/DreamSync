/**
 * Due date reminder trigger
 * Scheduled function that runs daily to check for approaching target dates
 */

import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { notifyUser } from "../utils/notifications";

const db = admin.firestore();

/**
 * Runs daily at 9:00 AM UTC
 * Checks for dreams with targetDate approaching in 7 days or 1 day
 * Uses reminder flags on the item to avoid duplicate notifications
 */
export const checkDueDateReminders = functions.pubsub
  .schedule("0 9 * * *")
  .timeZone("UTC")
  .onRun(async () => {
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const sevenDaysFromNow = now + 7 * oneDayMs;
    const oneDayFromNow = now + 1 * oneDayMs;

    // Query items with a targetDate set, not yet done
    const snapshot = await db
      .collection("items")
      .where("phase", "in", ["dream", "doing"])
      .get();

    const promises: Promise<void>[] = [];

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const targetDate: number | undefined = data.targetDate;
      if (!targetDate) continue;

      const userId: string = data.userId;
      const dreamTitle: string = data.title || "A dream";
      const dreamId = doc.id;

      const daysUntil = Math.ceil((targetDate - now) / oneDayMs);

      // 7-day reminder
      if (
        daysUntil <= 7 &&
        daysUntil > 1 &&
        !data.reminder_7d
      ) {
        promises.push(
          (async () => {
            await notifyUser(userId, "due_date_reminder", {
              title: "Target Date Approaching",
              body: `"${dreamTitle}" is due in ${daysUntil} days!`,
              data: { dreamId },
            });
            await db.collection("items").doc(dreamId).update({
              reminder_7d: true,
            });
          })()
        );
      }

      // 1-day reminder
      if (
        daysUntil <= 1 &&
        daysUntil >= 0 &&
        !data.reminder_1d
      ) {
        promises.push(
          (async () => {
            await notifyUser(userId, "due_date_reminder", {
              title: "Due Tomorrow!",
              body: `"${dreamTitle}" is due tomorrow. Time to make it happen!`,
              data: { dreamId },
            });
            await db.collection("items").doc(dreamId).update({
              reminder_1d: true,
            });
          })()
        );
      }
    }

    await Promise.all(promises);
  });
