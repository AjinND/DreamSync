/**
 * Settings Migration Utility
 * Migrates legacy notification settings to the new NotificationPreferences shape
 */

import { DEFAULT_NOTIFICATION_PREFERENCES, NotificationPreferences } from '../types/notification';

interface LegacyShape {
    comments?: boolean;
    likes?: boolean;
    mentions?: boolean;
    journeyInvites?: boolean;
}

/**
 * Detects whether the given settings object uses the legacy schema
 * (has `comments` key but no `pushEnabled` key)
 */
export function isLegacySettings(settings: Record<string, unknown>): boolean {
    return 'comments' in settings && !('pushEnabled' in settings);
}

/**
 * Migrates legacy 4-toggle notification settings to the expanded NotificationPreferences.
 * - comments   → communityComments
 * - likes      → communityLikes
 * - journeyInvites → journeyRequests
 * - mentions   → dropped (no equivalent)
 * - All new fields default to true
 */
export function migrateNotificationSettings(legacy: LegacyShape): NotificationPreferences {
    return {
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        communityComments: legacy.comments ?? true,
        communityLikes: legacy.likes ?? true,
        journeyRequests: legacy.journeyInvites ?? true,
    };
}
