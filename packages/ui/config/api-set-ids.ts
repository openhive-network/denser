/**
 * The ids of denser's API sets and the names that carry their routes and the user's choices, apart
 * from their config (`./api-sets.ts`), so the browser's read path loads only these.
 */

export const API_SET_IDS = [
  'core',
  'bridge',
  'lite',
  'hivemind-rest',
  'balance-api',
  'hafah',
  'hivesense',
  'fyp'
] as const;

export type TApiSetId = (typeof API_SET_IDS)[number];

export const isApiSetId = (value: string): value is TApiSetId => API_SET_IDS.some((setId) => setId === value);

/**
 * The cookie that once carried the user's per-set choices to the server, which no longer routes by
 * them: the browser expires it where it finds it.
 */
export const API_SETS_COOKIE = 'api-sets';

/**
 * localStorage key of the user's per-set choices, as the engine serializes them, per app: localStorage
 * is shared by every app of the origin, whose catalogs may differ.
 */
export const API_SETS_STORAGE_KEY = `api-sets:${process.env.DENSER_APP ?? 'app'}`;

/** Id of the page's JSON script carrying the server's routes to the browser. */
export const API_SETS_BOOTSTRAP_ID = 'denser-api-sets';
