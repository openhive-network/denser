import {
  ApiSetEngine,
  jsonRpcApiProbe,
  jsonRpcMethodProbe,
  restProbe,
  type ApiChecker,
  type ApiProbe,
  type ApiSet,
  type ApiSetEngineOptions,
  type PreferenceOrder
} from '@hiveio/healthchecker-component/engine';
import {
  API_SET_TITLES,
  HIVEMIND_GROUP_SETS,
  HIVEMIND_SET_GROUP,
  type IApiSetsConfig,
  type TApiSetId
} from '@ui/config/api-sets';

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

/**
 * How the engine asks a node whether it serves a set: a cheap call of the API (a post that does not
 * exist, an API's root), whose own error still counts as served.
 */
const PROBES: Readonly<Record<TApiSetId, ApiProbe>> = {
  core: jsonRpcMethodProbe('database_api.get_dynamic_global_properties', {}),
  bridge: jsonRpcApiProbe('bridge.get_post', { author: 'hc-probe', permlink: 'hc-probe', observer: '' }),
  lite: jsonRpcMethodProbe('lite.get_info', {}, liteFeatures),
  'hivemind-rest': restProbe('/hivemind-api/'),
  'balance-api': restProbe('/balance-api/'),
  hafah: restProbe('/hafah-api/'),
  hivesense: restProbe('/hivesense-api/'),
  fyp: restProbe('/v1/fyp/feed/hive.blog?page=1&page-size=1')
};

/** Health checks (wax `HealthChecker` checks) per set, for an engine that runs them. */
export type TApiSetChecks = Partial<Record<TApiSetId, ApiChecker[]>>;

/** The engine's declaration of the deployment's sets, with their probes, checks and soft group. */
export function createApiSets(config: IApiSetsConfig, checks: TApiSetChecks = {}): ApiSet[] {
  return config.sets.map((setId) => ({
    id: setId,
    title: API_SET_TITLES[setId],
    probe: PROBES[setId],
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
    sets: createApiSets(config, checks),
    preferences
  });
}
