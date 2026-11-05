import { API_SET_IDS, API_SETS_BOOTSTRAP_ID, type TApiSetId } from '@ui/config/api-set-ids';

/**
 * Sets only some nodes serve. Their calls go to the nodes the routes list for the set, never on to
 * the call's configured nodes, which were configured for core and can at best answer "Api not found".
 */
export const OPTIONAL_API_SETS: ReadonlySet<TApiSetId> = new Set(['lite']);

/** The result of a real call, as the engine's `report()` takes it. */
export type TApiSetOutcome =
  | { ok: true; latencyMs?: number }
  | { ok: false; error: 'apiNotFound' | 'transport'; message?: string; latencyMs?: number };

/**
 * The part of `ApiSetEngine` (`@hiveio/healthchecker-component/engine`) routing uses; the engine
 * satisfies it as it is, and this module never loads the engine, whose bundle carries wax.
 */
export interface IApiSetEngine {
  fallbackOrder(setId: string): string[];
  rankings(setId: string): { node: string; state: string }[];
  selection(setId: string): string;
  report(setId: string, node: string, outcome: TApiSetOutcome): boolean;
}

/** Where the calls of each API set go. */
export interface IApiSetView {
  /** The nodes to send the set's calls to, the first one first; empty when the view knows none. */
  nodesFor(setId: TApiSetId): readonly string[];
  /** The node the user chose for the set, when they chose one. */
  selectedNode(setId: TApiSetId): string | undefined;
  report(setId: TApiSetId, node: string, outcome: TApiSetOutcome): void;
}

/** A server's routes, handed to the browser with the page. */
export interface IApiSetsBootstrap {
  routes: Partial<Record<TApiSetId, string[]>>;
  selections: Partial<Record<TApiSetId, string>>;
}

export function bootstrapOf(view: IApiSetView): IApiSetsBootstrap {
  const bootstrap: IApiSetsBootstrap = { routes: {}, selections: {} };
  for (const setId of API_SET_IDS) {
    const nodes = view.nodesFor(setId);
    if (nodes.length > 0) bootstrap.routes[setId] = [...nodes];
    const selected = view.selectedNode(setId);
    if (selected) bootstrap.selections[setId] = selected;
  }
  return bootstrap;
}

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Reads a bootstrap from untrusted JSON (the page), keeping only well-formed entries of known sets. */
export function parseApiSetsBootstrap(value: unknown): IApiSetsBootstrap | undefined {
  if (!isRecord(value) || !isRecord(value.routes) || !isRecord(value.selections)) return undefined;
  const bootstrap: IApiSetsBootstrap = { routes: {}, selections: {} };
  for (const setId of API_SET_IDS) {
    const nodes = value.routes[setId];
    if (isStringArray(nodes)) bootstrap.routes[setId] = nodes;
    const selected = value.selections[setId];
    if (typeof selected === 'string') bootstrap.selections[setId] = selected;
  }
  return bootstrap;
}

/**
 * The routes the server rendered the page with, until the browser has an engine of its own. A node
 * a call found unusable moves behind the others for the rest of the page's life.
 */
export function createStaticView(bootstrap: IApiSetsBootstrap): IApiSetView {
  const demoted = new Map<TApiSetId, Set<string>>();
  return {
    nodesFor: (setId) => {
      const nodes = bootstrap.routes[setId] ?? [];
      const down = demoted.get(setId);
      return down
        ? [...nodes.filter((node) => !down.has(node)), ...nodes.filter((node) => down.has(node))]
        : nodes;
    },
    selectedNode: (setId) => bootstrap.selections[setId],
    report: (setId, node, outcome) => {
      const down = demoted.get(setId) ?? new Set<string>();
      if (outcome.ok) down.delete(node);
      else down.add(node);
      demoted.set(setId, down);
    }
  };
}

type TApiSetViewProvider = () => IApiSetView | undefined | Promise<IApiSetView | undefined>;

interface IApiSetsRegistry {
  view?: TApiSetViewProvider;
  snapshot?: () => unknown;
}

// On globalThis, not in this module: Next.js bundles the instrumentation hook, which installs the
// server's engine, apart from the pages and route handlers that route through it.
const REGISTRY_KEY = Symbol.for('denser.api-sets');

const registry = (): IApiSetsRegistry => {
  const existing: unknown = Reflect.get(globalThis, REGISTRY_KEY);
  if (isRecord(existing)) return existing;
  const created: IApiSetsRegistry = {};
  Reflect.set(globalThis, REGISTRY_KEY, created);
  return created;
};

/**
 * Installs where calls are routed: on the server the per-request view of its engine, in the browser
 * an engine once one is running. Until then (and wherever none is installed) calls keep the nodes
 * they were configured with, behind the page's bootstrap routes in the browser.
 */
export const provideApiSetView = (provider: TApiSetViewProvider | undefined): void => {
  registry().view = provider;
};

/** Installs the source of the server engine's health snapshot, for the page that shows it. */
export const provideApiSetSnapshot = (snapshot: (() => unknown) | undefined): void => {
  registry().snapshot = snapshot;
};

/** The server engine's health snapshot (`ApiSetEngine.snapshot()`), when the server runs one. */
export const getApiSetSnapshot = (): unknown => registry().snapshot?.();

let pageView: IApiSetView | null | undefined;

const readPageView = (): IApiSetView | null => {
  if (typeof document === 'undefined') return null;
  const text = document.getElementById(API_SETS_BOOTSTRAP_ID)?.textContent;
  if (!text) return null;
  try {
    const bootstrap = parseApiSetsBootstrap(JSON.parse(text));
    return bootstrap ? createStaticView(bootstrap) : null;
  } catch (error) {
    if (error instanceof SyntaxError) return null;
    throw error;
  }
};

/** The installed view, else the page's bootstrap routes in the browser; `undefined` when neither exists. */
export async function getApiSetView(): Promise<IApiSetView | undefined> {
  const provided = await registry().view?.();
  if (provided) return provided;
  if (pageView === undefined) pageView = readPageView();
  return pageView ?? undefined;
}

/** The nodes one call of a set may use, the first one first, and where its outcomes go. */
export interface IApiSetRoute {
  setId: TApiSetId;
  nodes: string[];
  /** The node the user chose for the set, when they chose one. */
  selected?: string;
  report(node: string, outcome: TApiSetOutcome): void;
}

export interface IRouteNodes {
  /**
   * A node that goes before the view's, e.g. one the user picked before API sets existed; ignored
   * while the user chose a node for the set, a choice that always wins.
   */
  pinned?: string;
  /** The nodes the call was configured with, used after the view's. */
  configured: readonly string[];
}

/** Routes one call of `setId`: the pinned node, the view's nodes, then the configured ones. */
export async function routeApiSet(
  setId: TApiSetId,
  { pinned, configured }: IRouteNodes
): Promise<IApiSetRoute> {
  const view = await getApiSetView();
  const selected = view?.selectedNode(setId);
  const nodes = [selected ? undefined : pinned, ...(view?.nodesFor(setId) ?? []), ...configured].filter(
    (node): node is string => !!node
  );
  return {
    setId,
    nodes: [...new Set(nodes)],
    selected,
    report: (node, outcome) => view?.report(setId, node, outcome)
  };
}

/** JSON-RPC namespaces outside the core set; every other one (database_api, condenser_api, ...) is core. */
const JSON_RPC_SETS: Readonly<Record<string, TApiSetId | null>> = {
  bridge: 'bridge',
  lite: 'lite',
  // Served by hivesense at an endpoint of its own, which is configured, not routed.
  'search-api': null
};

/** The set of a JSON-RPC call by its namespace, or `undefined` for one not routed by set. */
export const apiSetOfJsonRpc = (namespace: string): TApiSetId | undefined => {
  if (!Object.hasOwn(JSON_RPC_SETS, namespace)) return 'core';
  return JSON_RPC_SETS[namespace] ?? undefined;
};

const REST_SETS: Readonly<Record<string, TApiSetId>> = {
  'balance-api': 'balance-api',
  'hafah-api': 'hafah',
  'hivemind-api': 'hivemind-rest',
  'hivesense-api': 'hivesense'
};

/** The set of a REST API by its name, or `undefined` for one not routed by set. */
export const apiSetOfRest = (apiName: string): TApiSetId | undefined =>
  Object.hasOwn(REST_SETS, apiName) ? REST_SETS[apiName] : undefined;
