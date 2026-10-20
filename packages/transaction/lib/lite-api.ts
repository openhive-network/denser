import type { ILiteApiInfo, ILiteProfile } from '@hive/common-hiveio-packages/wax';
import { getLogger } from '@ui/lib/logging';
import { getNodeReadChain, getReadChain, type ReadChain } from './chain';
import { isApiNotServedError, JsonRpcApiError } from './read-client';

const logger = getLogger('lite-api');

/** How long a node's `lite.get_info` answer (or its lack of one) is trusted. */
export const LITE_PROBE_TTL_MS = 10 * 60_000;

/**
 * The probe TTL of a server process: `DENSER_LITE_PROBE_TTL_S` seconds (0 = ask before every read,
 * for a test server whose node is swapped behind one endpoint), else `LITE_PROBE_TTL_MS`.
 */
export function readLiteProbeTtlMs(env: Record<string, string | undefined>): number {
  const value = env.DENSER_LITE_PROBE_TTL_S;
  if (value === undefined || value.trim() === '') return LITE_PROBE_TTL_MS;
  const seconds = Number(value);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds * 1000 : LITE_PROBE_TTL_MS;
}

/** Where the post reads go: `lite.*` (lite posts under their `did:lite:` identity) or `bridge.*`. */
export type TPostsNamespace = 'lite' | 'bridge';

/** The post reads `lite.*` and `bridge.*` both serve, with the same params and response shape. */
export type TPostsApi = Pick<
  ReadChain['api']['bridge'],
  'get_discussion' | 'get_post' | 'get_ranked_posts' | 'get_account_posts'
>;

const NATIVE_MODE = 'native';
const PROFILE_METHOD = 'get_profile';

/** Whether a node's `lite.get_info` answer lists `lite.get_profile`. */
export const servesLiteProfile = (info: ILiteApiInfo | null | undefined): boolean =>
  !!info?.methods.includes(PROFILE_METHOD);

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

const isLiteApiInfo = (value: unknown): value is ILiteApiInfo => {
  if (typeof value !== 'object' || value === null) return false;
  if (!('version' in value) || typeof value.version !== 'string') return false;
  if (!('render_base' in value) || typeof value.render_base !== 'string') return false;
  if (!('modes' in value) || !isStringArray(value.modes) || !value.modes.includes(NATIVE_MODE)) return false;
  if (!('methods' in value) || !isStringArray(value.methods)) return false;
  if (!('apps' in value) || typeof value.apps !== 'object' || value.apps === null) return false;
  return 'posts' in value.apps && typeof value.apps.posts === 'string';
};

export interface ILiteApiProbeOptions {
  /** Calls `lite.get_info` on exactly `endpoint`, never on another node in its place. */
  fetchInfo: (endpoint: string) => Promise<unknown>;
  ttlMs?: number;
  now?: () => number;
}

export interface ILiteApiProbe {
  /** The node's capabilities, or null when it does not serve lite posts natively. */
  getInfo(endpoint: string): Promise<ILiteApiInfo | null>;
  /** The last answer `getInfo` got for `endpoint`, without asking; undefined before the first one. */
  peek(endpoint: string): ILiteApiInfo | null | undefined;
  /** Treats `endpoint` as not lite-aware until the TTL ends, e.g. after it stopped serving `lite.*`. */
  markUnavailable(endpoint: string): void;
  /** Takes `info` as the answer of `endpoint` until the TTL ends, without asking it (e.g. a known verdict). */
  seed(endpoint: string, info: unknown): void;
  /** Calls `listener` whenever an answer is recorded; returns the unsubscribe function. */
  subscribe(listener: () => void): () => void;
}

/**
 * A per-endpoint cache of `lite.get_info`. Negative answers are cached as well: a JSON-RPC error
 * (a node without lite support), a transport failure and a malformed answer all mean "not
 * lite-aware" until the TTL ends. Concurrent calls for one endpoint share one request.
 */
export function createLiteApiProbe({
  fetchInfo,
  ttlMs = LITE_PROBE_TTL_MS,
  now = Date.now
}: ILiteApiProbeOptions): ILiteApiProbe {
  const cache = new Map<string, { expiresAt: number; info: Promise<ILiteApiInfo | null> }>();
  const answers = new Map<string, ILiteApiInfo | null>();
  const listeners = new Set<() => void>();

  const record = (endpoint: string, answer: ILiteApiInfo | null) => {
    answers.set(endpoint, answer);
    listeners.forEach((listener) => listener());
  };

  const probe = async (endpoint: string): Promise<ILiteApiInfo | null> => {
    let answer: unknown;
    try {
      answer = await fetchInfo(endpoint);
    } catch (error) {
      // Every failure, not only "Api not found lite", leaves the node on the stock bridge reads,
      // which every node serves.
      logger.debug('lite.get_info of %s failed, reading posts through bridge: %o', endpoint, error);
      return null;
    }
    if (isLiteApiInfo(answer)) return answer;
    logger.warn('lite.get_info of %s answered without native mode: %o', endpoint, answer);
    return null;
  };

  const remember = (endpoint: string, info: Promise<ILiteApiInfo | null>) => {
    const entry = { expiresAt: now() + ttlMs, info };
    cache.set(endpoint, entry);
    void info.then((answer) => {
      if (cache.get(endpoint) === entry) record(endpoint, answer);
    });
    return info;
  };

  return {
    getInfo: (endpoint) => {
      const cached = cache.get(endpoint);
      if (cached && cached.expiresAt > now()) return cached.info;
      return remember(endpoint, probe(endpoint));
    },
    peek: (endpoint) => answers.get(endpoint),
    markUnavailable: (endpoint) => {
      answers.set(endpoint, null);
      remember(endpoint, Promise.resolve(null));
    },
    seed: (endpoint, info) => {
      const answer = isLiteApiInfo(info) ? info : null;
      remember(endpoint, Promise.resolve(answer));
      record(endpoint, answer);
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }
  };
}

interface IPostsChain {
  readonly endpointUrl: string;
  readonly api: { lite: TPostsApi; bridge: TPostsApi };
}

/**
 * Post reads on `lite.*` when the chain's current node is lite-aware, else on `bridge.*`. A `lite.*`
 * read answered with "Api not found" (the node, or every node failover asked, lost the family)
 * marks the node not lite-aware and is read again through `bridge.*`.
 */
export function createPostsReader(getChain: () => IPostsChain, probe: ILiteApiProbe) {
  return async <T>(read: (api: TPostsApi) => Promise<T>): Promise<T> => {
    const chain = getChain();
    const endpoint = chain.endpointUrl;
    if (!(await probe.getInfo(endpoint))) return read(chain.api.bridge);
    try {
      return await read(chain.api.lite);
    } catch (error) {
      if (!isApiNotServedError(error)) throw error;
      logger.warn('%s no longer serves lite.*, reading posts through bridge', endpoint);
      probe.markUnavailable(endpoint);
      return read(chain.api.bridge);
    }
  };
}

interface IProfileChain {
  readonly endpointUrl: string;
  readonly api: { lite: { get_profile: (params: { account: string }) => Promise<ILiteProfile | null> } };
}

/**
 * `lite.get_profile` of `account` (a `did:lite:<name>` or a Hive account name) on the chain's
 * current node, or null when the node does not serve it (not lite-aware, or `lite.get_info` does
 * not list the method) or answers with an error, e.g. for an account that does not exist. A
 * transport failure is thrown.
 */
export function createLiteProfileReader(getChain: () => IProfileChain, probe: ILiteApiProbe) {
  return async (account: string): Promise<ILiteProfile | null> => {
    const chain = getChain();
    const info = await probe.getInfo(chain.endpointUrl);
    if (!servesLiteProfile(info)) return null;
    try {
      return await chain.api.lite.get_profile({ account });
    } catch (error) {
      if (error instanceof JsonRpcApiError) return null;
      throw error;
    }
  };
}

// Asked of the configured node itself: answered through failover, another node's capabilities
// would be recorded as this one's.
const liteApiProbe = createLiteApiProbe({
  fetchInfo: (endpoint) => getNodeReadChain(endpoint).api.lite.get_info({}),
  ttlMs: typeof window === 'undefined' ? readLiteProbeTtlMs(process.env) : LITE_PROBE_TTL_MS
});

/** `lite.get_info` of the API node reads currently go to, or null when it is not lite-aware. */
export const getLiteApiInfo = (): Promise<ILiteApiInfo | null> => liteApiProbe.getInfo(getReadChain().endpointUrl);

/** Whether the API node reads currently go to serves lite posts natively (`lite.*`). */
export const isLiteAware = async (): Promise<boolean> => (await getLiteApiInfo()) !== null;

/** The namespace post reads of the current API node go to; part of every cache key of their results. */
export const getPostsNamespace = async (): Promise<TPostsNamespace> => ((await isLiteAware()) ? 'lite' : 'bridge');

/** `lite.get_info` of the current API node as far as it is known, without asking it; undefined before. */
export const peekLiteApiInfo = (): ILiteApiInfo | null | undefined => liteApiProbe.peek(getReadChain().endpointUrl);

/** Calls `listener` whenever the probe records an answer of any node; returns the unsubscribe function. */
export const subscribeLiteApiInfo = (listener: () => void): (() => void) => liteApiProbe.subscribe(listener);

/**
 * Takes the server render's `lite.get_info` answer of `endpoint` when the browser reads from that
 * same node and has no answer of its own yet; a browser on another node keeps probing its own.
 */
export const seedLiteApiInfo = (endpoint: string, info: unknown): void => {
  if (getReadChain().endpointUrl !== endpoint || liteApiProbe.peek(endpoint) !== undefined) return;
  liteApiProbe.seed(endpoint, info);
};

/**
 * The namespace of the current API node as far as it is known, without asking it: `bridge` until
 * its probe has answered (or the server's answer was seeded). For cache keys built outside React.
 */
export const currentPostsNamespace = (): TPostsNamespace => (peekLiteApiInfo() ? 'lite' : 'bridge');

/** Runs a post read on the namespace of the current API node, see `createPostsReader`. */
export const readPosts = createPostsReader(getReadChain, liteApiProbe);

/** Runs `lite.get_profile` on the current API node, see `createLiteProfileReader`. */
export const getLiteProfile = createLiteProfileReader(getReadChain, liteApiProbe);
