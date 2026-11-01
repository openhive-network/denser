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

/** Cookie (and localStorage key) holding the user's per-set choices, as the engine serializes them. */
export const API_SETS_COOKIE = 'api-sets';

/**
 * localStorage key of the user's choices: localStorage is shared by every app of the origin, while
 * the cookie is scoped to the app's base path.
 */
export const API_SETS_STORAGE_KEY = `${API_SETS_COOKIE}:${process.env.DENSER_APP ?? 'app'}`;

/** Id of the page's JSON script carrying the server's routes to the browser. */
export const API_SETS_BOOTSTRAP_ID = 'denser-api-sets';
