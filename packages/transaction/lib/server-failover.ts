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

type TNodeOutcome =
  | { kind: 'served'; value: unknown }
  | { kind: 'answered'; error: unknown }
  | { kind: 'failed' };

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
 * `FAILOVER_BUDGET_MS`. A node that has not answered within `HEDGE_DELAY_MS` is not waited for alone:
 * the next node is asked as well and the first answer wins. A node whose attempts all failed, or that
 * was still silent when a node asked after it answered, is marked down in `health` and skipped by
 * later calls until its cooldown ends or its late answer arrives; when every node is down, all are
 * tried, the most recently healthy first. A definitive API answer (e.g. "post does not exist") is
 * never retried. When every attempt fails, the last transport error is rethrown. Everything other
 * than `chain.api` is passed through untouched.
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
    const configuredNodes = [primary, ...fallbackNodes.filter((node) => node !== primary)];
    // Skipping every node would fail the call without asking anyone, so then all of them are tried,
    // the one that answered last first: it is likelier to be back than a node that never answered.
    const sweepAll = configuredNodes.every((node) => health.isDown(node));
    const nodes = sweepAll ? health.byRecentHealth(configuredNodes) : configuredNodes;
    const fitsBudget = () => now() - startedAt + FAILOVER_ATTEMPT_TIMEOUT_MS <= FAILOVER_BUDGET_MS;
    const tried: string[] = [];
    let settled = false;
    let failures = 0;
    let lastError: unknown;

    // Every attempt on one node, in turn. It also runs on after another node served the call, so
    // its outcome still updates `health`, but it starts no retry then.
    const runNode = async (node: string, admission: TNodeAdmission): Promise<TNodeOutcome> => {
      for (const [index, target] of attemptsOn(node, admission).entries()) {
        if (index > 0) {
          await sleep(RETRY_DELAY_MS);
          if (settled || !fitsBudget()) break;
        }
        try {
          const value = await callOn(target(), path, args);
          health.markUp(node);
          return { kind: 'served', value };
        } catch (error) {
          if (!(await isTransportError(error))) {
            health.markUp(node);
            return { kind: 'answered', error };
          }
          failures += 1;
          lastError = error;
        }
      }
      health.markDown(node);
      return { kind: 'failed' };
    };

    const running = new Map<string, Promise<{ node: string; outcome: TNodeOutcome }>>();
    let nextIndex = 0;
    const startNextNode = (): boolean => {
      while (nextIndex < nodes.length) {
        const node = nodes[nextIndex++];
        const admission = sweepAll ? 'healthy' : health.admit(node);
        if (!admission) continue;
        tried.push(node);
        running.set(node, runNode(node, admission).then((outcome) => ({ node, outcome })));
        return true;
      }
      return false;
    };

    let canHedge = startNextNode();
    while (running.size > 0) {
      const hedge = canHedge ? [sleep(HEDGE_DELAY_MS).then(() => undefined)] : [];
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
        if (running.has(slow)) health.markDown(slow);
      }
      if (failures > 0 || node !== primary) {
        logger.warn(
          '%s served by %s after trying %s (%d failed attempt(s))',
          method,
          node,
          tried.join(', '),
          failures
        );
      }
      if (node !== primary) onFailover?.(node);
      return outcome.value;
    }

    settled = true;
    logger.error(
      lastError,
      '%s failed on every node tried (%s) within %d ms',
      method,
      tried.join(', '),
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
