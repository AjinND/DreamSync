/**
 * Operation-specific rate limiters for DreamSync
 *
 * Prevents spam and abuse on mutation operations by enforcing per-user cooldown windows.
 * Each limiter is keyed by userId (or a composite key) to avoid cross-user interference.
 */

import { createCooldownLimiter } from './rateLimiter';
import { AppError, ErrorCode } from './AppError';

// Cooldown windows (in milliseconds)
const LIKE_COOLDOWN_MS = 1_000;      // 1 like per second
const COMMENT_COOLDOWN_MS = 3_000;   // 1 comment per 3 seconds
const REPORT_COOLDOWN_MS = 10_000;   // 1 report per 10 seconds
const CREATE_DREAM_COOLDOWN_MS = 5_000; // 1 dream creation per 5 seconds

export const likeLimiter = createCooldownLimiter(LIKE_COOLDOWN_MS);
export const commentLimiter = createCooldownLimiter(COMMENT_COOLDOWN_MS);
export const reportLimiter = createCooldownLimiter(REPORT_COOLDOWN_MS);
export const createDreamLimiter = createCooldownLimiter(CREATE_DREAM_COOLDOWN_MS);

/**
 * Asserts that the operation is allowed for the given key (typically userId).
 * Throws a user-friendly AppError if rate limited.
 */
export function assertRateLimit(
    limiter: ReturnType<typeof createCooldownLimiter>,
    key: string,
    userMessage: string,
): void {
    if (!limiter.allow(key)) {
        throw new AppError(
            'Rate limit exceeded',
            ErrorCode.VALIDATION_ERROR,
            userMessage,
        );
    }
}
