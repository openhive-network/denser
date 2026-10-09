import { getLogger } from '@ui/lib/logging';
import type { NodeHealth, TNodeAdmission } from './node-health';

const logger = getLogger('app');

/** Pause before re-asking the primary node, so a momentary blip has passed. */
const RETRY_DELAY_MS = 250;
/** Request timeout of every retry / failover attempt. */
export const FAILOVER_ATTEMPT_TIMEOUT_MS = 2_000;
/**
 * Upper bound for one call, counted from the start of the first attempt. An attempt that could not
 * finish within it is not started, so a call never holds a server render longer than this.
 */
export const FAILOVER_BUDGET_MS = 8_000;

// Loaded on the first failed call: `wax-errors` imports `@hiveio/wax`, which browser bundles of the
// chain module must not pull in statically.
const isWaxTransportError = async (error: unknown): Promise<boolean> =>
  (await import('./wax-errors')).isTransportError(error);

/** JSON-RPC namespaces that are not read-only; a failed broadcast must never be re-sent. */
const NON_RETRYABLE_NAMESPACES = new Set(['network_broadcast_api']);

export interface IFailoverChain {
  readonly api: object;
  readonly endpointUrl: string;
}

export interface IServerFailoverOptions<T extends IFailoverChain> {
  /** Nodes to fail over to after the primary, in order of preference. */
  fallbackNodes: readonly string[];
  /** Builds a chain that sends JSON-RPC calls to `node` with the given request timeout. */
  createNodeChain: (node: string, timeoutMs: number) => T;
  /** Node health shared by every chain of the process, so a dead node is skipped by all of them. */
  health: NodeHealth;
  /**
   * Whether a failed call may be retried elsewhere. Defaults to wax's `isTransportError`; a chain
   * whose errors are known without wax can pass its own check so a failure never loads wax.
   */
  isTransportError?: (error: unknown) => boolean | Promise<boolean>;
  /** Called after a call failed on the primary node and was then served by `node`. */
  onFailover?: (node: string) => void;
  /** Clock and sleep, injectable for tests. */
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const isObjectLike = (value: unknown): value is object =>
  (typeof value === 'object' || typeof value === 'function') && value !== null;

/** `chain.api` followed along `path`, e.g. `['bridge', 'get_post']` → `chain.api.bridge.get_post`. */
const resolveApiPath = (api: object, path: readonly string[]): object => {
  const resolved = path.reduce<unknown>(
    (node, key) => (isObjectLike(node) ? Reflect.get(node, key) : undefined),
    api
  );
  if (!isObjectLike(resolved)) throw new TypeError(`chain.api.${path.join('.')} does not exist`);
  return resolved;
};

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
 * `FAILOVER_BUDGET_MS`. A node whose attempts all failed is marked down in `health` and skipped by
 * later calls until its cooldown ends, so they go straight to the first node still up; when every
 * node is down, all are tried as usual. A definitive API answer (e.g. "post does not exist") is never
 * retried. When every attempt fails, the last transport error is rethrown. Everything other than
 * `chain.api` is passed through untouched.
 *
 * On the server one node blip would otherwise turn a whole page render into an error; in the browser
 * the selected node being unreachable would otherwise fail every client-side read.
 */
export function wrapChainWithServerFailover<T extends IFailoverChain>(
  chain: T,
  options: IServerFailoverOptions<T>
): T {
  const {
    fallbackNodes,
    createNodeChain,
    health,
    isTransportError = isWaxTransportError,
    onFailover,
    now = Date.now,
    sleep = defaultSleep
  } = options;
  const attemptChains = new Map<string, T>();

  // Chains are cached per node: every wax chain instance allocates wasm state that is never freed.
  const getAttemptChain = (node: string): T => {
    let attemptChain = attemptChains.get(node);
    if (!attemptChain) {
      attemptChain = createNodeChain(node, FAILOVER_ATTEMPT_TIMEOUT_MS);
      attemptChains.set(node, attemptChain);
    }
    return attemptChain;
  };

  const callOn = async (target: T, path: readonly string[], args: unknown[]): Promise<unknown> => {
    const method = resolveApiPath(target.api, path);
    if (typeof method !== 'function') throw new TypeError(`chain.api.${path.join('.')} is not callable`);
    return Reflect.apply(method, undefined, args);
  };

  // A healthy primary is asked through the configured chain first and retried once after a pause; a
  // probe of a recovering node, or a fallback, gets one short-timeout attempt.
  const attemptsOn = (node: string, admission: TNodeAdmission): Array<() => T> =>
    node === chain.endpointUrl && admission === 'healthy'
      ? [() => chain, () => getAttemptChain(node)]
      : [() => getAttemptChain(node)];

  const callWithFailover = async (path: readonly string[], args: unknown[]) => {
    if (NON_RETRYABLE_NAMESPACES.has(path[0])) return callOn(chain, path, args);

    const startedAt = now();
    const method = path.join('.');
    const primary = chain.endpointUrl;
    const nodes = [primary, ...fallbackNodes.filter((node) => node !== primary)];
    // Skipping every node would fail the call without asking anyone, so then all of them are tried.
    const sweepAll = nodes.every((node) => health.isDown(node));
    const outOfBudget = () => now() - startedAt + FAILOVER_ATTEMPT_TIMEOUT_MS > FAILOVER_BUDGET_MS;
    let failures = 0;
    let lastError: unknown;

    for (const node of nodes) {
      if (failures > 0 && outOfBudget()) break;
      const admission = sweepAll ? 'healthy' : health.admit(node);
      if (!admission) continue;
      for (const [index, target] of attemptsOn(node, admission).entries()) {
        if (index > 0) {
          await sleep(RETRY_DELAY_MS);
          if (outOfBudget()) break;
        }
        try {
          const result = await callOn(target(), path, args);
          health.markUp(node);
          if (failures > 0) logger.warn('%s served by %s after %d failed attempt(s)', method, node, failures);
          if (node !== primary) onFailover?.(node);
          return result;
        } catch (error) {
          if (!(await isTransportError(error))) {
            health.markUp(node);
            throw error;
          }
          failures += 1;
          lastError = error;
        }
      }
      health.markDown(node);
    }

    logger.error(
      lastError,
      '%s failed on every node (%s) within %d ms',
      method,
      nodes.join(', '),
      now() - startedAt
    );
    throw lastError;
  };

  // wax resolves `chain.api.<namespace>.<method>` lazily through its own proxy; mirror the access path
  // and replay it on whichever chain serves the call.
  const createApiProxy = (path: readonly string[]): object =>
    new Proxy(function apiPath() {}, {
      get: (_target, prop) => {
        if (typeof prop === 'symbol' || prop === 'endpointUrl') {
          return Reflect.get(resolveApiPath(chain.api, path), prop);
        }
        return createApiProxy([...path, prop]);
      },
      set: (_target, prop, value) => Reflect.set(resolveApiPath(chain.api, path), prop, value),
      apply: (_target, _thisArg, args: unknown[]) => callWithFailover(path, args)
    });

  return new Proxy(chain, {
    get: (target, prop, receiver) =>
      prop === 'api' ? createApiProxy([]) : Reflect.get(target, prop, receiver)
  });
}
