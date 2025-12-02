export const DRAFT_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * Cleans up large / stale entries in localStorage related to post drafts.
 *
 * Currently targets keys starting with:
 * - "postData-edit-"
 * - "postData-new-"
 *
 * Entries are expected to have an `updatedAt` timestamp (number, ms since epoch).
 * Older entries are removed to prevent unbounded localStorage growth.
 */
export function cleanupPostDraftsFromLocalStorage(now: number = Date.now()) {
  if (typeof window === 'undefined' || !window.localStorage) return;

  const storage = window.localStorage;
  const keysToCheck: string[] = [];

  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (!key) continue;
    if (key.startsWith('postData-edit-') || key.startsWith('postData-new-')) {
      keysToCheck.push(key);
    }
  }

  keysToCheck.forEach((key) => {
    const raw = storage.getItem(key);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as { updatedAt?: number };
      const updatedAt = typeof parsed?.updatedAt === 'number' ? parsed.updatedAt : undefined;

      if (!updatedAt) {
        // Legacy entry without timestamp – leave it untouched to avoid
        // accidentally deleting a draft the user still cares about.
        return;
      }

      if (now - updatedAt > DRAFT_TTL_MS) {
        storage.removeItem(key);
      }
    } catch {
      // If parsing fails, skip – we don't want to accidentally delete
      // data that doesn't match the expected shape.
      return;
    }
  });
}
