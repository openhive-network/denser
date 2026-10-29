import type { IAccountNotification, IUnreadNotifications } from '@hive/common-hiveio-packages/wax';

/**
 * The naive-UTC `YYYY-MM-DDTHH:MM:SS` of a node's timestamp: notification dates come with a `T`,
 * `unread_notifications.lastread` with a space; both are UTC without a zone marker.
 */
const naiveUtc = (date: string): string => date.replace(' ', 'T').slice(0, 19);

/** How far behind the browser's clock a marker without a row to take is put, for a clock ahead of the chain. */
const CLOCK_MARGIN_MS = 60_000;

/**
 * The `set_last_read` date that marks `rows` read: the newest row's date, which the chain has
 * passed already (lite_social refuses a date after the op's block time). Without rows, the
 * browser's time less a margin.
 */
export function liteReadMarkerDate(rows: readonly IAccountNotification[] | null | undefined, nowMs = Date.now()): string {
  const newest = rows?.reduce<string | null>((latest, row) => {
    const date = naiveUtc(row.date);
    return latest === null || date > latest ? date : latest;
  }, null);
  return newest ?? new Date(nowMs - CLOCK_MARGIN_MS).toISOString().slice(0, 19);
}

/** Whether a node's unread answer reflects a `set_last_read` of `date` (its marker is at least that). */
export function showsLiteReadMarker(unread: IUnreadNotifications, date: string): boolean {
  return !!unread.lastread && naiveUtc(unread.lastread) >= naiveUtc(date);
}
