import { getLogger } from '@ui/lib/logging';
import type { NodeHealth, TNodeAdmission } from './node-health';

const logger = getLogger('app');

/** Pause before re-asking the primary node, so a momentary blip has passed. */
const RETRY_DELAY_MS = 250;
/**
 * Head start of a node before the next node is asked as well. The slower node keeps running, so a
 * dead or stalled node costs a call this long, not its whole request timeout.
 */
export const HEDGE_DELAY_MS = 2_500;
/**
 * Request timeout of every retry / failover attempt. Long enough for a heavy call of a healthy node
 * (the hedge, not this timeout, bounds the wait for a stalled one), short enough that a node hedged
 * in after one head start still fits the budget.
 */
export const FAILOVER_ATTEMPT_TIMEOUT_MS = 5_000;
/**
 * Upper bound for one call, counted from the start of the first attempt. An attempt that could not
 * finish within it is not started, so a call never holds a server render much longer than this.
 */
export const FAILOVER_BUDGET_MS = 8_000;

// Loaded on the first failed call: `wax-errors` imports `@hiveio/wax`, which browser bundles of the
// chain module must not pull in statically.
const isWaxTransportError = async (error: unknown): Promise<boolean> =>
  (await import('./wax-errors')).isTransportError(error);

/** JSON-RPC namespaces that are not read-only; a failed broadcast must never be re-sent. */
const NON_RETRYABLE_NAMESPACES = new Set(['network_broadcast_api']);

export interface IFailoverChain<TSelf = unknown> {
  readonly api: object;
  readonly restApi?: object;
  readonly endpointUrl: string;
  /** A chain for the same endpoints whose requests time out after `timeoutMs`; it fails over too. */
  withTimeout?(timeoutMs: number): TSelf;
}

/** How many attempts, on how many nodes, one call may make. */
interface IFailoverPolicy {
  /** Request timeout of every retry / failover attempt. */
  attemptTimeoutMs: number;
  /** Whether a healthy primary is asked once more before the next node (JSON-RPC calls only). */
  retriesPrimary: boolean;
  /** Head start of a node before the next node is asked as well; without it nodes are asked in turn. */
  hedgeDelayMs?: number;
  /** Upper bound for one call, see FAILOVER_BUDGET_MS; without it `maxNodes` bounds the call. */
  budgetMs?: number;
  /** Most nodes one call asks; all of them when absent. */
  maxNodes?: number;
}

const DEFAULT_POLICY: IFailoverPolicy = {
  attemptTimeoutMs: FAILOVER_ATTEMPT_TIMEOUT_MS,
  retriesPrimary: true,
  hedgeDelayMs: HEDGE_DELAY_MS,
  budgetMs: FAILOVER_BUDGET_MS
};

/**
 * Policy of a chain derived by `withTimeout(timeoutMs)`, for calls known to be heavy: each node is
 * asked once with the whole `timeoutMs`, a node still working is not raced by the next one, and
 * after the primary one more node at most, so a query that overloads the API nodes is not run on
 * every one of them.
 */
const slowCallPolicy = (timeoutMs: number): IFailoverPolicy => ({
  attemptTimeoutMs: timeoutMs,
  retriesPrimary: false,
  maxNodes: 2
});

export interface IServerFailoverOptions<T extends IFailoverChain<T>> {
  /** Nodes to fail over to after the primary, in order of preference. */
  fallbackNodes: readonly string[];
  /** Builds a chain that sends JSON-RPC and REST calls to `node` with the given request timeout. */
  createNodeChain: (node: string, timeoutMs: number) => T;
  /** Node health shared by every chain of the process, so a dead node is skipped by all of them. */
  health: NodeHealth;
  /**
   * Whether a failed call may be retried elsewhere. Defaults to wax's `isTransportError`; a chain
   * whose errors are known without wax can pass its own check so a failure never loads wax.
   */
  isTransportError?: (error: unknown) => boolean | Promise<boolean>;
  /**
   * When given, `chain.restApi` calls fail over as well, and this tells whether a failed REST call
   * of `path` (e.g. `['balance-api', 'accountDelegations']`) means the node cannot serve that REST
   * API (so the next node is asked) rather than a definitive answer. Without it `chain.restApi` is
   * passed through untouched.
   */
  isRestApiUnavailable?: (error: unknown, path: readonly string[]) => boolean;
  /** Called after a call failed on the primary node and was then served by `node`. */
  onFailover?: (node: string) => void;
  /** Clock and sleep, injectable for tests. */
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}

/** One call to fail over across the nodes. */
interface IFailoverCall<T> {
  /** Names the call in logs, e.g. `bridge.get_post`. */
  label: string;
  /** The node the configured chain sends the call to. */
  primary: string;
  /** The `health` key recording whether `node` serves this call. */
  healthKey: (node: string) => string;
  invoke: (target: T) => Promise<unknown>;
  /** Whether a failure means the node could not serve the call, so another node may. */
  isNodeFailure: (error: unknown) => boolean | Promise<boolean>;
  /** Whether a healthy primary is asked once more before the next node. */
  retriesPrimary: boolean;
  onFailover?: (node: string) => void;
}

type TNodeOutcome =
  | { kind: 'served'; value: unknown }
  | { kind: 'answered'; error: unknown }
  | { kind: 'failed' };

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const isObjectLike = (value: unknown): value is object =>
  (typeof value === 'object' || typeof value === 'function') && value !== null;

/** `chain.api` followed along `path`, e.g. `['bridge', 'get_post']` → `chain.api.bridge.get_post`. */
const resolveApiPath = (api: object | undefined, path: readonly string[], rootName = 'api'): object => {
  const resolved = path.reduce<unknown>(
    (node, key) => (isObjectLike(node) ? Reflect.get(node, key) : undefined),
    api
  );
  if (!isObjectLike(resolved)) throw new TypeError(`chain.${rootName}.${path.join('.')} does not exist`);
  return resolved;
};

const endpointOf = (apiNode: object): unknown => Reflect.get(apiNode, 'endpointUrl');

/** The `health` key recording whether `node` serves the REST API `apiName`, e.g. `https://api.example.com/balance-api`. */
export const restApiHealthKey = (node: string, apiName: string): string => `${node}/${apiName}`;

/**
 * Parses a whitespace/comma-separated node list (the `REACT_APP_ALLOWED_HIVE_API_NODES` format) into
 * distinct origins, dropping `excluded` entries (e.g. the images host, which is listed for CSP but is
 * not an API node) and anything that is not an http(s) URL.
 */
export function parseFallbackNodes(
  list: string | undefined,
  excluded: readonly (string | undefined)[] = []
): string[] {
  const toOrigin = (value: string | undefined): string | undefined => {
    if (!value) return undefined;
    try {
      const url = new URL(value);
      return url.protocol === 'http:' || url.protocol === 'https:' ? url.origin : undefined;
    } catch {
      return undefined;
    }
  };
  const excludedOrigins = new Set(excluded.map(toOrigin).filter(Boolean));
  const nodes = (list ?? '')
    .split(/[\s,]+/)
    .map(toOrigin)
    .filter((node): node is string => !!node && !excludedOrigins.has(node));
  return [...new Set(nodes)];
}

/**
 * Wraps a chain so that each read-only JSON-RPC call on `chain.api` that fails at the transport level
 * (see `isTransportError`) is retried once on the primary node and then on each fallback node, within
 * `FAILOVER_BUDGET_MS`. A node that has not answered within `HEDGE_DELAY_MS` is not waited for alone:
 * the next node is asked as well and the first answer wins. A node whose attempts all failed, or that
 * was still silent when a node asked after it answered, is marked down in `health` and skipped by
 * later calls until its cooldown ends or its late answer arrives; when every node is down, all are
 * tried, the most recently healthy first. A definitive API answer (e.g. "post does not exist") is
 * never retried. When every attempt fails, the last transport error is rethrown.
 *
 * With `isRestApiUnavailable`, a call on `chain.restApi` that the REST primary (`restApi.endpointUrl`)
 * cannot serve is asked of the fallback nodes the same way, without the second attempt on the
 * primary and without `onFailover`. Its health is recorded per node and REST API (`<node>/<api>`,
 * e.g. `https://api.example.com/balance-api`), so a node lacking one REST API keeps serving every
 * other call. A REST API with an endpoint of its own (one that is not `restApi.endpointUrl`) is not
 * failed over. Everything other than `chain.api` and `chain.restApi` is passed through untouched.
 *
 * A chain derived by `withTimeout(timeoutMs)` fails over as well, sharing `health`, but each call
 * asks a node once with `timeoutMs`, without hedging, and asks two nodes at most.
 *
 * On the server one node blip would otherwise turn a whole page render into an error; in the browser
 * the selected node being unreachable would otherwise fail every client-side read.
 */
export function wrapChainWithServerFailover<T extends IFailoverChain<T>>(
  chain: T,
  options: IServerFailoverOptions<T>
): T {
  return wrapWithPolicy(chain, options, DEFAULT_POLICY);
}

function wrapWithPolicy<T extends IFailoverChain<T>>(
  chain: T,
  options: IServerFailoverOptions<T>,
  policy: IFailoverPolicy
): T {
  const {
    fallbackNodes,
    createNodeChain,
    health,
    isTransportError = isWaxTransportError,
    isRestApiUnavailable,
    onFailover,
    now = Date.now,
    sleep = defaultSleep
  } = options;
  const attemptChains = new Map<string, T>();
  const timeoutChains = new Map<number, T>();

  // Chains are cached per node: every wax chain instance allocates wasm state that is never freed.
  const getAttemptChain = (node: string): T => {
    let attemptChain = attemptChains.get(node);
    if (!attemptChain) {
      attemptChain = createNodeChain(node, policy.attemptTimeoutMs);
      attemptChains.set(node, attemptChain);
    }
    return attemptChain;
  };

  const callOn = async (
    root: object | undefined,
    rootName: string,
    path: readonly string[],
    args: unknown[]
  ): Promise<unknown> => {
    const method = resolveApiPath(root, path, rootName);
    if (typeof method !== 'function') throw new TypeError(`chain.${rootName}.${path.join('.')} is not callable`);
    return Reflect.apply(method, undefined, args);
  };

  // A healthy primary is asked through the configured chain first and, for JSON-RPC, retried once
  // after a pause; a probe of a recovering node, or a fallback, gets one short-timeout attempt.
  const attemptsOn = (call: IFailoverCall<T>, node: string, admission: TNodeAdmission): Array<() => T> => {
    if (node !== call.primary || admission !== 'healthy') return [() => getAttemptChain(node)];
    return call.retriesPrimary ? [() => chain, () => getAttemptChain(node)] : [() => chain];
  };

  const callWithFailover = async (call: IFailoverCall<T>) => {
    const startedAt = now();
    const { label, primary, healthKey } = call;
    const configuredNodes = [primary, ...fallbackNodes.filter((node) => node !== primary)];
    const nodeByKey = new Map(configuredNodes.map((node) => [healthKey(node), node]));
    // Skipping every node would fail the call without asking anyone, so then all of them are tried,
    // the one that answered last first: it is likelier to be back than a node that never answered.
    const sweepAll = [...nodeByKey.keys()].every((key) => health.isDown(key));
    const nodes = sweepAll
      ? health.byRecentHealth([...nodeByKey.keys()]).flatMap((key) => nodeByKey.get(key) ?? [])
      : configuredNodes;
    const { budgetMs, maxNodes = Infinity } = policy;
    const fitsBudget = () => budgetMs === undefined || now() - startedAt + policy.attemptTimeoutMs <= budgetMs;
    const tried: string[] = [];
    let settled = false;
    let failures = 0;
    let lastError: unknown;

    // Every attempt on one node, in turn. It also runs on after another node served the call, so
    // its outcome still updates `health`, but it starts no retry then.
    const runNode = async (node: string, admission: TNodeAdmission): Promise<TNodeOutcome> => {
      for (const [index, target] of attemptsOn(call, node, admission).entries()) {
        if (index > 0) {
          await sleep(RETRY_DELAY_MS);
          if (settled || !fitsBudget()) break;
        }
        try {
          const value = await call.invoke(target());
          health.markUp(healthKey(node));
          return { kind: 'served', value };
        } catch (error) {
          if (!(await call.isNodeFailure(error))) {
            health.markUp(healthKey(node));
            return { kind: 'answered', error };
          }
          failures += 1;
          lastError = error;
        }
      }
      health.markDown(healthKey(node));
      return { kind: 'failed' };
    };

    const running = new Map<string, Promise<{ node: string; outcome: TNodeOutcome }>>();
    let nextIndex = 0;
    const startNextNode = (): boolean => {
      while (nextIndex < nodes.length && tried.length < maxNodes) {
        const node = nodes[nextIndex++];
        const admission = sweepAll ? 'healthy' : health.admit(healthKey(node));
        if (!admission) continue;
        tried.push(node);
        running.set(node, runNode(node, admission).then((outcome) => ({ node, outcome })));
        return true;
      }
      return false;
    };

    const { hedgeDelayMs } = policy;
    let canHedge = startNextNode();
    while (running.size > 0) {
      const hedge = canHedge && hedgeDelayMs !== undefined ? [sleep(hedgeDelayMs).then(() => undefined)] : [];
      const finished = await Promise.race([...running.values(), ...hedge]);
      if (!finished) {
        canHedge = fitsBudget() && startNextNode();
        continue;
      }
      const { node, outcome } = finished;
      running.delete(node);
      if (outcome.kind === 'failed') {
        canHedge = fitsBudget() && startNextNode();
        continue;
      }
      settled = true;
      if (outcome.kind === 'answered') throw outcome.error;
      // A node still silent when one asked after it has answered is stalled: skip it until its own
      // answer, if it ever comes, marks it up again.
      for (const slow of tried.slice(0, tried.indexOf(node))) {
        if (running.has(slow)) health.markDown(healthKey(slow));
      }
      if (failures > 0 || node !== primary) {
        logger.warn(
          '%s served by %s after trying %s (%d failed attempt(s))',
          label,
          node,
          tried.join(', '),
          failures
        );
      }
      if (node !== primary) call.onFailover?.(node);
      return outcome.value;
    }

    settled = true;
    logger.error(
      lastError,
      '%s failed on every node tried (%s) within %d ms',
      label,
      tried.join(', '),
      now() - startedAt
    );
    throw lastError;
  };

  const callJsonRpc = (path: readonly string[], args: unknown[]): Promise<unknown> => {
    if (NON_RETRYABLE_NAMESPACES.has(path[0])) return callOn(chain.api, 'api', path, args);
    return callWithFailover({
      label: path.join('.'),
      primary: chain.endpointUrl,
      healthKey: (node) => node,
      invoke: (target) => callOn(target.api, 'api', path, args),
      isNodeFailure: isTransportError,
      retriesPrimary: policy.retriesPrimary,
      onFailover
    });
  };

  const callRest = (
    isUnavailable: (error: unknown, path: readonly string[]) => boolean,
    path: readonly string[],
    args: unknown[]
  ): Promise<unknown> => {
    const primary = endpointOf(resolveApiPath(chain.restApi, [], 'restApi'));
    const ownEndpoint = endpointOf(resolveApiPath(chain.restApi, path, 'restApi'));
    if (typeof primary !== 'string' || ownEndpoint !== primary) return callOn(chain.restApi, 'restApi', path, args);
    const apiName = path[0];
    return callWithFailover({
      label: path.join('.'),
      primary,
      healthKey: (node) => restApiHealthKey(node, apiName),
      invoke: (target) => callOn(target.restApi, 'restApi', path, args),
      isNodeFailure: (error) => isUnavailable(error, path),
      retriesPrimary: false
    });
  };

  // wax resolves `chain.api.<namespace>.<method>` lazily through its own proxy; mirror the access path
  // and replay it on whichever chain serves the call.
  const createApiProxy = (
    getRoot: () => object | undefined,
    rootName: string,
    path: readonly string[],
    onCall: (path: readonly string[], args: unknown[]) => Promise<unknown>
  ): object =>
    new Proxy(function apiPath() {}, {
      get: (_target, prop) => {
        if (typeof prop === 'symbol' || prop === 'endpointUrl') {
          return Reflect.get(resolveApiPath(getRoot(), path, rootName), prop);
        }
        return createApiProxy(getRoot, rootName, [...path, prop], onCall);
      },
      set: (_target, prop, value) => Reflect.set(resolveApiPath(getRoot(), path, rootName), prop, value),
      apply: (_target, _thisArg, args: unknown[]) => onCall(path, args)
    });

  // Cached per timeout, so the derived chain's per-node attempt chains are reused across calls.
  const withTimeout = (timeoutMs: number): T => {
    let timeoutChain = timeoutChains.get(timeoutMs);
    if (!timeoutChain) {
      const derived = chain.withTimeout?.(timeoutMs);
      if (!derived) throw new TypeError('chain.withTimeout is not callable');
      timeoutChain = wrapWithPolicy(derived, options, slowCallPolicy(timeoutMs));
      timeoutChains.set(timeoutMs, timeoutChain);
    }
    return timeoutChain;
  };

  return new Proxy(chain, {
    get: (target, prop, receiver) => {
      if (prop === 'withTimeout' && typeof chain.withTimeout === 'function') return withTimeout;
      if (prop === 'api') return createApiProxy(() => chain.api, 'api', [], callJsonRpc);
      if (prop === 'restApi' && isRestApiUnavailable && chain.restApi) {
        return createApiProxy(() => chain.restApi, 'restApi', [], (path, args) =>
          callRest(isRestApiUnavailable, path, args)
        );
      }
      return Reflect.get(target, prop, receiver);
    }
  });
}
