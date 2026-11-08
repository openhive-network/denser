import {
  ApiSetEngine,
  jsonRpcApiProbe,
  jsonRpcMethodProbe,
  restProbe,
  type ApiChecker,
  type ApiProbe,
  type ApiSet,
  type ProbeContext,
  type ProbeResult,
  type ApiSetEngineOptions,
  type PreferenceOrder
} from '@hiveio/healthchecker-component/engine';
import {
  API_SET_TITLES,
  HIVEMIND_GROUP_SETS,
  HIVEMIND_SET_GROUP,
  preferredNodes,
  type IApiSetsConfig,
  type TApiSetId
} from '@ui/config/api-sets';
import { getLogger } from '@ui/lib/logging';
import { recordProbeAnswer, recordProbeFailure } from './probe-answers';

const logger = getLogger('app');

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

/** The lite methods a node lists in `lite.get_info`, and `social` when it runs the social app. */
const liteFeatures = (info: unknown): string[] => {
  if (typeof info !== 'object' || info === null) return [];
  const methods = Reflect.get(info, 'methods');
  const apps: unknown = Reflect.get(info, 'apps');
  const social = typeof apps === 'object' && apps !== null ? Reflect.get(apps, 'social') : undefined;
  return [...(isStringArray(methods) ? methods : []), ...(social ? ['social'] : [])];
};

// `lite.get_info` is kept for the lite reads (see `lite-api`), which need its answer, not only the
// verdict, so they need not ask the node again. A probe that rejects (the engine's `TransportError`
// of a timeout, network error or HTTP 5xx, or an answer that tells nothing) is kept as failed, not as
// "not lite": a stalled node may well serve lite.
const liteProbe: ApiProbe = async (context: ProbeContext) => {
  const probe = jsonRpcMethodProbe('lite.get_info', {}, (info: unknown) => {
    recordProbeAnswer('lite', context.node, info);
    return liteFeatures(info);
  });
  let result: ProbeResult;
  try {
    result = await probe(context);
  } catch (error) {
    recordProbeFailure('lite', context.node);
    throw error;
  }
  if (!result.supported) recordProbeAnswer('lite', context.node, null);
  return result;
};

/**
 * A post list of the hivemind version whose REST reads denser's feeds make: older hivemind REST nodes
 * answer `/hivemind-api/` and some reads (account operations, discussions) but 404 a post list, so
 * its root would count them as serving the set.
 */
const HIVEMIND_REST_PROBE_PATH = '/hivemind-api/posts?sort=trending&limit=1&votes=none';

/**
 * How the engine asks a node whether it serves a set: a cheap call of the API (a post that does not
 * exist, an API's root, a one-post list), whose own error still counts as served.
 */
const PROBES: Readonly<Record<TApiSetId, ApiProbe>> = {
  core: jsonRpcMethodProbe('database_api.get_dynamic_global_properties', {}),
  bridge: jsonRpcApiProbe('bridge.get_post', { author: 'hc-probe', permlink: 'hc-probe', observer: '' }),
  lite: liteProbe,
  'hivemind-rest': restProbe(HIVEMIND_REST_PROBE_PATH),
  'balance-api': restProbe('/balance-api/'),
  hafah: restProbe('/hafah-api/'),
  hivesense: restProbe('/hivesense-api/'),
  fyp: restProbe('/v1/fyp/feed/hive.blog?page=1&page-size=1')
};

/** Health checks (wax `HealthChecker` checks) per set, for an engine that runs them. */
export type TApiSetChecks = Partial<Record<TApiSetId, ApiChecker[]>>;

/** The first wait before a node outside the operator's list that could not answer is probed again. */
const UNREACHABLE_BACKOFF_MS = 30_000;
/** The longest such a node waits: each failed probe doubles its wait up to this. */
const MAX_UNREACHABLE_BACKOFF_MS = 30 * 60_000;

// A node with a path (`https://api.syncad.com/haf-fyp-api`) is the URL of one API, not an API node.
const isFeatureUrl = (node: string): boolean => new URL(node).pathname !== '/';

/**
 * Sets served only at a feature URL, with why an API node is none of their nodes: their calls go to
 * `<feature URL>/<path>`, which an API node does not serve at its root.
 */
const FEATURE_URL_ONLY_SETS: Partial<Record<TApiSetId, string>> = {
  fyp: 'not a For You API URL'
};

/** `probe` of `setId`, logging each outcome at debug level. */
const loggedProbe =
  (setId: TApiSetId, probe: ApiProbe): ApiProbe =>
  async (context) => {
    try {
      const result = await probe(context);
      // `in`, not `supported`: the unit tests type-check without strictNullChecks, which keeps a boolean
      // discriminant from narrowing.
      if ('reason' in result) {
        logger.debug('API set %s: %s does not serve it: %s', setId, context.node, result.reason);
      } else logger.debug('API set %s: %s serves it', setId, context.node);
      return result;
    } catch (error) {
      logger.debug('API set %s: probing %s failed: %s', setId, context.node, String(error));
      throw error;
    }
  };

/**
 * `setId`'s probe as the engine runs it, logged: a feature URL another set lists is no node of this set, nor
 * is an API node of a set served only at feature URLs, so neither is asked; a node the operator does not list for the set (a node users may pick) that
 * could not answer is not asked again until its back-off, doubling with each failure, ends.
 */
function probeOf(config: IApiSetsConfig, setId: TApiSetId, now: () => number): ApiProbe {
  const probe = loggedProbe(setId, PROBES[setId]);
  const preferred = new Set(preferredNodes(config, setId));
  const backoffs = new Map<string, { failures: number; until: number }>();
  const notAFeatureUrl = FEATURE_URL_ONLY_SETS[setId];
  return async (context) => {
    const { node } = context;
    if (preferred.has(node)) return probe(context);
    if (isFeatureUrl(node)) return { supported: false, reason: 'the URL of another API set' };
    if (notAFeatureUrl) return { supported: false, reason: notAFeatureUrl };
    const backoff = backoffs.get(node);
    if (backoff && now() < backoff.until) {
      throw new Error(
        `${node} could not be reached; not probed again before ${new Date(backoff.until).toISOString()}`
      );
    }
    try {
      const result = await probe(context);
      backoffs.delete(node);
      return result;
    } catch (error) {
      const failures = (backoff?.failures ?? 0) + 1;
      const waitMs = Math.min(MAX_UNREACHABLE_BACKOFF_MS, UNREACHABLE_BACKOFF_MS * 2 ** (failures - 1));
      backoffs.set(node, { failures, until: now() + waitMs });
      throw error;
    }
  };
}

/** The engine's declaration of the deployment's sets, with their probes, checks and soft group. */
export function createApiSets(
  config: IApiSetsConfig,
  checks: TApiSetChecks = {},
  now: () => number = Date.now
): ApiSet[] {
  return config.sets.map((setId) => ({
    id: setId,
    title: API_SET_TITLES[setId],
    probe: probeOf(config, setId, now),
    checks: checks[setId],
    group: HIVEMIND_GROUP_SETS.includes(setId) ? HIVEMIND_SET_GROUP : undefined
  }));
}

export interface IApiSetEngineOptions extends Omit<ApiSetEngineOptions, 'nodes' | 'sets' | 'preferences'> {
  checks?: TApiSetChecks;
}

/** An engine over the deployment's catalog, sets and preferences (see `resolveApiSetsConfig`). */
export function createApiSetEngine(
  config: IApiSetsConfig,
  { checks, ...options }: IApiSetEngineOptions = {}
) {
  const preferences: Record<string, PreferenceOrder> = {};
  for (const setId of config.sets) preferences[setId] = config.preferences[setId];
  return new ApiSetEngine({
    ...options,
    nodes: config.nodes,
    sets: createApiSets(config, checks, options.now),
    preferences
  });
}
