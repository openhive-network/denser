/**
 * Denser's API sets: the families of Hive APIs it sends to one node each, chosen by the
 * healthchecker engine (`@hiveio/healthchecker-component/engine`). This module holds only plain
 * data, the node catalog and the operator's preference order per set, so the CSP, the server and
 * the browser derive them from one place without loading the engine.
 */

import { API_SET_IDS, API_SETS_COOKIE, isApiSetId, type TApiSetId } from './api-set-ids.ts';

export {
  API_SET_IDS,
  API_SETS_BOOTSTRAP_ID,
  API_SETS_COOKIE,
  isApiSetId,
  type TApiSetId
} from './api-set-ids.ts';

/** Titles of the sets' tabs on /healthchecker: API names, the same in every language. */
export const API_SET_TITLES: Readonly<Record<TApiSetId, string>> = {
  core: 'Hive core (database, condenser, broadcast)',
  bridge: 'Bridge',
  lite: 'Lite accounts',
  'hivemind-rest': 'Hivemind REST',
  'balance-api': 'Balance API',
  hafah: 'HAfAH',
  hivesense: 'HiveSense',
  fyp: 'For You feed'
};

/**
 * Public API nodes users may pick for any set they serve, on every deployment. They are in the
 * catalog (and the CSP's `connect-src`); a set's calls fail over to them, behind the operator's
 * nodes, once the engine found them serving the set.
 */
export const SELECTABLE_API_NODES: readonly string[] = [
  'https://api.hive.blog',
  'https://api.openhive.network',
  'https://api.syncad.com',
  'https://anyx.io',
  'https://techcoderx.com',
  'https://hive.roelandp.nl',
  'https://api.deathwing.me',
  'https://api.c0ff33a.uk',
  'https://hive-api.arcange.eu',
  'https://hive-api.3speak.tv',
  'https://hiveapi.actifit.io'
];

/**
 * The sets the wallet reads: accounts and broadcasts, profiles, lite accounts' follows, the account
 * history of its transfers list (hivemind REST), balances and HAfAH's account history.
 */
export const WALLET_API_SETS: readonly TApiSetId[] = [
  'core',
  'bridge',
  'lite',
  'hivemind-rest',
  'balance-api',
  'hafah'
];

/** The sets an app routes: the wallet's own, every set for the blog. */
export const apiSetsOfApp = (app: string | undefined): readonly TApiSetId[] =>
  app === 'wallet' ? WALLET_API_SETS : API_SET_IDS;

/** Sets served by hivemind and its apps: they prefer one common node (a soft group). */
export const HIVEMIND_SET_GROUP = 'hivemind';
export const HIVEMIND_GROUP_SETS: readonly TApiSetId[] = ['bridge', 'lite', 'hivemind-rest'];

export const API_SETS_COOKIE_MAX_AGE_S = 365 * 24 * 60 * 60;

/** Node URLs best first; an inner array is one rank of equally preferred nodes (the engine's `PreferenceOrder`). */
export type TPreferenceOrder = Array<string | string[]>;

export interface IApiSetsEnv {
  /** `REACT_APP_API_ENDPOINT`: the first preference of core, bridge and lite. */
  apiEndpoint?: string;
  /** `REACT_APP_ALLOWED_HIVE_API_NODES`: the further preferences of core, bridge and lite, and the REST APIs. */
  allowedNodes?: string;
  /** `REACT_APP_REST_API_ENDPOINT`: the first preference of the REST APIs a node serves. */
  restApiEndpoint?: string;
  /** `REACT_APP_HIVEMIND_REST_NODES`: hivemind REST is routed only when set. */
  hivemindRestNodes?: string;
  /** `REACT_APP_AI_DOMAIN`: the first preference of hivesense. */
  aiDomain?: string;
  /** `REACT_APP_FYP_API_URL`: the For You feed is routed only when set. */
  fypApiUrl?: string;
  /** `REACT_APP_API_SET_PREFERENCES`: explicit per-set orders, see `parseApiSetPreferences`; they win. */
  setPreferences?: string;
  /** Hosts listed among the nodes that are not API nodes (the images host). */
  excluded?: readonly (string | undefined)[];
}

/** The settings of `IApiSetsEnv` from the server's environment (`REACT_APP_*`). */
export const apiSetsEnvFromProcess = (env: Readonly<Record<string, string | undefined>>): IApiSetsEnv => ({
  apiEndpoint: env.REACT_APP_API_ENDPOINT,
  allowedNodes: env.REACT_APP_ALLOWED_HIVE_API_NODES,
  restApiEndpoint: env.REACT_APP_REST_API_ENDPOINT,
  hivemindRestNodes: env.REACT_APP_HIVEMIND_REST_NODES,
  aiDomain: env.REACT_APP_AI_DOMAIN,
  fypApiUrl: env.REACT_APP_FYP_API_URL,
  setPreferences: env.REACT_APP_API_SET_PREFERENCES,
  excluded: [env.REACT_APP_IMAGES_ENDPOINT]
});

export interface IApiSetsConfig {
  /** Every node any set may use, the selectable ones included: the engine's catalog and the CSP's `connect-src`. */
  nodes: string[];
  /** The sets this deployment routes. */
  sets: TApiSetId[];
  preferences: Record<TApiSetId, TPreferenceOrder>;
}

const DEFAULT_API_ENDPOINT = 'https://api.hive.blog';
const DEFAULT_ALLOWED_NODES = 'https://api.hive.blog https://api.syncad.com https://api.openhive.network';
const DEFAULT_AI_DOMAIN = 'https://api.hive.blog';

/**
 * One spelling per node, as the engine normalizes it: an http(s) URL without user info, trailing
 * slash, empty query or fragment; `undefined` for anything else.
 */
export function toNodeUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return undefined;
  }
  if ((url.protocol !== 'http:' && url.protocol !== 'https:') || url.username || url.password)
    return undefined;
  return `${url.origin}${url.pathname.replace(/\/+$/, '')}${url.search}`;
}

const toOrigin = (value: string | undefined): string | undefined => {
  const node = toNodeUrl(value);
  return node && new URL(node).origin;
};

/** A whitespace/comma-separated node list as distinct origins, without `excluded` ones. */
export function parseNodeList(
  list: string | undefined,
  excluded: readonly (string | undefined)[] = []
): string[] {
  const excludedOrigins = new Set(excluded.map(toOrigin).filter(Boolean));
  const nodes = (list ?? '')
    .split(/[\s,]+/)
    .map(toOrigin)
    .filter((node): node is string => !!node && !excludedOrigins.has(node));
  return [...new Set(nodes)];
}

/**
 * Reads `REACT_APP_API_SET_PREFERENCES`: `<set>=<nodes>` entries separated by `;`, the nodes
 * best first, separated by whitespace or commas, with `|` joining equally preferred nodes, e.g.
 * `lite=https://api.syncad.com; bridge=https://api.hive.blog https://a.example|https://b.example`.
 * Unknown sets and nodes that are not http(s) URLs are dropped.
 */
export function parseApiSetPreferences(
  text: string | undefined
): Partial<Record<TApiSetId, TPreferenceOrder>> {
  const preferences: Partial<Record<TApiSetId, TPreferenceOrder>> = {};
  for (const entry of (text ?? '').split(';')) {
    const separator = entry.indexOf('=');
    if (separator < 0) continue;
    const setId = entry.slice(0, separator).trim();
    if (!isApiSetId(setId)) continue;
    const order = entry
      .slice(separator + 1)
      .split(/[\s,]+/)
      .map((rank) =>
        rank
          .split('|')
          .map(toNodeUrl)
          .filter((node): node is string => !!node)
      )
      .filter((rank) => rank.length > 0)
      .map((rank) => (rank.length === 1 ? rank[0] : rank));
    if (order.length > 0) preferences[setId] = order;
  }
  return preferences;
}

const nodesOf = (order: TPreferenceOrder): string[] => order.flat();

const distinct = (nodes: readonly (string | undefined)[]): string[] => [
  ...new Set(nodes.filter((node): node is string => !!node))
];

/**
 * The deployment's sets (of `scope`), catalog and per-set preferences from its settings. Without an explicit
 * order a set prefers: core, bridge and lite the API endpoint, then the allowed nodes; the REST
 * APIs a node serves (balance-api, HAfAH) the REST endpoint, then the API endpoint and the allowed
 * nodes; hivemind REST its nodes; hivesense the AI domain; the For You feed its URL.
 */
export function resolveApiSetsConfig(
  env: IApiSetsEnv,
  scope: readonly TApiSetId[] = API_SET_IDS
): IApiSetsConfig {
  const excluded = env.excluded ?? [];
  const apiEndpoint = toOrigin(env.apiEndpoint) ?? DEFAULT_API_ENDPOINT;
  const allowed = parseNodeList(env.allowedNodes ?? DEFAULT_ALLOWED_NODES, excluded);
  const apiNodes = distinct([apiEndpoint, ...allowed]);
  const restNodes = distinct([toOrigin(env.restApiEndpoint), ...apiNodes]);
  const hivemindRestNodes = parseNodeList(env.hivemindRestNodes, excluded);
  const fypNode = toNodeUrl(env.fypApiUrl);
  const explicit = parseApiSetPreferences(env.setPreferences);

  const preferences: Record<TApiSetId, TPreferenceOrder> = {
    core: apiNodes,
    bridge: apiNodes,
    lite: apiNodes,
    'hivemind-rest': hivemindRestNodes,
    'balance-api': restNodes,
    hafah: restNodes,
    hivesense: distinct([toOrigin(env.aiDomain) ?? DEFAULT_AI_DOMAIN]),
    fyp: distinct([fypNode])
  };
  for (const setId of API_SET_IDS) preferences[setId] = explicit[setId] ?? preferences[setId];
  const sets = API_SET_IDS.filter((setId) => scope.includes(setId) && nodesOf(preferences[setId]).length > 0);
  const nodes = distinct([...sets.flatMap((setId) => nodesOf(preferences[setId])), ...SELECTABLE_API_NODES]);
  return { nodes, sets, preferences };
}

/** The nodes of `setId` the operator lists, best first. */
export const preferredNodes = (config: IApiSetsConfig, setId: TApiSetId): string[] =>
  nodesOf(config.preferences[setId]);

/** The format version of the engine's serialized selection (`ApiSetEngine.serialize`). */
const SELECTION_VERSION = '1';
const SELECTION_PREFIX = 's.';

/**
 * A selection in the engine's serialized form (`v=1&s.<set>=<node>`, see the package README),
 * naming each node by URL, which `ApiSetEngine.hydrate` reads for catalog nodes as well. Choices
 * of nodes outside `catalog` are dropped: the server and the CSP know only the catalog.
 */
export function serializeApiSetChoices(
  choices: Partial<Record<TApiSetId, string>>,
  catalog: readonly string[]
): string | undefined {
  const params = new URLSearchParams({ v: SELECTION_VERSION });
  let chosen = 0;
  for (const setId of API_SET_IDS) {
    const node = toNodeUrl(choices[setId]);
    if (!node || !catalog.includes(node)) continue;
    params.set(`${SELECTION_PREFIX}${setId}`, node);
    chosen += 1;
  }
  return chosen > 0 ? params.toString() : undefined;
}

/**
 * `state` (`ApiSetEngine.serialize()`) with each chosen catalog node named by URL instead of its
 * catalog index, so a stored choice keeps its node when the catalog's order changes (another
 * deployment setting, the other app of the origin).
 */
export function selectionWithNodeUrls(state: string, catalog: readonly string[]): string {
  const params = new URLSearchParams(state);
  for (const [key, value] of [...params]) {
    const node = /^\d+$/.test(value) ? catalog[Number(value)] : undefined;
    if (key.startsWith(SELECTION_PREFIX) && node) params.set(key, node);
  }
  return params.toString();
}

/** Reads one cookie's value out of a `document.cookie`-style header. */
export function readCookieValue(cookieHeader: string, name: string): string | undefined {
  for (const part of cookieHeader.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0 || part.slice(0, separator).trim() !== name) continue;
    try {
      return decodeURIComponent(part.slice(separator + 1).trim());
    } catch {
      return undefined;
    }
  }
  return undefined;
}

/**
 * The `document.cookie` assignment storing a serialized selection for every page of the app at
 * `basePath`: apps sharing an origin each keep their own, as their catalogs may differ.
 */
export const apiSetsCookieAssignment = (state: string, basePath = ''): string =>
  `${API_SETS_COOKIE}=${encodeURIComponent(state)}; path=${basePath || '/'}; max-age=${API_SETS_COOKIE_MAX_AGE_S}; samesite=lax`;
