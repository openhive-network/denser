import type {
  IAccountNotification,
  ILiteApiInfo,
  ILiteFollow,
  ILiteNotificationsParams,
  ILiteFollowCount,
  ILiteFollowParams,
  ILiteProfile,
  IUnreadNotifications
} from '@hive/common-hiveio-packages/wax';
import { getLogger } from '@ui/lib/logging';
import { probeAnswerOf } from './api-sets/probe-answers';
import { getApiSetNodes, getNodeReadChain, getReadChain, type ReadChain } from './chain';
import { isApiNotServedError, JsonRpcApiError } from './read-client';
import { ReadTransportError } from './read-transport';

const logger = getLogger('lite-api');

/** How long a node's `lite.get_info` answer (or its lack of one) is trusted. */
export const LITE_PROBE_TTL_MS = 10 * 60_000;

/**
 * The probe TTL of a server process: `DENSER_LITE_PROBE_TTL_S` seconds (0 = ask before every read,
 * for a test server whose node is swapped behind one endpoint), else `LITE_PROBE_TTL_MS`.
 */
export function readLiteProbeTtlMs(env: Record<string, string | undefined>): number {
  const seconds = secondsOf(env.DENSER_LITE_PROBE_TTL_S);
  return seconds !== undefined && seconds >= 0 ? seconds * 1000 : LITE_PROBE_TTL_MS;
}

/**
 * How long a `lite.*` post read may take before the posts are read the stock way instead, so a slow
 * lite node costs a page this much, not a whole request timeout and failover.
 */
export const LITE_READ_BUDGET_MS = 3_000;

/**
 * The lite read budget of a server process: `DENSER_LITE_READ_BUDGET_S` seconds when above 0, else
 * `LITE_READ_BUDGET_MS`.
 */
export function readLiteReadBudgetMs(env: Record<string, string | undefined>): number {
  const seconds = secondsOf(env.DENSER_LITE_READ_BUDGET_S);
  return seconds !== undefined && seconds > 0 ? seconds * 1000 : LITE_READ_BUDGET_MS;
}

/**
 * How long post reads skip `lite.*` on a node after a read of it failed on transport or ran out of
 * budget: the API sets engine's cooldown of a node it found down, after which it probes the node again.
 */
export const LITE_READ_COOLDOWN_MS = 30_000;

const secondsOf = (value: string | undefined): number | undefined => {
  if (value === undefined || value.trim() === '') return undefined;
  const seconds = Number(value);
  return Number.isFinite(seconds) ? seconds : undefined;
};

const LITE_DID_PREFIX = 'did:lite:';

/** The options of a post read of `author`'s post or posts: only `lite.*` knows a `did:lite:` author. */
export const postsReadOptionsOf = (author: string): IPostsReadOptions => ({
  liteOnly: author.startsWith(LITE_DID_PREFIX)
});

/** Where the post reads go: `lite.*` (lite posts under their `did:lite:` identity) or `bridge.*`. */
export type TPostsNamespace = 'lite' | 'bridge';

/** The post reads `lite.*` and `bridge.*` both serve, with the same params and response shape. */
export type TPostsMethod = 'get_discussion' | 'get_post' | 'get_ranked_posts' | 'get_account_posts';

/** The post reads, each with its vote-free counterpart (`<method>_v2`). */
export type TPostsApi = Pick<ReadChain['api']['bridge'], TPostsMethod | `${TPostsMethod}_v2`>;

const NATIVE_MODE = 'native';
const PROFILE_METHOD = 'get_profile';
const NOTIFICATIONS_METHOD = 'account_notifications';

/** Whether a node's `lite.get_info` answer lists the vote-free counterpart of the post read `method`. */
export const servesVoteFreeLite = (info: ILiteApiInfo | null | undefined, method: TPostsMethod): boolean =>
  !!info?.methods.includes(`${method}_v2`);

/** Whether a node's `lite.get_info` answer lists `lite.get_profile`. */
export const servesLiteProfile = (info: ILiteApiInfo | null | undefined): boolean =>
  !!info?.methods.includes(PROFILE_METHOD);

/**
 * Whether a node's `lite.get_info` answer lists `lite.account_notifications`: such a node also serves
 * `lite.unread_notifications` and `lite.lookup_accounts`, and its notifications include lite actors.
 */
export const servesLiteNotifications = (info: ILiteApiInfo | null | undefined): boolean =>
  !!info?.methods.includes(NOTIFICATIONS_METHOD);

/**
 * The lite social app a node's `lite.get_info` advertises (`apps.social`), or null: a lite-aware
 * node without it serves no lite follows, mutes, reblogs, subscriptions or profile edits.
 */
export const liteSocialApp = (info: ILiteApiInfo | null | undefined): string | null => {
  const social = info?.apps.social;
  return typeof social === 'string' && social !== '' ? social : null;
};

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
  /**
   * An answer of `endpoint` already at hand (e.g. the API sets engine's probe of it), or undefined to
   * ask the node; null means it does not serve `lite.*`. `failed` means the node could not be asked
   * (transport failure or timeout), kept as a transport failure of `fetchInfo` is.
   */
  knownInfo?: (endpoint: string) => { info: unknown } | { failed: true } | undefined;
  ttlMs?: number;
  /** How long a transport failure of `lite.get_info` is kept (at most `ttlMs`); see `LITE_READ_COOLDOWN_MS`. */
  unreachableTtlMs?: number;
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
  /** Whether the last `lite.get_info` of some node failed on transport and is not asked again yet. */
  hasUnreachableNode(): boolean;
}

interface IProbeOutcome {
  info: ILiteApiInfo | null;
  /** The node could not be asked (a transport failure), which says nothing about its lite support. */
  unreachable: boolean;
}

interface IProbeEntry {
  expiresAt: number;
  unreachable: boolean;
  info: Promise<ILiteApiInfo | null>;
}

/**
 * A per-endpoint cache of `lite.get_info`. Negative answers are cached as well: a JSON-RPC error
 * (a node without lite support) and a malformed answer mean "not lite-aware" until the TTL ends, a
 * transport failure only for `unreachableTtlMs`, so a node back from a stall is lite-aware again
 * soon. Concurrent calls for one endpoint share one request.
 */
export function createLiteApiProbe({
  fetchInfo,
  knownInfo,
  ttlMs = LITE_PROBE_TTL_MS,
  unreachableTtlMs = LITE_READ_COOLDOWN_MS,
  now = Date.now
}: ILiteApiProbeOptions): ILiteApiProbe {
  const cache = new Map<string, IProbeEntry>();
  const answers = new Map<string, ILiteApiInfo | null>();
  const listeners = new Set<() => void>();

  const record = (endpoint: string, answer: ILiteApiInfo | null) => {
    answers.set(endpoint, answer);
    listeners.forEach((listener) => listener());
  };

  const answered = (info: ILiteApiInfo | null): IProbeOutcome => ({ info, unreachable: false });

  const probe = async (endpoint: string): Promise<IProbeOutcome> => {
    const known = knownInfo?.(endpoint);
    if (known && 'info' in known) return answered(isLiteApiInfo(known.info) ? known.info : null);
    if (known) return { info: null, unreachable: true };
    let answer: unknown;
    try {
      answer = await fetchInfo(endpoint);
    } catch (error) {
      // Every failure, not only "Api not found lite", leaves the node on the stock bridge reads,
      // which every node serves.
      logger.debug('lite.get_info of %s failed, reading posts through bridge: %o', endpoint, error);
      return { info: null, unreachable: error instanceof ReadTransportError };
    }
    if (isLiteApiInfo(answer)) return answered(answer);
    logger.warn('lite.get_info of %s answered without native mode: %o', endpoint, answer);
    return answered(null);
  };

  const remember = (endpoint: string, outcome: Promise<IProbeOutcome>) => {
    const entry: IProbeEntry = { expiresAt: now() + ttlMs, unreachable: false, info: outcome.then(({ info }) => info) };
    cache.set(endpoint, entry);
    void outcome.then(({ info, unreachable }) => {
      if (cache.get(endpoint) !== entry) return;
      if (unreachable) {
        entry.unreachable = true;
        entry.expiresAt = Math.min(entry.expiresAt, now() + unreachableTtlMs);
      }
      record(endpoint, info);
    });
    return entry.info;
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
      remember(endpoint, Promise.resolve(answered(null)));
    },
    seed: (endpoint, info) => {
      const answer = isLiteApiInfo(info) ? info : null;
      remember(endpoint, Promise.resolve(answered(answer)));
      record(endpoint, answer);
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    hasUnreachableNode: () =>
      [...cache.values()].some((entry) => entry.unreachable && entry.expiresAt > now())
  };
}

/** The node `lite.*` reads go to, and its `lite.get_info`. */
export interface ILiteNode {
  node: string;
  info: ILiteApiInfo;
}

/**
 * The first of `nodes` that serves lite posts natively, or null when none does. The first node is
 * asked alone; the others, needed only when it is not lite-aware, are asked together.
 */
export async function findLiteNode(
  nodes: readonly string[],
  probe: ILiteApiProbe
): Promise<ILiteNode | null> {
  const [first, ...others] = nodes;
  if (first === undefined) return null;
  const firstInfo = await probe.getInfo(first);
  if (firstInfo) return { node: first, info: firstInfo };
  const infos = await Promise.all(others.map((node) => probe.getInfo(node)));
  for (const [index, info] of infos.entries()) {
    if (info) return { node: others[index], info };
  }
  return null;
}

/** Looks up the lite node; by default the chain's current node, when it is lite-aware. */
type TFindLiteNode = () => Promise<ILiteNode | null>;

const currentNodeOf =
  (getChain: () => { readonly endpointUrl: string }, probe: ILiteApiProbe): TFindLiteNode =>
  () =>
    findLiteNode([getChain().endpointUrl], probe);

interface IPostsChain {
  readonly endpointUrl: string;
  readonly api: { lite: TPostsApi; bridge: TPostsApi };
  /** The chain with requests timing out after `timeoutMs`, each node asked once (see `getReadChain`). */
  withTimeout(timeoutMs: number): { readonly api: { lite: TPostsApi } };
}

export interface IPostsReaderOptions {
  /** See `LITE_READ_BUDGET_MS`. */
  budgetMs?: number;
  /** See `LITE_READ_COOLDOWN_MS`. */
  cooldownMs?: number;
  now?: () => number;
}

/** A `lite.*` post read (its node's lookup included) that did not settle within its budget. */
class LiteReadBudgetError extends Error {
  constructor(budgetMs: number) {
    super(`no answer within ${budgetMs} ms`);
    this.name = 'LiteReadBudgetError';
  }
}

/** Races promises against one deadline, `budgetMs` from now; `clear` stops its timer. */
const startBudget = (budgetMs: number) => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const expired = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new LiteReadBudgetError(budgetMs)), budgetMs);
  });
  // Raced only while a lite step is pending: the deadline may pass with nothing left to race.
  expired.catch(() => undefined);
  return {
    within: <T>(step: Promise<T>): Promise<T> => Promise.race([step, expired]),
    clear: () => clearTimeout(timer)
  };
};

/** A post read on `api`: `lite.*` of the lite node `lite`, or `bridge.*` without one. */
export type TPostsRead<T> = (api: TPostsApi, lite?: ILiteNode) => Promise<T>;

/** Options of one post read, see `createPostsReader`. */
export interface IPostsReadOptions {
  /**
   * Only `lite.*` can answer the read (it names a `did:lite:` author, which the stock read rejects):
   * a transport failure or overrun of the budget is thrown as a transport error, not read the stock
   * way, and the read goes to the lite node during its cooldown as well.
   */
  liteOnly?: boolean;
}

/**
 * Post reads on `lite.*` when a node of the lite API set is lite-aware, else `stock` (the
 * deployment's ordinary read: hivemind's REST API when configured, else `bridge.*`), or `read` on
 * `bridge.*` without one; a `lite.*` read is given its lite node. A `lite.*` read answered with "Api not found" (the node, or every node
 * failover asked, lost the family) marks the node not lite-aware and is read again the stock way.
 *
 * The lookup of the lite node and the `lite.*` read share `budgetMs`; the read's requests time out
 * after it as well. One that fails on transport (timeout, network error, HTTP 5xx) or runs out of
 * budget is read again the stock way, and reads skip `lite.*` on the node for `cooldownMs`; the node
 * is not marked not lite-aware. The failed request itself is reported to the API sets engine by the
 * chain's failover, as every call is. Any other `lite.*` answer is thrown. A `liteOnly` read throws
 * a `ReadTransportError` instead of reading the stock way, also when no node is lite-aware while a
 * node's lookup failed on transport.
 */
export function createPostsReader(
  getChain: () => IPostsChain,
  probe: ILiteApiProbe,
  findLite: TFindLiteNode = currentNodeOf(getChain, probe),
  { budgetMs = LITE_READ_BUDGET_MS, cooldownMs = LITE_READ_COOLDOWN_MS, now = Date.now }: IPostsReaderOptions = {}
) {
  const skippedUntil = new Map<string, number>();
  const isSkipped = (node: string): boolean => (skippedUntil.get(node) ?? -Infinity) > now();

  const unreachableError = (cause: Error, endpoint: string): ReadTransportError =>
    cause instanceof ReadTransportError
      ? cause
      : new ReadTransportError(
          'lite.* unreachable',
          { method: 'POST', endpoint, url: '', timeout: budgetMs, responseType: 'json' },
          undefined,
          cause
        );

  /** The `lite.*` answer of `read`, or null when the posts are to be read the stock way. */
  const readLite = async <T>(
    chain: IPostsChain,
    read: TPostsRead<T>,
    liteOnly: boolean,
    within: <S>(step: Promise<S>) => Promise<S>
  ): Promise<{ value: T } | null> => {
    let lite: ILiteNode | null;
    try {
      lite = await within(findLite());
    } catch (error) {
      if (!(error instanceof LiteReadBudgetError)) throw error;
      logger.warn('no lite node found within %d ms', budgetMs);
      if (liteOnly) throw unreachableError(error, chain.endpointUrl);
      return null;
    }
    if (!lite) {
      if (liteOnly && probe.hasUnreachableNode()) {
        throw unreachableError(new Error('no lite-aware node answered lite.get_info'), chain.endpointUrl);
      }
      return null;
    }
    if (isSkipped(lite.node) && !liteOnly) return null;
    try {
      return { value: await within(read(chain.withTimeout(budgetMs).api.lite, lite)) };
    } catch (error) {
      if (isApiNotServedError(error)) {
        // Failover may have asked other nodes after the lite node: the error names the one that answered.
        const node = (error instanceof JsonRpcApiError && error.endpoint) || lite.node;
        logger.warn('%s no longer serves lite.*, reading posts the stock way', node);
        probe.markUnavailable(node);
        return null;
      }
      if (!(error instanceof ReadTransportError) && !(error instanceof LiteReadBudgetError)) throw error;
      const node = (error instanceof ReadTransportError && error.request.endpoint) || lite.node;
      logger.warn('lite.* post read on %s failed (%s)', node, error.message);
      skippedUntil.set(lite.node, now() + cooldownMs);
      if (liteOnly) throw unreachableError(error, node);
      return null;
    }
  };

  return async <T>(
    read: TPostsRead<T>,
    stock?: () => Promise<T>,
    { liteOnly = false }: IPostsReadOptions = {}
  ): Promise<T> => {
    const chain = getChain();
    const budget = startBudget(budgetMs);
    const lite = await readLite(chain, read, liteOnly, budget.within).finally(budget.clear);
    if (lite) return lite.value;
    return stock ? stock() : read(chain.api.bridge);
  };
}

interface IProfileChain {
  readonly endpointUrl: string;
  readonly api: { lite: { get_profile: (params: { account: string }) => Promise<ILiteProfile | null> } };
}

/**
 * `lite.get_profile` of `account` (a `did:lite:<name>` or a Hive account name) on the lite API
 * set's node, or null when it does not serve it (not lite-aware, or `lite.get_info` does not list
 * the method) or answers with an error, e.g. for an account that does not exist. A transport
 * failure is thrown.
 */
export function createLiteProfileReader(
  getChain: () => IProfileChain,
  probe: ILiteApiProbe,
  findLite: TFindLiteNode = currentNodeOf(getChain, probe)
) {
  return async (account: string): Promise<ILiteProfile | null> => {
    const chain = getChain();
    const info = (await findLite())?.info;
    if (!servesLiteProfile(info)) return null;
    try {
      return await chain.api.lite.get_profile({ account });
    } catch (error) {
      if (error instanceof JsonRpcApiError) return null;
      throw error;
    }
  };
}

/** The `lite.*` reads of the social graph, see `createLiteSocialReader`. */
export interface ILiteSocialApi {
  get_followers: (params: ILiteFollowParams) => Promise<ILiteFollow[]>;
  get_following: (params: ILiteFollowParams) => Promise<ILiteFollow[]>;
  get_follow_count: (params: { account: string }) => Promise<ILiteFollowCount>;
  list_subscribers: (params: {
    community: string;
    last?: string;
    limit?: number;
  }) => Promise<string[][] | null>;
  list_all_subscriptions: (params: { account: string }) => Promise<string[][] | null>;
}

interface ISocialChain {
  readonly endpointUrl: string;
  readonly api: { lite: ILiteSocialApi };
}

/**
 * Runs a read of the lite social graph on the lite API set's node when its `lite.get_info`
 * advertises the social app, else resolves null so the caller keeps its stock read. Errors of
 * the read itself are thrown.
 */
export function createLiteSocialReader(
  getChain: () => ISocialChain,
  probe: ILiteApiProbe,
  findLite: TFindLiteNode = currentNodeOf(getChain, probe)
) {
  return async <T>(read: (api: ILiteSocialApi) => Promise<T>): Promise<T | null> => {
    const chain = getChain();
    if (!liteSocialApp((await findLite())?.info)) return null;
    return read(chain.api.lite);
  };
}

/** The `lite.*` notification reads and the lite name lookup, see `createLiteNotificationsReader`. */
export interface ILiteNotificationsApi {
  account_notifications: (params: ILiteNotificationsParams) => Promise<IAccountNotification[] | null>;
  unread_notifications: (params: { account: string }) => Promise<IUnreadNotifications | null>;
  lookup_accounts: (params: { prefix: string; limit?: number }) => Promise<string[]>;
}

interface INotificationsChain {
  readonly endpointUrl: string;
  readonly api: { lite: ILiteNotificationsApi };
}

/**
 * Runs `read` on the lite API set's node when its `lite.get_info` lists the notification methods
 * (`servesLiteNotifications`), else `fallback` (the stock read, or none). Errors of either are thrown.
 */
export function createLiteNotificationsReader(
  getChain: () => INotificationsChain,
  probe: ILiteApiProbe,
  findLite: TFindLiteNode = currentNodeOf(getChain, probe)
) {
  return async <T>(
    read: (api: ILiteNotificationsApi) => Promise<T>,
    fallback: () => Promise<T>
  ): Promise<T> => {
    const chain = getChain();
    if (!servesLiteNotifications((await findLite())?.info)) return fallback();
    return read(chain.api.lite);
  };
}

const isServer = typeof window === 'undefined';
const liteProbeTtlMs = isServer ? readLiteProbeTtlMs(process.env) : LITE_PROBE_TTL_MS;

const engineProbedInfo = (endpoint: string): { info: unknown } | { failed: true } | undefined => {
  const probed = probeAnswerOf('lite', endpoint, liteProbeTtlMs);
  if (!probed) return undefined;
  return 'answer' in probed ? { info: probed.answer } : { failed: true };
};

const liteReadBudgetMs = isServer ? readLiteReadBudgetMs(process.env) : LITE_READ_BUDGET_MS;

// Asked of each node itself: answered through failover, another node's capabilities would be
// recorded as this one's. On the server, whose API sets engine probes the nodes, a node it probed
// within the TTL is not asked again; the bundler drops that from the browser's code. A node that
// does not answer within the read budget is unreachable, so no lookup outlasts a post read's budget.
const liteApiProbe = createLiteApiProbe({
  fetchInfo: (endpoint) => getNodeReadChain(endpoint).withTimeout(liteReadBudgetMs).api.lite.get_info({}),
  knownInfo: typeof window === 'undefined' ? engineProbedInfo : undefined,
  ttlMs: liteProbeTtlMs
});

/** The nodes of the lite API set, best first (see `getApiSetNodes`). */
const getLiteNodes = (): Promise<readonly string[]> => getApiSetNodes('lite');

// The outcome of the browser's last lookup of the lite node: undefined before the first one. A
// server keeps none: its requests route by their own cookies, so one request's lite node is not
// another's.
let lastLiteNode: ILiteNode | null | undefined;
const liteNodeListeners = new Set<() => void>();

const rememberLiteNode = (found: ILiteNode | null): ILiteNode | null => {
  if (isServer) return found;
  if (
    found?.node !== lastLiteNode?.node ||
    found?.info !== lastLiteNode?.info ||
    lastLiteNode === undefined
  ) {
    lastLiteNode = found;
    liteNodeListeners.forEach((listener) => listener());
  }
  return found;
};

const lookupLiteNode = async (): Promise<ILiteNode | null> =>
  rememberLiteNode(await findLiteNode(await getLiteNodes(), liteApiProbe));

/** The node `lite.*` reads go to and its `lite.get_info`, or null when no node of the lite API set is lite-aware. */
export const getLiteNode = (): Promise<ILiteNode | null> => lookupLiteNode();

/** `lite.get_info` of the node `lite.*` reads go to, or null when no node of the lite API set is lite-aware. */
export const getLiteApiInfo = async (): Promise<ILiteApiInfo | null> =>
  (await lookupLiteNode())?.info ?? null;

/**
 * Whether the last `lite.get_info` of some node failed on transport, recently enough not to ask it
 * again yet: no lite-aware node found then is no verdict on the nodes' lite support.
 */
export const isLiteNodeUnreachable = (): boolean => liteApiProbe.hasUnreachableNode();

/** Whether a node of the lite API set serves lite posts natively (`lite.*`). */
export const isLiteAware = async (): Promise<boolean> => (await getLiteApiInfo()) !== null;

/** The namespace post reads go to; part of every cache key of their results. */
export const getPostsNamespace = async (): Promise<TPostsNamespace> =>
  (await isLiteAware()) ? 'lite' : 'bridge';

/**
 * `lite.get_info` of the browser's lite node as far as it is known, without asking; undefined before
 * the first lookup, and always on a server.
 */
export const peekLiteApiInfo = (): ILiteApiInfo | null | undefined =>
  lastLiteNode === undefined ? undefined : (lastLiteNode?.info ?? null);

/** Calls `listener` whenever the known lite node or its answer changes; returns the unsubscribe function. */
export const subscribeLiteApiInfo = (listener: () => void): (() => void) => {
  liteNodeListeners.add(listener);
  return () => {
    liteNodeListeners.delete(listener);
  };
};

/**
 * Takes the server render's `lite.get_info` answer of `endpoint`, the node it read `lite.*` from (or
 * found not lite-aware), when the browser has no answer of that node yet. A lite-aware answer also
 * makes it the browser's lite node until a lookup of its own: the page's routes, which the browser
 * looks up by, come from the same server.
 */
export const seedLiteApiInfo = (endpoint: string, info: unknown): void => {
  if (liteApiProbe.peek(endpoint) !== undefined) return;
  liteApiProbe.seed(endpoint, info);
  const seeded = liteApiProbe.peek(endpoint);
  if (seeded && lastLiteNode === undefined) rememberLiteNode({ node: endpoint, info: seeded });
};

/**
 * The namespace of the lite node as far as it is known, without asking: `bridge` until a lookup has
 * found a lite-aware node (or the server's answer was seeded). For cache keys built outside React.
 */
export const currentPostsNamespace = (): TPostsNamespace => (peekLiteApiInfo() ? 'lite' : 'bridge');

/** Runs a post read on the namespace of the lite API set, see `createPostsReader`. */
export const readPosts = createPostsReader(getReadChain, liteApiProbe, lookupLiteNode, {
  budgetMs: liteReadBudgetMs
});

/** Runs `lite.get_profile` on the lite API set's node, see `createLiteProfileReader`. */
export const getLiteProfile = createLiteProfileReader(getReadChain, liteApiProbe, lookupLiteNode);

/** Runs a lite social graph read on the lite API set's node, see `createLiteSocialReader`. */
export const readLiteSocial = createLiteSocialReader(getReadChain, liteApiProbe, lookupLiteNode);

/** Runs a notification read on the lite API set's node, see `createLiteNotificationsReader`. */
export const readLiteNotifications = createLiteNotificationsReader(
  getReadChain,
  liteApiProbe,
  lookupLiteNode
);
