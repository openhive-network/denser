import type { ApiSetEngine } from '@hiveio/healthchecker-component/engine';
import { apiSetsEnvFromProcess, apiSetsOfApp, resolveServerApiSetsConfig } from '@ui/config/api-sets';
import { getLogger } from '@ui/lib/logging';
import { createApiSetEngine } from './definitions';
import { createEngineView } from './engine-view';
import { provideApiSetSnapshot, provideApiSetView } from './router';

const logger = getLogger('app');

/** `DENSER_API_SETS_PROBING=off` keeps the server from probing nodes; real calls still rank them. */
export const isApiSetProbingEnabled = (env: Readonly<Record<string, string | undefined>>): boolean =>
  env.DENSER_API_SETS_PROBING?.trim().toLowerCase() !== 'off';

export interface IServerApiSetsOptions {
  /** The app (`blog`, `wallet`), whose sets are routed. */
  app: string;
  env?: Readonly<Record<string, string | undefined>>;
}

/**
 * Starts the process's shared engine over the operator's nodes alone (`resolveServerApiSetsConfig`,
 * probing them unless `DENSER_API_SETS_PROBING=off`) and routes every server call through its one
 * view, which learns from every call's outcome. Nothing of a request chooses or adds a node: the
 * server calls only the nodes the operator configured and fails over only among them (DR-001).
 */
export function installServerApiSets({ app, env = process.env }: IServerApiSetsOptions): ApiSetEngine {
  const config = resolveServerApiSetsConfig(apiSetsEnvFromProcess(env), apiSetsOfApp(app));
  const shared = createApiSetEngine(config);
  if (isApiSetProbingEnabled(env)) {
    shared.start().catch((error: unknown) => logger.error(error, 'Probing the API nodes failed'));
  }
  const view = createEngineView(shared, config);
  provideApiSetView(() => view);
  provideApiSetSnapshot(() => shared.snapshot());
  logger.info(
    'Routing API calls by API set over %d node(s): %s',
    config.nodes.length,
    config.sets.join(', ')
  );
  return shared;
}
