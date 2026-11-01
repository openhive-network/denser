import type { ApiSetEngine, SelectionStorage } from '@hiveio/healthchecker-component/engine';
import { isApiSetId } from '@ui/config/api-set-ids';
import type { IApiSetsConfig } from '@ui/config/api-sets';
import { announceApiNodeSwitch } from '../api-node-switch';
import { createApiSetEngine, type TApiSetChecks } from './definitions';
import { createEngineView } from './engine-view';
import { provideApiSetView } from './router';

export interface IBrowserApiSetEngineOptions {
  config: IApiSetsConfig;
  storage: SelectionStorage;
  /** The server engine's health (`ApiSetEngine.snapshot()`), so the browser starts from its view. */
  snapshot?: unknown;
  checks?: TApiSetChecks;
}

let engine: ApiSetEngine | undefined;

/**
 * The browser's engine, created on first use: it restores the user's choices from `storage`, takes
 * the server's node health, and from then on routes the browser's calls (replacing the routes the
 * page was rendered with) and learns from their outcomes. It probes nodes only once started.
 */
export function getBrowserApiSetEngine({
  config,
  storage,
  snapshot,
  checks
}: IBrowserApiSetEngineOptions): ApiSetEngine {
  if (engine) return engine;
  const created = createApiSetEngine(config, { storage, checks });
  // Calls outside /healthchecker route by the server's bootstrap, which never names a custom node,
  // and the CSP lets the page call catalog nodes only: a custom node could be chosen, never used.
  created.addNode = () => false;
  if (snapshot !== undefined) created.hydrateSnapshot(snapshot);
  created.on('selectionfallback', ({ setId, selected, node }) => {
    if (node && isApiSetId(setId)) announceApiNodeSwitch(node, { setId, selected });
  });
  const view = createEngineView(created, config);
  provideApiSetView(() => view);
  engine = created;
  return created;
}
