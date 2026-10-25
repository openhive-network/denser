import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'http';

/**
 * A hivemind REST node for the fixture suite. hivemind's REST paths wrap its JSON-RPC methods, so the
 * stub answers each `GET /hivemind-api/...` with the JSON-RPC call it wraps, asked of the fixture
 * proxy: a feed read over REST is answered by the same recording as over JSON-RPC. The call is built
 * with the params, in the order, that the blog sends over JSON-RPC, since the proxy matches calls by
 * their exact body. A path it does not know answers 404, as a node without the endpoint does; a
 * JSON-RPC error answers 400, as hivemind's REST errors do.
 *
 * The suite's third blog server (HIVEMIND_REST_BLOG_PORT) serves with HIVEMIND_REST_NODES naming
 * the stub; the other servers leave the setting empty.
 */
export const HIVEMIND_REST_STUB_PORT = 8201;
export const HIVEMIND_REST_BLOG_PORT = 3002;
export const HIVEMIND_REST_STUB_URL = `http://localhost:${HIVEMIND_REST_STUB_PORT}`;

export interface IHivemindRestRequest {
  /** Path and query, e.g. `/hivemind-api/posts?sort=trending&observer=hive.blog&page-size=20`. */
  url: string;
  status: number;
}

export interface IHivemindRestStub {
  readonly requests: IHivemindRestRequest[];
  close(): Promise<void>;
}

interface IJsonRpcCall {
  method: string;
  params: Record<string, unknown> | unknown[];
}

type TQuery = URLSearchParams;

const text = (query: TQuery, name: string): string => query.get(name) ?? '';
const pageSize = (query: TQuery): number | undefined =>
  query.has('page-size') ? Number(query.get('page-size')) : undefined;

/** The JSON-RPC call of each REST path, by a pattern over the path below `/hivemind-api`. */
const ROUTES: Array<{ pattern: RegExp; toCall: (match: string[], query: TQuery) => IJsonRpcCall }> = [
  {
    pattern: /^\/posts$/,
    toCall: (_match, query) => ({
      method: 'bridge.get_ranked_posts',
      params: {
        sort: text(query, 'sort'),
        start_author: text(query, 'start-author'),
        start_permlink: text(query, 'start-permlink'),
        limit: pageSize(query),
        tag: text(query, 'tag'),
        observer: query.get('observer') ?? undefined
      }
    })
  },
  {
    pattern: /^\/posts\/([^/]+)\/([^/]+)$/,
    toCall: ([, author, permlink], query) => ({
      method: 'bridge.get_post',
      params: { author, permlink, observer: query.get('observer') ?? undefined }
    })
  },
  {
    pattern: /^\/posts\/([^/]+)\/([^/]+)\/discussion$/,
    toCall: ([, author, permlink], query) => ({
      method: 'bridge.get_discussion',
      params: { author, permlink, observer: query.get('observer') ?? undefined }
    })
  },
  {
    pattern: /^\/posts\/([^/]+)\/([^/]+)\/header$/,
    toCall: ([, author, permlink]) => ({ method: 'bridge.get_post_header', params: { author, permlink } })
  },
  {
    pattern: /^\/posts\/([^/]+)\/([^/]+)\/reblogged-by$/,
    toCall: ([, author, permlink]) => ({ method: 'condenser_api.get_reblogged_by', params: [author, permlink] })
  },
  {
    pattern: /^\/accounts\/([^/]+)\/posts$/,
    toCall: ([, account], query) => ({
      method: 'bridge.get_account_posts',
      params: {
        sort: text(query, 'sort'),
        account,
        start_author: text(query, 'start-author'),
        start_permlink: text(query, 'start-permlink'),
        limit: pageSize(query),
        observer: query.get('observer') ?? undefined
      }
    })
  },
  {
    pattern: /^\/accounts\/([^/]+)\/profile$/,
    toCall: ([, account]) => ({ method: 'bridge.get_profile', params: { account } })
  },
  {
    pattern: /^\/accounts\/([^/]+)\/notifications$/,
    toCall: ([, account], query) => ({
      method: 'bridge.account_notifications',
      params: {
        account,
        limit: pageSize(query),
        last_id: query.has('last-id') ? Number(query.get('last-id')) : undefined
      }
    })
  },
  {
    pattern: /^\/accounts\/([^/]+)\/notifications\/unread$/,
    toCall: ([, account], query) => ({
      method: 'bridge.unread_notifications',
      params: { account, min_score: query.has('min-score') ? Number(query.get('min-score')) : undefined }
    })
  },
  {
    pattern: /^\/accounts\/([^/]+)\/follow-lists\/([^/]+)$/,
    toCall: ([, observer, followType]) => ({
      method: 'bridge.get_follow_list',
      params: { observer, follow_type: followType }
    })
  },
  {
    pattern: /^\/accounts\/([^/]+)\/follows-any-lists$/,
    toCall: ([, observer]) => ({ method: 'bridge.does_user_follow_any_lists', params: { observer } })
  },
  {
    pattern: /^\/accounts\/([^/]+)\/subscriptions$/,
    toCall: ([, account]) => ({ method: 'bridge.list_all_subscriptions', params: { account } })
  },
  {
    pattern: /^\/communities$/,
    toCall: (_match, query) => ({
      method: 'bridge.list_communities',
      params: { query: query.get('query'), sort: text(query, 'sort'), observer: query.get('observer') ?? undefined }
    })
  },
  {
    pattern: /^\/communities\/([^/]+)$/,
    toCall: ([, name], query) => ({
      method: 'bridge.get_community',
      params: { name, observer: query.get('observer') ?? undefined }
    })
  },
  {
    pattern: /^\/communities\/([^/]+)\/roles$/,
    toCall: ([, community]) => ({ method: 'bridge.list_community_roles', params: { community } })
  },
  {
    pattern: /^\/communities\/([^/]+)\/subscribers$/,
    toCall: ([, community]) => ({ method: 'bridge.list_subscribers', params: { community } })
  },
  {
    pattern: /^\/search\/posts$/,
    toCall: (_match, query) => ({
      method: 'search-api.find_text',
      params: {
        pattern: text(query, 'q'),
        sort: text(query, 'sort'),
        author: text(query, 'author'),
        limit: pageSize(query),
        observer: query.get('observer') ?? undefined,
        start_author: text(query, 'start-author'),
        start_permlink: text(query, 'start-permlink')
      }
    })
  }
];

const toJsonRpcCall = (url: URL): IJsonRpcCall | undefined => {
  const path = url.pathname.replace(/^\/hivemind-api/, '');
  for (const { pattern, toCall } of ROUTES) {
    const match = pattern.exec(path);
    if (match) return toCall(match.map(decodeURIComponent), url.searchParams);
  }
  return undefined;
};

const send = (response: ServerResponse, status: number, body: unknown) => {
  // The browser reads the stub cross-origin.
  response.writeHead(status, { 'content-type': 'application/json', 'access-control-allow-origin': '*' });
  response.end(JSON.stringify(body));
};

const answer = async (fixtureProxyUrl: string, request: IncomingMessage): Promise<[number, unknown]> => {
  const call = request.method === 'GET' ? toJsonRpcCall(new URL(request.url ?? '/', 'http://stub')) : undefined;
  if (!call) return [404, { code: 'PGRST125', message: 'Invalid path specified in request URL' }];
  const reply = await fetch(fixtureProxyUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method: call.method, params: call.params, id: 1 })
  });
  const { result, error } = await reply.json();
  if (error) return [400, { code: 'P0001', message: error.message }];
  return [200, result];
};

/** Starts the stub, answering from the fixture proxy at `fixtureProxyUrl`. */
export async function startHivemindRestStub(fixtureProxyUrl: string): Promise<IHivemindRestStub> {
  const requests: IHivemindRestRequest[] = [];
  const server: Server = createServer((request, response) => {
    void answer(fixtureProxyUrl, request)
      .catch((error: unknown): [number, unknown] => [502, { message: String(error) }])
      .then(([status, body]) => {
        requests.push({ url: request.url ?? '/', status });
        send(response, status, body);
      });
  });
  await new Promise<void>((resolve) => server.listen(HIVEMIND_REST_STUB_PORT, resolve));
  return {
    requests,
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve());
      })
  };
}
