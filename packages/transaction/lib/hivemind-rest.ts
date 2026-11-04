import { getLogger } from '@ui/lib/logging';
import { checkAccountNameFormat } from '@hive/ui/lib/account-name-rules';
import { getHivemindRestApi, type HivemindRestApi } from './chain';
import { isEndpointMissing, ReadTransportError } from './read-transport';

const logger = getLogger('app');

/** How long a REST endpoint a node lacks is read over JSON-RPC without asking for it again. */
const HIVEMIND_ENDPOINT_MISSING_TTL_MS = 15 * 60 * 1000;

const missingUntil = new Map<keyof HivemindRestApi, number>();

const isKnownMissing = (endpoint: keyof HivemindRestApi): boolean => {
  const until = missingUntil.get(endpoint);
  return until !== undefined && Date.now() < until;
};

/** The values a REST read puts in its URL path, each one path segment. */
export interface IHivemindRestPath {
  accounts?: readonly string[];
  permlinks?: readonly string[];
}

/**
 * A permlink hivemind's REST routes take as one path segment: hivemind's front decodes `%2F` back to
 * a `/` of the path, so a permlink outside this set is read over JSON-RPC instead.
 */
const REST_PERMLINK = /^[\w.-]+$/;
const DOTS_ONLY = /^\.+$/;

const isRestPathValid = ({ accounts = [], permlinks = [] }: IHivemindRestPath): boolean =>
  accounts.every((account) => checkAccountNameFormat(account) === null) &&
  permlinks.every((permlink) => REST_PERMLINK.test(permlink) && !DOTS_ONLY.test(permlink));

/**
 * Reads `endpoint` of hivemind's REST API with `rest` when a hivemind REST node is configured
 * (`HIVEMIND_REST_NODES`) and every account name and permlink of `path` (the values `rest` puts in
 * the URL path) is valid, and with `jsonRpc`, the same read over JSON-RPC, otherwise. `rest` must
 * resolve to what `jsonRpc` would. `api` is the REST API `rest` is given, `getHivemindRestApi()`
 * unless the read fails over in a way of its own (see `getSearchHivemindRestApi`).
 *
 * Any failure of the REST read (`ReadTransportError`) is answered by `jsonRpc`, so callers see
 * JSON-RPC's results and errors: a node lacking the endpoint (`isEndpointMissing`, which does not
 * mark the node down) is then not asked for it for HIVEMIND_ENDPOINT_MISSING_TTL_MS, nodes that are
 * all down are skipped until their cooldown ends, and an API answer (400, or a 404 about a missing
 * item) gets JSON-RPC's own. Any other error of `rest` rejects as is.
 */
export async function readFromHivemind<T>(
  endpoint: keyof HivemindRestApi,
  path: IHivemindRestPath,
  rest: (api: HivemindRestApi) => Promise<T>,
  jsonRpc: () => Promise<T>,
  api: HivemindRestApi | undefined = getHivemindRestApi()
): Promise<T> {
  if (!api || isKnownMissing(endpoint) || !isRestPathValid(path)) return jsonRpc();
  try {
    return await rest(api);
  } catch (error) {
    if (!(error instanceof ReadTransportError)) throw error;
    if (isEndpointMissing(error)) {
      missingUntil.set(endpoint, Date.now() + HIVEMIND_ENDPOINT_MISSING_TTL_MS);
      logger.info(
        'hivemind-api.%s: %s lacks it, reading over JSON-RPC for %d ms',
        endpoint,
        error.request.endpoint,
        HIVEMIND_ENDPOINT_MISSING_TTL_MS
      );
    } else if (error.status === undefined || error.status >= 500) {
      logger.warn(error, 'hivemind-api.%s failed, reading over JSON-RPC', endpoint);
    }
    return jsonRpc();
  }
}

/** `value`, or `undefined` for an empty string, which hivemind's JSON-RPC reads as absent too. */
export const nonEmpty = (value: string | null | undefined): string | undefined => value || undefined;
