/**
 * DreamSync Cloud Functions — Entry Point
 */

import * as admin from "firebase-admin";

admin.initializeApp();

// Chat triggers
export { onNewChatMessage } from "./triggers/chat";

// Journey triggers
export { onJourneyUpdate } from "./triggers/journeys";

// Community triggers
export { onNewComment, onDreamLiked } from "./triggers/community";

// Scheduled reminders
export { checkDueDateReminders } from "./triggers/reminders";
