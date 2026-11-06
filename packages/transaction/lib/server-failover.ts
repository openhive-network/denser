import { getLogger } from '@ui/lib/logging';
import type { NodeHealth, TNodeAdmission } from './node-health';
import { isApiNotServedError } from './read-client';
import { isConnectionFailure, isEndpointMissing } from './read-transport';

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

/**
 * JSON-RPC namespaces only some nodes serve. A node answering such a call with "Api not found" (see
 * `isApiNotServedError`) cannot serve it, so the next node is asked.
 */
const OPTIONAL_NAMESPACES = new Set(['lite']);

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
  /**
   * Whether a node's silence is reported to `connectivity.reportSilent`. A call that may stall on
   * every node while the network works (a heavy query, held to its own timeout) must not report it,
   * or it would find the network down.
   */
  reportsSilence: boolean;
}

const DEFAULT_POLICY: IFailoverPolicy = {
  attemptTimeoutMs: FAILOVER_ATTEMPT_TIMEOUT_MS,
  retriesPrimary: true,
  hedgeDelayMs: HEDGE_DELAY_MS,
  budgetMs: FAILOVER_BUDGET_MS,
  reportsSilence: true
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
  maxNodes: 2,
  reportsSilence: false
});

/** How a node did on one call: served or answered it, or could not (it lacks the API, or failed). */
export type TFailoverOutcome =
  | { ok: true; latencyMs: number }
  | { ok: false; error: 'apiNotFound' | 'transport'; latencyMs: number };

/** The nodes one call goes to, chosen by the API family it belongs to (see `routeFor`). */
export interface IFailoverRoute {
  /** The nodes to ask, the first one first. */
  nodes: readonly string[];
  /**
   * The API family a JSON-RPC call's health is recorded under (`<node>/<family>`, e.g. `core`);
   * its namespace when absent.
   */
  family?: string;
  /** Told how each node asked did. */
  report?: (node: string, outcome: TFailoverOutcome) => void;
  /** Called after the call failed on the first node and was then served by `node`. */
  onFallback?: (node: string) => void;
}

/** The browser's connection, which a call consults before failing over and tells what it found. */
export interface IFailoverConnectivity {
  /** False while the network is down: a call then asks its first node that is not down once. */
  admitsFailover(): boolean;
  /** A node answered, if only with an HTTP error. */
  reportAnswered(): void;
  /** `node` failed without any answer (see `isUnanswered`) to a call that may ask `nodes`. */
  reportSilent(node: string, nodes: readonly string[]): void;
  /** Whether a failed attempt got no answer from its node, e.g. a network failure or a timeout. */
  isUnanswered(error: unknown): boolean;
}

export interface IServerFailoverOptions<T extends IFailoverChain<T>> {
  /** Nodes to fail over to after the primary, in order of preference. */
  fallbackNodes: readonly string[];
  /**
   * Routes a call of `chain.api` (`'api'`) or `chain.restApi` (`'restApi'`) at `path` by its API
   * family: the nodes it returns replace `configured` (the primary, then `fallbackNodes`). A call
   * it returns nothing for, or no nodes, keeps `configured` and `onFailover`.
   */
  routeFor?: (
    root: 'api' | 'restApi',
    path: readonly string[],
    configured: readonly string[]
  ) => Promise<IFailoverRoute | undefined>;
  /** Builds a chain that sends JSON-RPC and REST calls to `node` with the given request timeout. */
  createNodeChain: (node: string, timeoutMs: number) => T;
  /**
   * Node health the chain records each node's outcomes in and skips the nodes down in. The process
   * shares one record between its chains, so a dead node is skipped by all of them; a reader's
   * search keeps a record of its own that only consults the shared one.
   */
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
  /**
   * The browser's connection. While it is down a call asks its first node up once, without failing
   * over and without recording the outcome against the node: offline every node fails alike.
   */
  connectivity?: IFailoverConnectivity;
  /** Clock and sleep, injectable for tests. */
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}

/** One call to fail over across the nodes. */
interface IFailoverCall<T> {
  /** Names the call in logs, e.g. `bridge.get_post`. */
  label: string;
  /** The nodes to ask, the first one first. */
  nodes: readonly string[];
  /** The node the configured chain itself sends the call to. */
  chainEndpoint: string;
  /** The `health` key recording whether `node` serves this call. */
  healthKey: (node: string) => string;
  /**
   * The `health` key recording that `node` could not be connected to at all, which every call
   * given it skips the node for; without it a connection failure is recorded under `healthKey` only.
   */
  unreachableKey?: (node: string) => string;
  invoke: (target: T) => Promise<unknown>;
  /** Whether a failure means the node could not serve the call, so another node may. */
  isNodeFailure: (error: unknown) => boolean | Promise<boolean>;
  /** Whether a failure the node answered means it lacks the API rather than that it failed. */
  isApiNotServed: (error: unknown) => boolean;
  /** Whether a healthy primary is asked once more before the next node. */
  retriesPrimary: boolean;
  /** Whether a node that gave no answer is reported to `connectivity.reportSilent`. */
  reportsSilence: boolean;
  onFailover?: (node: string) => void;
  report?: (node: string, outcome: TFailoverOutcome) => void;
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

/** The `health` key recording whether `node` serves the JSON-RPC calls of `family`, e.g. `https://api.example.com/core`. */
export const jsonRpcHealthKey = (node: string, family: string): string => `${node}/${family}`;

/**
 * The `health` key recording that `node` refused or dropped the connection (see
 * `isConnectionFailure`), so that its JSON-RPC calls of every family skip it, e.g.
 * `https://api.example.com/unreachable`.
 */
const nodeUnreachableKey = (node: string): string => `${node}/unreachable`;

/** Whether a call skips `node`: `health` has it down for the call (`healthKey`) or, given `unreachableKey`, at all. */
const isSkippedIn =
  (health: NodeHealth, healthKey: (node: string) => string, unreachableKey?: (node: string) => string) =>
  (node: string): boolean => {
    const unreachable = unreachableKey?.(node);
    return health.isDown(healthKey(node)) || (unreachable !== undefined && health.isDown(unreachable));
  };

/** `nodes` with the most recently healthy for the call (`healthKey`) first. */
const byRecentHealthIn = (
  health: NodeHealth,
  nodes: readonly string[],
  healthKey: (node: string) => string
): string[] => {
  const nodeByKey = new Map(nodes.map((node) => [healthKey(node), node]));
  return health.byRecentHealth([...nodeByKey.keys()]).flatMap((key) => nodeByKey.get(key) ?? []);
};

/**
 * The node a JSON-RPC call of `family` routed to `nodes` is sent to first, as the failover chain
 * picks it: the first node `health` does not skip, else, with every node skipped, the one healthy
 * most recently; `undefined` for no nodes. It claims no probe.
 */
export function firstJsonRpcNode(health: NodeHealth, nodes: readonly string[], family: string): string | undefined {
  const healthKey = (node: string) => jsonRpcHealthKey(node, family);
  const isSkipped = isSkippedIn(health, healthKey, nodeUnreachableKey);
  return nodes.find((node) => !isSkipped(node)) ?? byRecentHealthIn(health, nodes, healthKey)[0];
}

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
 * was still silent when a node asked after it answered, is marked down in `health` for the call's
 * API family (the route's `family`, else the namespace: `<node>/core`, `<node>/search-api`) and
 * skipped by later calls of that family until its cooldown ends or its late answer arrives, so a
 * query one API of a node is slow on leaves every other API of the node in use. A node whose last
 * attempt could not connect at all (see `isConnectionFailure`) is marked down for the node as well
 * (`<node>/unreachable`), which calls of every family skip it for, so a dead node costs each
 * family no attempt of its own; when every node is
 * down, all are tried, the most recently healthy first. A definitive API answer (e.g. "post does not
 * exist") is never retried. When every attempt fails, the last transport error is rethrown. A call
 * of a namespace only some nodes serve (`lite.*`) also moves on when the node answers "Api not found".
 *
 * With `isRestApiUnavailable`, a call on `chain.restApi` that the REST primary (`restApi.endpointUrl`)
 * cannot serve is asked of the fallback nodes the same way, without the second attempt on the
 * primary and without `onFailover`. Its health is recorded per node and REST API (`<node>/<api>`,
 * e.g. `https://api.example.com/balance-api`), so a node lacking one REST API keeps serving every
 * other call. A REST API with an endpoint of its own (one that is not `restApi.endpointUrl`) is not
 * failed over. Everything other than `chain.api` and `chain.restApi` is passed through untouched.
 *
 * With `routeFor`, a call of an API family that is routed goes to the family's nodes instead (a REST
 * API with an endpoint of its own included), each node's outcome is reported to the route, and a
 * broadcast is sent once to the family's first node.
 *
 * With `connectivity`, a call made while the network is down asks its first node that is not down
 * once and records nothing about it, any answer of a node (an HTTP error included) tells
 * `connectivity` the network works, and each node that got no answer at all is reported to it as
 * silent, which tells it the network is down once every node was, across calls. A `lite.*` call
 * reports no silence: nodes may stall on it alone while every other call works.
 *
 * A chain derived by `withTimeout(timeoutMs)` fails over as well, sharing `health`, but each call
 * asks a node once with `timeoutMs`, without hedging, asks two nodes at most, and reports no
 * silence: a heavy query may stall on every node while the network works.
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
    routeFor,
    createNodeChain,
    health,
    isTransportError = isWaxTransportError,
    isRestApiUnavailable,
    onFailover,
    connectivity,
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

  // A healthy primary is asked first (through the configured chain when that is the node it calls)
  // and, for JSON-RPC, retried once after a pause; a probe of a recovering node, or a fallback, gets
  // one short-timeout attempt.
  const attemptsOn = (call: IFailoverCall<T>, node: string, admission: TNodeAdmission): Array<() => T> => {
    const attempt = () => getAttemptChain(node);
    if (node !== call.nodes[0] || admission !== 'healthy') return [attempt];
    const first = node === call.chainEndpoint ? () => chain : attempt;
    return call.retriesPrimary ? [first, attempt] : [first];
  };

  const configuredNodesOf = (primary: string): string[] => [
    primary,
    ...fallbackNodes.filter((node) => node !== primary)
  ];

  // The route of the call's API family, or `undefined` to keep the configured nodes.
  const routeOf = async (
    root: 'api' | 'restApi',
    path: readonly string[],
    configured: readonly string[]
  ): Promise<IFailoverRoute | undefined> => {
    const route = await routeFor?.(root, path, configured);
    return route && route.nodes.length > 0 ? route : undefined;
  };

  const callWithFailover = async (call: IFailoverCall<T>) => {
    const startedAt = now();
    const { label, healthKey } = call;
    const configuredNodes = [...new Set(call.nodes)];
    const [primary] = configuredNodes;
    const unreachableKeyOf = (node: string): string | undefined => call.unreachableKey?.(node);
    const isSkipped = isSkippedIn(health, healthKey, call.unreachableKey);
    // Skipping every node would fail the call without asking anyone, so then all of them are tried,
    // the one that answered last first: it is likelier to be back than a node that never answered.
    const failsOver = connectivity?.admitsFailover() ?? true;
    const firstUp = configuredNodes.find((node) => !isSkipped(node));
    const byRecentHealth = () => byRecentHealthIn(health, configuredNodes, healthKey);
    const sweepAll = failsOver && firstUp === undefined;
    // Without failover the one node asked is the first one up, so a dead pinned node is not asked
    // again and again while the others serve.
    const nodes = !failsOver
      ? [firstUp ?? byRecentHealth()[0]]
      : sweepAll
        ? byRecentHealth()
        : configuredNodes;
    const { budgetMs, maxNodes = Infinity } = policy;
    const fitsBudget = () => budgetMs === undefined || now() - startedAt + policy.attemptTimeoutMs <= budgetMs;
    const tried: string[] = [];
    let settled = false;
    let failures = 0;
    let lastError: unknown;

    // A node is asked once neither its family nor the node itself is down; the call probes it when
    // either cooldown has just passed. The family is checked first so that a node still down for it
    // does not use up the probe of the node.
    const admitNode = (node: string): TNodeAdmission | undefined => {
      if (health.isDown(healthKey(node))) return undefined;
      const unreachable = unreachableKeyOf(node);
      const reach = unreachable === undefined ? 'healthy' : health.admit(unreachable);
      if (!reach) return undefined;
      const family = health.admit(healthKey(node));
      return reach === 'probe' || family === 'probe' ? 'probe' : family;
    };

    const markUp = (node: string): void => {
      connectivity?.reportAnswered();
      health.markUp(healthKey(node));
      const unreachable = unreachableKeyOf(node);
      if (unreachable !== undefined) health.markUp(unreachable);
    };

    // Every attempt on one node, in turn. It also runs on after another node served the call, so
    // its outcome still updates `health`, but it starts no retry then.
    const runNode = async (node: string, admission: TNodeAdmission): Promise<TNodeOutcome> => {
      const nodeStartedAt = now();
      let notServed = false;
      let answered = false;
      let nodeError: unknown;
      for (const [index, target] of attemptsOn(call, node, admission).entries()) {
        if (index > 0) {
          await sleep(RETRY_DELAY_MS);
          if (settled || !fitsBudget()) break;
        }
        try {
          const value = await call.invoke(target());
          markUp(node);
          call.report?.(node, { ok: true, latencyMs: now() - nodeStartedAt });
          return { kind: 'served', value };
        } catch (error) {
          if (!(await call.isNodeFailure(error))) {
            markUp(node);
            call.report?.(node, { ok: true, latencyMs: now() - nodeStartedAt });
            return { kind: 'answered', error };
          }
          failures += 1;
          lastError = error;
          nodeError = error;
          notServed = call.isApiNotServed(error);
          // Any answer, an HTTP error included, proves the network works.
          if (!connectivity?.isUnanswered(error)) {
            answered = true;
            connectivity?.reportAnswered();
          }
        }
      }
      if (!failsOver) return { kind: 'failed' };
      health.markDown(healthKey(node));
      // A node that could not be connected to cannot serve any family either; a node that was only
      // slow may still serve the others, so a timeout stays recorded for this family alone.
      const unreachable = unreachableKeyOf(node);
      if (unreachable !== undefined && isConnectionFailure(nodeError)) health.markDown(unreachable);
      if (!answered && call.reportsSilence) connectivity?.reportSilent(node, configuredNodes);
      const error = notServed ? 'apiNotFound' : 'transport';
      call.report?.(node, { ok: false, error, latencyMs: now() - nodeStartedAt });
      return { kind: 'failed' };
    };

    const running = new Map<string, Promise<{ node: string; outcome: TNodeOutcome }>>();
    let nextIndex = 0;
    const startNextNode = (): boolean => {
      while (nextIndex < nodes.length && tried.length < maxNodes) {
        const node = nodes[nextIndex++];
        // Without failover the first node gets one attempt, as a probe does.
        const admission = !failsOver ? 'probe' : sweepAll ? 'healthy' : admitNode(node);
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

  const callJsonRpc = async (path: readonly string[], args: unknown[]): Promise<unknown> => {
    const [namespace] = path;
    const route = await routeOf('api', path, configuredNodesOf(chain.endpointUrl));
    if (NON_RETRYABLE_NAMESPACES.has(namespace)) {
      // Sent once, to the routed node: a failed broadcast may still have been accepted.
      const node = route?.nodes[0];
      const target = !node || node === chain.endpointUrl ? chain : getAttemptChain(node);
      return callOn(target.api, 'api', path, args);
    }
    const isOptional = OPTIONAL_NAMESPACES.has(namespace);
    const family = route?.family ?? namespace;
    return callWithFailover({
      label: path.join('.'),
      nodes: route?.nodes ?? configuredNodesOf(chain.endpointUrl),
      chainEndpoint: chain.endpointUrl,
      healthKey: (node) => jsonRpcHealthKey(node, family),
      unreachableKey: nodeUnreachableKey,
      invoke: (target) => callOn(target.api, 'api', path, args),
      isNodeFailure: isOptional
        ? async (error) => isApiNotServedError(error) || (await isTransportError(error))
        : isTransportError,
      isApiNotServed: isApiNotServedError,
      retriesPrimary: policy.retriesPrimary,
      // Nodes may stall on an optional namespace alone while serving every other call.
      reportsSilence: policy.reportsSilence && !isOptional,
      onFailover: route ? route.onFallback : onFailover,
      report: route?.report
    });
  };

  const callRest = async (
    isUnavailable: (error: unknown, path: readonly string[]) => boolean,
    path: readonly string[],
    args: unknown[]
  ): Promise<unknown> => {
    const primary = endpointOf(resolveApiPath(chain.restApi, [], 'restApi'));
    const ownEndpoint = endpointOf(resolveApiPath(chain.restApi, path, 'restApi'));
    if (typeof primary !== 'string' || typeof ownEndpoint !== 'string') {
      return callOn(chain.restApi, 'restApi', path, args);
    }
    // A REST API with an endpoint of its own is failed over only when it is routed by its family.
    const configured = ownEndpoint === primary ? configuredNodesOf(primary) : [ownEndpoint];
    const route = await routeOf('restApi', path, configured);
    if (!route && ownEndpoint !== primary) return callOn(chain.restApi, 'restApi', path, args);
    const apiName = path[0];
    return callWithFailover({
      label: path.join('.'),
      nodes: route?.nodes ?? configured,
      chainEndpoint: ownEndpoint,
      healthKey: (node) => restApiHealthKey(node, apiName),
      invoke: (target) => callOn(target.restApi, 'restApi', path, args),
      isNodeFailure: (error) => isUnavailable(error, path),
      isApiNotServed: isEndpointMissing,
      retriesPrimary: false,
      reportsSilence: policy.reportsSilence,
      onFailover: route?.onFallback,
      report: route?.report
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
