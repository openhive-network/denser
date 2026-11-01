import { ApiSetEngine } from '@hiveio/healthchecker-component/engine';
import { apiSetsEnvFromProcess, apiSetsOfApp, resolveApiSetsConfig } from '@ui/config/api-sets';
import { getLogger } from '@ui/lib/logging';
import { createApiSetEngine } from './definitions';
import { createEngineView } from './engine-view';
import { provideApiSetSnapshot, provideApiSetView, type IApiSetView } from './router';

const logger = getLogger('app');

/** Reads the API sets cookie of the request being served; undefined outside a request. */
export type TReadApiSetsCookie = () => Promise<string | undefined>;

/** How long the view of one cookie is reused: per-request engines are cheap, not free. */
const REQUEST_VIEW_TTL_MS = 2_000;
/** Most cookies whose views are kept at once; the oldest goes first. */
const MAX_REQUEST_VIEWS = 256;

/** `DENSER_API_SETS_PROBING=off` keeps the server from probing nodes; real calls still rank them. */
export const isApiSetProbingEnabled = (env: Readonly<Record<string, string | undefined>>): boolean =>
  env.DENSER_API_SETS_PROBING?.trim().toLowerCase() !== 'off';

export interface IServerApiSetsOptions {
  /** The app (`blog`, `wallet`), whose sets are routed. */
  app: string;
  readCookie: TReadApiSetsCookie;
  env?: Readonly<Record<string, string | undefined>>;
}

/**
 * Starts the process's shared engine over the operator's catalog (probing it unless
 * `DENSER_API_SETS_PROBING=off`) and routes the server's calls through it. A request with an API
 * sets cookie is routed by a fresh engine of its own (`ApiSetEngine.forRequest`): the shared one
 * never takes a cookie, so one user's choices never reach another's pages and a cookie never makes
 * the server fetch a node of its choosing. Every call's outcome is reported to the shared engine.
 */
export function installServerApiSets({
  app,
  readCookie,
  env = process.env
}: IServerApiSetsOptions): ApiSetEngine {
  const config = resolveApiSetsConfig(apiSetsEnvFromProcess(env), apiSetsOfApp(app));
  const shared = createApiSetEngine(config);
  if (isApiSetProbingEnabled(env)) {
    shared.start().catch((error: unknown) => logger.error(error, 'Probing the API nodes failed'));
  }
  const sharedView = createEngineView(shared, config);
  const requestViews = new Map<string, { view: IApiSetView; expiresAt: number }>();

  const requestViewOf = (cookie: string): IApiSetView => {
    const now = Date.now();
    const cached = requestViews.get(cookie);
    if (cached && cached.expiresAt > now) return cached.view;
    const requestView = createEngineView(ApiSetEngine.forRequest(shared, cookie), config);
    const view: IApiSetView = { ...requestView, report: sharedView.report };
    requestViews.delete(cookie);
    requestViews.set(cookie, { view, expiresAt: now + REQUEST_VIEW_TTL_MS });
    if (requestViews.size > MAX_REQUEST_VIEWS) {
      const [oldest] = requestViews.keys();
      requestViews.delete(oldest);
    }
    return view;
  };

  provideApiSetView(async () => {
    const cookie = await readCookie();
    return cookie ? requestViewOf(cookie) : sharedView;
  });
  provideApiSetSnapshot(() => shared.snapshot());
  logger.info(
    'Routing API calls by API set over %d node(s): %s',
    config.nodes.length,
    config.sets.join(', ')
  );
  return shared;
}
