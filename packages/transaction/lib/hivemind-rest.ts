import { getLogger } from '@ui/lib/logging';
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

/**
 * Reads `endpoint` of hivemind's REST API with `rest` when a hivemind REST node is configured
 * (`HIVEMIND_REST_NODES`), and with `jsonRpc`, the same read over JSON-RPC, otherwise. `rest` must
 * resolve to what `jsonRpc` would.
 *
 * Any failure of the REST read (`ReadTransportError`) is answered by `jsonRpc`, so callers see
 * JSON-RPC's results and errors: a node lacking the endpoint (404 or PGRST202, which does not mark
 * the node down) is then not asked for it for HIVEMIND_ENDPOINT_MISSING_TTL_MS, nodes that are all
 * down are skipped until their cooldown ends, and an API rejection (400) gets JSON-RPC's own error.
 * Any other error of `rest` rejects as is.
 */
export async function readFromHivemind<T>(
  endpoint: keyof HivemindRestApi,
  rest: (api: HivemindRestApi) => Promise<T>,
  jsonRpc: () => Promise<T>
): Promise<T> {
  const api = getHivemindRestApi();
  if (!api || isKnownMissing(endpoint)) return jsonRpc();
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
