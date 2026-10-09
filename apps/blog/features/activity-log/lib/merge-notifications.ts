import type { IAccountNotification } from '@hive/common-hiveio-packages/wax';

/**
 * Merge a freshly fetched head page into the already loaded notifications.
 *
 * Head items whose id is not loaded yet are prepended in head order; every
 * loaded item (including pages appended via "Load more") is kept as is and
 * in place. Returns `loaded` itself when the head brings nothing new, so a
 * no-op merge does not re-render.
 */
export function mergeNewNotifications(
  loaded: IAccountNotification[] | null | undefined,
  head: IAccountNotification[] | null | undefined
): IAccountNotification[] | null | undefined {
  if (!head || head.length === 0) return loaded;
  if (!loaded || loaded.length === 0) return head;

  const loadedIds = new Set(loaded.map((item) => item.id));
  const unseen = head.filter((item) => !loadedIds.has(item.id));
  return unseen.length === 0 ? loaded : [...unseen, ...loaded];
}
