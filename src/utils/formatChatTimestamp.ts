import {
  format,
  isToday,
  isYesterday,
  differenceInMinutes,
  differenceInHours,
  differenceInDays,
} from 'date-fns';

/**
 * Format timestamp for message bubbles
 * - Today → "1:45 PM" (time only)
 * - Yesterday → "Yesterday"
 * - < 7 days → day name ("Monday")
 * - Older → "Feb 10"
 * - Null/undefined → "" (guard for RTDB serverTimestamp latency)
 */
export function formatMessageTime(timestamp: number | null | undefined): string {
  if (!timestamp) return '';

  const date = new Date(timestamp);

  if (isToday(date)) {
    return format(date, 'h:mm a');
  }

  if (isYesterday(date)) {
    return 'Yesterday';
  }

  const daysAgo = differenceInDays(new Date(), date);
  if (daysAgo < 7) {
    return format(date, 'EEEE'); // Day name (e.g., "Monday")
  }

  return format(date, 'MMM d'); // e.g., "Feb 10"
}

/**
 * Format timestamp for chat list
 * - < 1 min → "Just now"
 * - < 60 min → "5 min ago"
 * - < 24 hrs (today) → "3 hr ago"
 * - Yesterday → "Yesterday"
 * - < 7 days → day name ("Tuesday")
 * - Older → "Feb 10"
 * - Null/undefined → ""
 */
export function formatChatListTime(timestamp: number | null | undefined): string {
  if (!timestamp) return '';

  const date = new Date(timestamp);
  const now = new Date();

  const minutesAgo = differenceInMinutes(now, date);
  if (minutesAgo < 1) {
    return 'Just now';
  }

  if (minutesAgo < 60) {
    return `${minutesAgo} min ago`;
  }

  const hoursAgo = differenceInHours(now, date);
  if (isToday(date) && hoursAgo < 24) {
    return `${hoursAgo} hr ago`;
  }

  if (isYesterday(date)) {
    return 'Yesterday';
  }

  const daysAgo = differenceInDays(now, date);
  if (daysAgo < 7) {
    return format(date, 'EEEE'); // Day name (e.g., "Tuesday")
  }

  return format(date, 'MMM d'); // e.g., "Feb 10"
}
