import type { TApiSetId } from '@ui/config/api-set-ids';
import type { IApiNodeSwitchDetail } from '../api-node-switch';
import type { IFailoverRoute } from '../server-failover';
import { apiSetOfJsonRpc, apiSetOfRest, routeApiSet, type IApiSetRoute } from './router';

/** The nodes the browser's chain is configured with (`getApiEndpoints()`). */
export interface IBrowserEndpoints {
  /** The legacy `node-endpoint` pick, else this session's automatic switch, else the configured node. */
  apiEndpoint: string;
  /** The legacy `rest-node-endpoint` pick, else the REST endpoint that follows `apiEndpoint`. */
  restApiEndpoint: string;
  /** The legacy `ai-search-endpoint` pick. */
  searchApiEndpoint?: string;
}

/** The browser's node state the routes follow, and what they tell it. */
export interface IBrowserNodeState {
  endpoints: () => IBrowserEndpoints;
  /** The deployment's JSON-RPC node (`REACT_APP_API_ENDPOINT`). */
  configuredApiEndpoint: string;
  /** The deployment's REST node: `REACT_APP_REST_API_ENDPOINT`, else the JSON-RPC node. */
  configuredRestEndpoint: string;
  /** Moves the browser's JSON-RPC node to `node` for the rest of the session. */
  switchApiNode: (node: string) => void;
  /** Tells the page a call left the node the user chose for a set. */
  announceSwitch: (node: string, detail: IApiNodeSwitchDetail) => void;
}

/**
 * The sets whose calls went to the browser's one JSON-RPC node before API sets existed. lite is not
 * one of them: a node the user picked then was picked for core and bridge, and says nothing about
 * whether it serves `lite.*`.
 */
const JSON_RPC_NODE_SETS: ReadonlySet<TApiSetId> = new Set(['core', 'bridge']);
/** The sets the browser's one REST node served before API sets existed. */
const REST_NODE_SETS: ReadonlySet<TApiSetId> = new Set(['balance-api', 'hafah']);

export interface IApiSetRouting {
  /** `routeFor` of `wrapChainWithServerFailover`. */
  routeCall: (
    root: 'api' | 'restApi',
    path: readonly string[],
    configured: readonly string[]
  ) => Promise<IFailoverRoute | undefined>;
  /** The nodes the calls of `setId` go to, best first, behind which come `configured`. */
  nodesOf: (setId: TApiSetId, configured: readonly string[]) => Promise<string[]>;
}

/**
 * How calls are routed by API set (see `api-sets/router`). In the browser (`browser` given) a node
 * picked before API sets existed (`node-endpoint`, `rest-node-endpoint`, `ai-search-endpoint`), or
 * the JSON-RPC node this session switched to, goes first for the sets that node served, unless the
 * user chose a node for the set. Only a core call that left the browser's JSON-RPC node switches
 * that node: a bridge, lite or search-api node failing, or not serving the call, says nothing about core.
 */
export function createApiSetRouting(browser?: IBrowserNodeState): IApiSetRouting {
  const pinnedNodeOf = (setId: TApiSetId): string | undefined => {
    if (!browser) return undefined;
    const endpoints = browser.endpoints();
    if (setId === 'hivesense') return endpoints.searchApiEndpoint;
    if (JSON_RPC_NODE_SETS.has(setId)) {
      return endpoints.apiEndpoint !== browser.configuredApiEndpoint ? endpoints.apiEndpoint : undefined;
    }
    if (REST_NODE_SETS.has(setId)) {
      return endpoints.restApiEndpoint !== browser.configuredRestEndpoint
        ? endpoints.restApiEndpoint
        : undefined;
    }
    return undefined;
  };

  // A core call fails over only when its node failed on transport or stalled (core is no optional
  // namespace, so "Api not found" is an answer), so leaving the browser's node means that node failed.
  const onFallback = (state: IBrowserNodeState, route: IApiSetRoute, node: string): void => {
    const [first] = route.nodes;
    if (route.selected && route.selected === first) {
      state.announceSwitch(node, { setId: route.setId, selected: route.selected });
    } else if (route.setId === 'core' && first === state.endpoints().apiEndpoint) {
      state.switchApiNode(node);
    }
  };

  const routeOf = (setId: TApiSetId, configured: readonly string[]) =>
    routeApiSet(setId, { pinned: pinnedNodeOf(setId), configured });

  const routeCall: IApiSetRouting['routeCall'] = async (root, path, configured) => {
    const setId = root === 'api' ? apiSetOfJsonRpc(path[0]) : apiSetOfRest(path[0]);
    // A JSON-RPC call not routed by set (search-api) goes to an endpoint of its own on every node's
    // chain, so it keeps its configured nodes without the global `onFailover`: another node serving
    // it says nothing about the browser's JSON-RPC node.
    if (!setId) return root === 'api' ? { nodes: configured } : undefined;
    const route = await routeOf(setId, configured);
    return {
      nodes: route.nodes,
      report: route.report,
      onFallback: browser && ((node) => onFallback(browser, route, node))
    };
  };

  return {
    routeCall,
    nodesOf: async (setId, configured) => (await routeOf(setId, configured)).nodes
  };
}
