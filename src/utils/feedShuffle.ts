/**
 * Feed Shuffle Utility
 * Fisher-Yates shuffle with own-post deprioritization for the community feed
 */

import { BucketItem } from '../types/item';

/**
 * Fisher-Yates (Knuth) shuffle -- produces a uniformly random permutation.
 * Returns a NEW array (does not mutate input).
 */
function fisherYatesShuffle<T>(items: readonly T[]): T[] {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = result[i];
        result[i] = result[j];
        result[j] = temp;
    }
    return result;
}

/**
 * Shuffle dreams for the community feed with own-post deprioritization.
 *
 * Algorithm:
 * 1. Separate items into "others" and "own" buckets.
 * 2. Shuffle both buckets independently.
 * 3. Interleave own items at every OWN_POST_INTERVAL positions,
 *    starting no earlier than position MIN_BEFORE_OWN.
 *    This ensures the user sees mostly other people's content first.
 *
 * @param dreams - All public dreams (unfiltered or filtered by category)
 * @param currentUserId - The logged-in user's ID (null if unauthenticated)
 * @returns A new shuffled array with own posts deprioritized
 */
export function shuffleFeed(
    dreams: readonly BucketItem[],
    currentUserId: string | null
): BucketItem[] {
    if (dreams.length <= 1) return [...dreams];

    // If no user is logged in, just shuffle everything
    if (!currentUserId) return fisherYatesShuffle(dreams);

    const otherDreams = dreams.filter(d => d.userId !== currentUserId);
    const ownDreams = dreams.filter(d => d.userId === currentUserId);

    // If user has no own dreams in feed, just shuffle others
    if (ownDreams.length === 0) return fisherYatesShuffle(otherDreams);

    // Shuffle both groups
    const shuffledOthers = fisherYatesShuffle(otherDreams);
    const shuffledOwn = fisherYatesShuffle(ownDreams);

    // Interleave: place 1 own post for every OWN_POST_INTERVAL others,
    // starting no earlier than position MIN_BEFORE_OWN.
    const OWN_POST_INTERVAL = 5; // 1 own post per 5 others
    const MIN_BEFORE_OWN = 3;    // At least 3 others before first own post

    const result: BucketItem[] = [];
    let ownIndex = 0;
    let otherIndex = 0;

    while (otherIndex < shuffledOthers.length || ownIndex < shuffledOwn.length) {
        // Add others first
        if (otherIndex < shuffledOthers.length) {
            result.push(shuffledOthers[otherIndex]);
            otherIndex++;
        }

        // Check if it's time to insert an own post
        const positionInFeed = result.length;
        const shouldInsertOwn =
            ownIndex < shuffledOwn.length &&
            positionInFeed >= MIN_BEFORE_OWN &&
            (positionInFeed - MIN_BEFORE_OWN) % OWN_POST_INTERVAL === 0;

        if (shouldInsertOwn) {
            result.push(shuffledOwn[ownIndex]);
            ownIndex++;
        }
    }

    // Append any remaining own posts at the end
    while (ownIndex < shuffledOwn.length) {
        result.push(shuffledOwn[ownIndex]);
        ownIndex++;
    }

    return result;
}