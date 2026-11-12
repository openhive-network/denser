import type { Entry, HivemindRestPostPage } from '@hive/common-hiveio-packages/wax';
import { getLogger } from '@ui/lib/logging';
import { checkAccountNameFormat } from '@hive/ui/lib/account-name-rules';
import { getHivemindRestApi, type HivemindRestApi } from './chain';
import { isEndpointMissing, isRequestRejected, ReadTransportError } from './read-transport';

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
 * all down are skipped until their cooldown ends, and an API answer (400, or the endpoint's own 404,
 * PT404, about one item) gets JSON-RPC's own. Any other error of `rest` rejects as is.
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

/**
 * The length REST post lists cut bodies at (`truncate-body`): a card shows only a summary and an
 * image, and a post without a metadata image takes its card image from the body, where the first one
 * can start thousands of characters in. Measured on trending/created/hot/payout lists, this keeps
 * every sampled card's image and summary as from the full body; 5000 kept all but one image, which
 * started at 8750.
 */
export const POST_LIST_BODY_LENGTH = 9000;

/** The params a REST post list read adds for a list sized for cards: no votes, cut bodies. */
export type TPostListShape = Pick<HivemindRestPostPage, 'votes' | 'truncate-body'>;

const POST_LIST_SHAPE: TPostListShape = { votes: 'none', 'truncate-body': POST_LIST_BODY_LENGTH };

/** The params a REST single post or discussion read adds for a read without votes. */
export type TPostShape = Pick<HivemindRestPostPage, 'votes'>;

const POST_SHAPE: TPostShape = { votes: 'none' };

/** The REST reads asking for a shape, each with its own record: a node may take it on one and not another. */
type TShapedRead = 'post lists' | 'posts';

const shapeRejectedUntil = new Map<TShapedRead, number>();

/** PostgREST error codes a function raises itself: it was found and took the request's params. */
const FUNCTION_OWN_ANSWERS = new Set(['P0001', 'PT404']);

const isFunctionOwnAnswer = ({ body }: ReadTransportError): boolean =>
  typeof body === 'object' && body !== null && FUNCTION_OWN_ANSWERS.has(String(Reflect.get(body, 'code')));

const isShapeRejected = (error: unknown): boolean =>
  error instanceof ReadTransportError &&
  !isFunctionOwnAnswer(error) &&
  (isEndpointMissing(error) || (error.status !== undefined && isRequestRejected(error.status)));

const rejectShape = (kind: TShapedRead): void => {
  shapeRejectedUntil.set(kind, Date.now() + HIVEMIND_ENDPOINT_MISSING_TTL_MS);
  logger.info('hivemind REST rejects votes=none, reading %s with votes for %d ms', kind, HIVEMIND_ENDPOINT_MISSING_TTL_MS);
};

/**
 * `read` asked with `shape`, unless `kind` was rejected within HIVEMIND_ENDPOINT_MISSING_TTL_MS.
 * A node that rejects the shape (an older hivemind: a 4xx, or a function not found, but not the
 * function's own answer such as "Post … does not exist") is asked again without it, and once that
 * second request is served or gets the function's own answer, for HIVEMIND_ENDPOINT_MISSING_TTL_MS
 * no `kind` read is asked with it. `shaped` maps an answer to the shaped request. Every other error,
 * and any of the second request, is thrown.
 */
async function readWithShape<T, S extends object>(
  kind: TShapedRead,
  shape: S,
  read: (shape: Partial<S>) => Promise<T>,
  shaped: (answer: T) => T = (answer) => answer
): Promise<T> {
  if (Date.now() < (shapeRejectedUntil.get(kind) ?? 0)) return read({});
  try {
    return shaped(await read(shape));
  } catch (error) {
    if (!isShapeRejected(error)) throw error;
    try {
      const answer = await read({});
      rejectShape(kind);
      return answer;
    } catch (retryError) {
      // The function answered the request without the shape itself, so the node rejects only the shape.
      if (retryError instanceof ReadTransportError && isFunctionOwnAnswer(retryError)) rejectShape(kind);
      throw retryError;
    }
  }
}

const markBodiesCut = (entries: Entry[] | null): Entry[] | null =>
  entries && entries.map((entry) => ({ ...entry, _bodyCutAt: POST_LIST_BODY_LENGTH }));

/**
 * A REST post list (`/posts`, `/accounts/{name}/posts`) read by `read` with `votes=none` and bodies
 * cut at POST_LIST_BODY_LENGTH, each entry marked with the length (`_bodyCutAt`), on a node that
 * rejects those params with them left out (see `readWithShape`).
 */
export const readRestPostList = (read: (shape: TPostListShape) => Promise<Entry[] | null>): Promise<Entry[] | null> =>
  readWithShape('post lists', POST_LIST_SHAPE, read, markBodiesCut);

/**
 * A REST single post or discussion (`/posts/{author}/{permlink}`, its `/discussion`) read by `read`
 * with `votes=none`, its entries carrying `observer_vote` and no `active_votes`, on a node that
 * rejects it without (see `readWithShape`).
 */
export const readRestPost = <T>(read: (shape: TPostShape) => Promise<T>): Promise<T> =>
  readWithShape('posts', POST_SHAPE, read);
