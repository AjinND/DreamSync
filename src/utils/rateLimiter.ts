type Key = string;

export function createCooldownLimiter(windowMs: number) {
  const lastCall = new Map<Key, number>();

  return {
    allow(key: Key = '__global__'): boolean {
      const now = Date.now();
      const prev = lastCall.get(key) ?? 0;
      if (now - prev < windowMs) return false;
      lastCall.set(key, now);
      return true;
    },
    reset(key?: Key) {
      if (key) {
        lastCall.delete(key);
      } else {
        lastCall.clear();
      }
    },
  };
}

export function createExponentialBackoffLimiter(
  baseLockMs: number = 30_000,
  freeAttempts: number = 5
) {
  const failedAttempts = new Map<Key, number>();
  const lockUntil = new Map<Key, number>();

  const getRetryAfterMs = (key: Key): number => {
    const unlockAt = lockUntil.get(key) ?? 0;
    return Math.max(0, unlockAt - Date.now());
  };

  return {
    canProceed(key: Key = '__global__'): { allowed: boolean; retryAfterMs: number } {
      const retryAfterMs = getRetryAfterMs(key);
      return { allowed: retryAfterMs === 0, retryAfterMs };
    },
    registerFailure(key: Key = '__global__') {
      const attempts = (failedAttempts.get(key) ?? 0) + 1;
      failedAttempts.set(key, attempts);

      if (attempts > freeAttempts) {
        const lockStep = attempts - freeAttempts;
        const lockMs = baseLockMs * Math.max(1, lockStep);
        lockUntil.set(key, Date.now() + lockMs);
      }
    },
    registerSuccess(key: Key = '__global__') {
      failedAttempts.delete(key);
      lockUntil.delete(key);
    },
  };
}

