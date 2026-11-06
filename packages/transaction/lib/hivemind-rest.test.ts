import { readFileSync } from 'node:fs';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { join } from 'node:path';
import { after, before, beforeEach, describe, it } from 'mocha';
import { expect } from 'chai';
import {
  doesUserFollowAnyLists,
  getAccountNotifications,
  getAccountPosts,
  getCommunities,
  getCommunity,
  getDiscussion,
  getFollowList,
  getListCommunityRoles,
  getPost,
  getPostHeader,
  getPostsRanked,
  getSubscribers,
  getSubscriptions,
  getUnreadNotifications
} from './bridge-api';
import { getActiveVotes, getByText, getFollowers, getFollowing, getProfileInfo, getRebloggedBy } from './hive-api';
import { getHiveChainService } from './hive-chain-service';
import { getHivemindRestApi } from './chain';

/**
 * The bridge / hive-api reads covered by hivemind's REST API, over real sockets between a JSON-RPC
 * node and hivemind REST nodes: the REST request each sends for today's JSON-RPC arguments, the
 * result it resolves to, and the JSON-RPC fallback. A missing endpoint is remembered per endpoint
 * and a dead node per process, so each case reads an endpoint no earlier case made fall back.
 */

const fixtures = JSON.parse(readFileSync(join(__dirname, '__fixtures__/hivemind-rest.json'), 'utf8'));
const [post] = fixtures.rankedPosts;
/** What a REST post list adds to its query: the posts without votes, bodies cut for cards. */
const LIST_SHAPE = 'votes=none&truncate-body=1000';
/** A REST post list's posts as read: marked with the length their bodies were cut at. */
const cutPosts = (posts: object[]) => posts.map((entry) => ({ ...entry, _bodyCutAt: 1000 }));
/** The JSON-RPC calls but the vote-free post reads, which a node without them answers "unknown method". */
const stockCalls = (calls: IJsonRpcNode['calls']) => calls.filter(({ method }) => !method.endsWith('_v2'));
const discussionRoot = fixtures.discussion['guest4test1/test-ako-post'];

interface IJsonRpcNode {
  url: string;
  calls: Array<{ method: string; params: unknown }>;
  results: Record<string, unknown>;
}

interface IRestAnswer {
  status?: number;
  body: unknown;
}

interface IRestNode {
  url: string;
  requests: string[];
  /** Answer by request path (without its query), or by the whole request URL; a path not listed answers 404. */
  routes: Record<string, IRestAnswer | ((url: string) => IRestAnswer)>;
}

const listen = (server: Server): Promise<string> =>
  new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const address: AddressInfo | string | null = server.address();
      if (typeof address === 'object' && address) resolve(`http://127.0.0.1:${address.port}`);
    });
  });

const reply = (response: ServerResponse, status: number, body: unknown) => {
  response.writeHead(status, { 'content-type': 'application/json' });
  response.end(JSON.stringify(body));
};

const startJsonRpcNode = async (): Promise<{ node: IJsonRpcNode; server: Server }> => {
  const node: IJsonRpcNode = { url: '', calls: [], results: {} };
  const server = createServer((request: IncomingMessage, response) => {
    let text = '';
    request.on('data', (chunk) => (text += chunk));
    request.on('end', () => {
      const { method, params, id } = JSON.parse(text);
      node.calls.push({ method, params });
      // A node of an older hivemind, without the vote-free post reads, unless a test gives an answer.
      if (method.endsWith('_v2') && !(method in node.results)) {
        reply(response, 200, { jsonrpc: '2.0', id, error: { code: -32602, message: `Assert Exception:unknown method: ${method}` } });
        return;
      }
      reply(response, 200, { jsonrpc: '2.0', id, result: node.results[method] ?? null });
    });
  });
  node.url = await listen(server);
  return { node, server };
};

const startRestNode = async (): Promise<{ node: IRestNode; server: Server }> => {
  const node: IRestNode = { url: '', requests: [], routes: {} };
  const server = createServer((request, response) => {
    request.resume().on('end', () => {
      const path = request.url ?? '/';
      node.requests.push(path);
      const route = node.routes[path.split('?')[0]];
      const answer = typeof route === 'function' ? route(path) : route;
      if (answer) reply(response, answer.status ?? 200, answer.body);
      else reply(response, 404, { code: 'PGRST125', message: 'Invalid path specified in request URL' });
    });
  });
  node.url = await listen(server);
  return { node, server };
};

const closeAll = (servers: Server[]) =>
  Promise.all(
    servers.map((server) => {
      server.closeAllConnections();
      return new Promise<void>((resolve) => server.close(() => resolve()));
    })
  );

describe('hivemind REST reads', function () {
  this.timeout(15_000);

  const savedGetApiEndpoints = getHiveChainService().getApiEndpoints;
  let servers: Server[] = [];
  let rpc: IJsonRpcNode;
  let rest: IRestNode;
  let deadRest: IRestNode;
  let busyRest: IRestNode;
  /** The JSON-RPC node the reads go to: `rpc`, unless a case reads from a node of its own. */
  let apiNode = '';

  const useRestNodes = (nodes: string | undefined) => {
    if (nodes === undefined) delete process.env.REACT_APP_HIVEMIND_REST_NODES;
    else process.env.REACT_APP_HIVEMIND_REST_NODES = nodes;
  };

  before(async () => {
    const [rpcStarted, restStarted, deadStarted, busyStarted] = await Promise.all([
      startJsonRpcNode(),
      startRestNode(),
      startRestNode(),
      startRestNode()
    ]);
    servers = [rpcStarted.server, restStarted.server, deadStarted.server, busyStarted.server];
    [rpc, rest, deadRest, busyRest] = [rpcStarted.node, restStarted.node, deadStarted.node, busyStarted.node];
    getHiveChainService().getApiEndpoints = () => ({
      chainId: 'beeab0de',
      apiEndpoint: apiNode,
      restApiEndpoint: apiNode,
      apiTimeout: 2_000,
      aiEndpoint: `${apiNode}/hivesense-api`
    });
  });

  /** Runs `read` against a JSON-RPC node of its own, which no earlier case asked for anything. */
  const onFreshNode = async (read: (node: IJsonRpcNode) => Promise<void>) => {
    const { node, server } = await startJsonRpcNode();
    servers.push(server);
    apiNode = node.url;
    try {
      await read(node);
    } finally {
      apiNode = rpc.url;
    }
  };

  after(async () => {
    getHiveChainService().getApiEndpoints = savedGetApiEndpoints;
    useRestNodes(undefined);
    await closeAll(servers);
  });

  beforeEach(() => {
    apiNode = rpc.url;
    useRestNodes(rest.url);
    rpc.calls.length = 0;
    rpc.results = {};
    rest.requests.length = 0;
    rest.routes = {};
  });

  it('reads over JSON-RPC alone while HIVEMIND_REST_NODES is empty', async () => {
    useRestNodes('');
    rpc.results['bridge.get_ranked_posts'] = fixtures.rankedPosts;

    const posts = await getPostsRanked('trending', '', '', '', 'hive.blog');

    expect(posts).to.deep.equal(fixtures.rankedPosts);
    // Post reads first ask the node once whether it serves lite.* (lite-api.ts); it does not.
    expect(stockCalls(rpc.calls).filter((call) => call.method !== 'lite.get_info')).to.deep.equal([
      {
        method: 'bridge.get_ranked_posts',
        params: { sort: 'trending', start_author: '', start_permlink: '', limit: 20, tag: '', observer: 'hive.blog' }
      }
    ]);
    expect(rest.requests).to.deep.equal([]);
  });

  it('reads a ranked feed page from /posts, paging by start-author and start-permlink', async () => {
    rest.routes['/hivemind-api/posts'] = { body: fixtures.rankedPosts };

    const posts = await getPostsRanked('created', 'hive-160391', 'alice', 'hello', 'bob', 10);

    expect(posts).to.deep.equal(cutPosts(fixtures.rankedPosts));
    expect(rest.requests).to.deep.equal([
      `/hivemind-api/posts?sort=created&tag=hive-160391&observer=bob&page-size=10&start-author=alice&start-permlink=hello&${LIST_SHAPE}`
    ]);
    expect(rpc.calls).to.deep.equal([]);
  });

  it('leaves an empty tag and start post out of the feed URL, so anonymous readers share it', async () => {
    rest.routes['/hivemind-api/posts'] = { body: [] };

    await getPostsRanked('trending', '', '', '', 'hive.blog');

    expect(rest.requests).to.deep.equal([`/hivemind-api/posts?sort=trending&observer=hive.blog&page-size=20&${LIST_SHAPE}`]);
  });

  it('reads a profile tab from /accounts/{name}/posts', async () => {
    rest.routes['/hivemind-api/accounts/alice/posts'] = { body: fixtures.rankedPosts };

    const posts = await getAccountPosts('blog', 'alice', 'hive.blog', 'alice', 'older-post');

    expect(posts).to.deep.equal(cutPosts(fixtures.rankedPosts));
    expect(rest.requests).to.deep.equal([
      `/hivemind-api/accounts/alice/posts?sort=blog&observer=hive.blog&page-size=20&start-author=alice&start-permlink=older-post&${LIST_SHAPE}`
    ]);
  });

  it('reads one post from /posts/{author}/{permlink}', async () => {
    rest.routes[`/hivemind-api/posts/${post.author}/${post.permlink}`] = { body: post };

    const result = await getPost(post.author, post.permlink, 'carol');

    expect(result).to.deep.equal(post);
    expect(rest.requests).to.deep.equal([`/hivemind-api/posts/${post.author}/${post.permlink}?observer=carol`]);
  });

  it('reads a community and the community list, leaving out an absent search query', async () => {
    rest.routes['/hivemind-api/communities/hive-160391'] = { body: fixtures.community };
    rest.routes['/hivemind-api/communities'] = { body: [fixtures.community] };

    const community = await getCommunity('hive-160391', 'alice');
    const listed = await getCommunities('rank', null, 'alice');
    const searched = await getCommunities('rank', 'photo', 'alice');

    expect(community).to.deep.equal(fixtures.community);
    expect(listed).to.deep.equal([fixtures.community]);
    expect(searched).to.deep.equal([fixtures.community]);
    expect(rest.requests).to.deep.equal([
      '/hivemind-api/communities/hive-160391?observer=alice',
      '/hivemind-api/communities?sort=rank&observer=alice',
      '/hivemind-api/communities?sort=rank&query=photo&observer=alice'
    ]);
  });

  it('reads community subscribers and roles', async () => {
    rest.routes['/hivemind-api/communities/hive-160391/subscribers'] = { body: [['alice', 'guest', '', '2026']] };
    rest.routes['/hivemind-api/communities/hive-160391/roles'] = { body: [['hive-160391', 'owner', '']] };

    expect(await getSubscribers('hive-160391')).to.deep.equal([['alice', 'guest', '', '2026']]);
    expect(await getListCommunityRoles('hive-160391')).to.deep.equal([['hive-160391', 'owner', '']]);
    expect(rest.requests).to.deep.equal([
      '/hivemind-api/communities/hive-160391/subscribers',
      '/hivemind-api/communities/hive-160391/roles'
    ]);
  });

  it('reads notifications from /accounts/{name}/notifications, paging by last-id', async () => {
    const notifications = [{ id: 41, type: 'vote', score: 25, date: '2026-10-20T00:00:00', msg: '@bob voted', url: '' }];
    rest.routes['/hivemind-api/accounts/alice/notifications'] = { body: notifications };

    expect(await getAccountNotifications('alice', 42, 50)).to.deep.equal(notifications);
    expect(await getAccountNotifications('alice')).to.deep.equal(notifications);
    expect(rest.requests).to.deep.equal([
      '/hivemind-api/accounts/alice/notifications?page-size=50&last-id=42',
      '/hivemind-api/accounts/alice/notifications?page-size=50'
    ]);
  });

  it('reads follow stats from /accounts/{name}/profile', async () => {
    rest.routes['/hivemind-api/accounts/guest4test/profile'] = { body: fixtures.profile };

    const info = await getProfileInfo('guest4test');

    expect(info).to.deep.equal({
      follow_stats: {
        account: 'guest4test',
        follower_count: fixtures.profile.stats.followers,
        following_count: fixtures.profile.stats.following
      },
      reputation: fixtures.profile.reputation
    });
    expect(rest.requests).to.deep.equal(['/hivemind-api/accounts/guest4test/profile']);
  });

  it('reads followers and following, mapping start, type and limit', async () => {
    const follows = [{ follower: 'bob', following: 'alice', what: ['blog'] }];
    rest.routes['/hivemind-api/accounts/alice/followers'] = { body: follows };
    rest.routes['/hivemind-api/accounts/alice/following'] = { body: follows };

    expect(await getFollowers({ account: 'alice', limit: 50 })).to.deep.equal(follows);
    expect(await getFollowing({ account: 'alice', start: 'bob', type: 'ignore', limit: 100 })).to.deep.equal(
      follows
    );
    expect(rest.requests).to.deep.equal([
      '/hivemind-api/accounts/alice/followers?type=blog&page-size=50',
      '/hivemind-api/accounts/alice/following?type=ignore&page-size=100&start=bob'
    ]);
  });

  it('searches posts at /search/posts with the pattern as q', async () => {
    rest.routes['/hivemind-api/search/posts'] = { body: fixtures.rankedPosts };

    const posts = await getByText({ pattern: 'solar array', observer: 'hive.blog' });

    expect(posts).to.deep.equal(fixtures.rankedPosts);
    expect(rest.requests).to.deep.equal([
      '/hivemind-api/search/posts?q=solar%20array&sort=relevance&observer=hive.blog&page-size=20'
    ]);
  });

  it('keeps reading from a node a search failed on, answering the search over JSON-RPC', async () => {
    useRestNodes(busyRest.url);
    busyRest.routes['/hivemind-api/search/posts'] = { status: 503, body: { message: 'statement timeout' } };
    busyRest.routes['/hivemind-api/accounts/alice/followers'] = { body: [] };
    rpc.results['search-api.find_text'] = fixtures.rankedPosts;

    expect(await getByText({ pattern: 'solar array', observer: 'hive.blog' })).to.deep.equal(fixtures.rankedPosts);
    expect(await getFollowers({ account: 'alice', limit: 50 })).to.deep.equal([]);

    // The search asked the node once, without a retry, and left it in use for every other read.
    expect(busyRest.requests.map((request) => request.split('?')[0])).to.deep.equal([
      '/hivemind-api/search/posts',
      '/hivemind-api/accounts/alice/followers'
    ]);
    expect(rpc.calls.map(({ method }) => method).filter((method) => method !== 'lite.get_info')).to.deep.equal([
      'search-api.find_text'
    ]);
  });

  it("reads a post's votes in pages of 1000, with weight and rshares as numbers", async () => {
    const fullPage = Array.from({ length: 1000 }, (_, index) => ({
      ...fixtures.postVotes[0],
      voter: `voter${String(index).padStart(4, '0')}`
    }));
    let pages = 0;
    rest.routes['/hivemind-api/posts/alice/hello/votes'] = {
      get body() {
        pages += 1;
        return pages === 1 ? fullPage : fixtures.postVotes;
      }
    };

    const votes = await getActiveVotes('alice', 'hello');

    expect(rest.requests).to.deep.equal([
      '/hivemind-api/posts/alice/hello/votes?page-size=1000',
      '/hivemind-api/posts/alice/hello/votes?page-size=1000&start-voter=voter0999'
    ]);
    expect(votes).to.have.length(1002);
    expect(votes[1001]).to.deep.equal({
      voter: 'carol',
      percent: -2500,
      rshares: -52000000000,
      time: '2026-10-21T08:00:03',
      weight: 0,
      reputation: 0
    });
    expect(votes[0]).to.include({ voter: 'voter0000', rshares: 1879215360, weight: 1146353766 });
  });

  it("reads a post's whole discussion from /posts/{author}/{permlink}/discussion in one request", async () => {
    const { author, permlink } = discussionRoot;
    rest.routes[`/hivemind-api/posts/${author}/${permlink}/discussion`] = { body: fixtures.discussion };

    const discussion = await getDiscussion(author, permlink, 'alice');

    expect(discussion).to.deep.equal(fixtures.discussion);
    expect(discussion?.[`${author}/${permlink}`].replies).to.deep.equal(discussionRoot.replies);
    expect(rest.requests).to.deep.equal([`/hivemind-api/posts/${author}/${permlink}/discussion?observer=alice`]);
    expect(rpc.calls).to.deep.equal([]);
  });

  it("reads an account's follow lists and whether it follows any from /accounts/{name}/follow-lists", async () => {
    rest.routes['/hivemind-api/accounts/guest4test/follow-lists/blacklisted'] = { body: fixtures.followList };
    rest.routes['/hivemind-api/accounts/guest4test/follow-lists/follow_muted'] = { body: [] };
    rest.routes['/hivemind-api/accounts/guest4test/follows-any-lists'] = { body: false };

    expect(await getFollowList('guest4test', 'blacklisted')).to.deep.equal(fixtures.followList);
    expect(await getFollowList('guest4test', 'follow_muted')).to.deep.equal([]);
    expect(await doesUserFollowAnyLists('guest4test')).to.equal(false);
    expect(rest.requests).to.deep.equal([
      '/hivemind-api/accounts/guest4test/follow-lists/blacklisted',
      '/hivemind-api/accounts/guest4test/follow-lists/follow_muted',
      '/hivemind-api/accounts/guest4test/follows-any-lists'
    ]);
    expect(rpc.calls).to.deep.equal([]);
  });

  it("reads an account's subscriptions and unread notification count", async () => {
    rest.routes['/hivemind-api/accounts/guest4test/subscriptions'] = { body: fixtures.subscriptions };
    rest.routes['/hivemind-api/accounts/guest4test/notifications/unread'] = { body: fixtures.unreadNotifications };

    expect(await getSubscriptions('guest4test')).to.deep.equal(fixtures.subscriptions);
    expect(await getUnreadNotifications('guest4test')).to.deep.equal(fixtures.unreadNotifications);
    // No min-score: JSON-RPC's call leaves it to hivemind's default too.
    expect(rest.requests).to.deep.equal([
      '/hivemind-api/accounts/guest4test/subscriptions',
      '/hivemind-api/accounts/guest4test/notifications/unread'
    ]);
    expect(rpc.calls).to.deep.equal([]);
  });

  it("reads a post's header and rebloggers", async () => {
    const { author, permlink } = fixtures.postHeader;
    rest.routes[`/hivemind-api/posts/${author}/${permlink}/header`] = { body: fixtures.postHeader };
    rest.routes['/hivemind-api/posts/hiveio/hive-at-blockchain-rio/reblogged-by'] = { body: fixtures.rebloggedBy };

    expect(await getPostHeader(author, permlink)).to.deep.equal(fixtures.postHeader);
    expect(await getRebloggedBy('hiveio', 'hive-at-blockchain-rio')).to.deep.equal(fixtures.rebloggedBy);
    expect(rest.requests).to.deep.equal([
      `/hivemind-api/posts/${author}/${permlink}/header`,
      '/hivemind-api/posts/hiveio/hive-at-blockchain-rio/reblogged-by'
    ]);
    expect(rpc.calls).to.deep.equal([]);
  });

  // Runs after the cases above: each endpoint it makes fall back stays on JSON-RPC from then on.
  it('reads each of them over JSON-RPC, with its JSON-RPC arguments, from a node lacking it, still asking the node for others', async () => {
    const pgrst202 = { status: 404, body: { code: 'PGRST202', message: 'Could not find the function' } };
    const cases: Array<{ path: string; method: string; params: unknown; result: unknown; read: () => Promise<unknown> }> = [
      {
        path: '/hivemind-api/posts/alice/thread/discussion',
        method: 'bridge.get_discussion',
        params: { author: 'alice', permlink: 'thread', observer: 'bob' },
        result: fixtures.discussion,
        read: () => getDiscussion('alice', 'thread', 'bob')
      },
      {
        path: '/hivemind-api/accounts/alice/follow-lists/muted',
        method: 'bridge.get_follow_list',
        params: { observer: 'alice', follow_type: 'muted' },
        result: fixtures.followList,
        read: () => getFollowList('alice', 'muted')
      },
      {
        path: '/hivemind-api/accounts/alice/follows-any-lists',
        method: 'bridge.does_user_follow_any_lists',
        params: { observer: 'alice' },
        result: true,
        read: () => doesUserFollowAnyLists('alice')
      },
      {
        path: '/hivemind-api/accounts/alice/subscriptions',
        method: 'bridge.list_all_subscriptions',
        params: { account: 'alice' },
        result: fixtures.subscriptions,
        read: () => getSubscriptions('alice')
      },
      {
        path: '/hivemind-api/accounts/alice/notifications/unread',
        method: 'bridge.unread_notifications',
        params: { account: 'alice' },
        result: fixtures.unreadNotifications,
        read: () => getUnreadNotifications('alice')
      },
      {
        path: '/hivemind-api/posts/alice/thread/header',
        method: 'bridge.get_post_header',
        params: { author: 'alice', permlink: 'thread' },
        result: fixtures.postHeader,
        read: () => getPostHeader('alice', 'thread')
      },
      {
        path: '/hivemind-api/posts/alice/thread/reblogged-by',
        method: 'condenser_api.get_reblogged_by',
        params: ['alice', 'thread'],
        result: fixtures.rebloggedBy,
        read: () => getRebloggedBy('alice', 'thread')
      }
    ];

    for (const [index, { path, method, params, result, read }] of cases.entries()) {
      rpc.calls.length = 0;
      rest.requests.length = 0;
      rpc.results[method] = result;
      // Alternate a path PostgREST does not know (PGRST125) with a function it lacks (PGRST202).
      if (index % 2 === 1) rest.routes[path] = pgrst202;

      expect(await read(), method).to.deep.equal(result);
      expect(await read(), `${method} again`).to.deep.equal(result);
      expect(rest.requests.map((request) => request.split('?')[0]), method).to.deep.equal([path]);
      expect(stockCalls(rpc.calls), method).to.deep.equal([
        { method, params },
        { method, params }
      ]);
    }

    // None of those 404s marked the node down.
    rest.routes['/hivemind-api/communities/hive-4'] = { body: fixtures.community };
    expect(await getCommunity('hive-4')).to.deep.equal(fixtures.community);
  });

  it('falls back to JSON-RPC when the node lacks the endpoint, without marking the node down', async () => {
    rpc.results['bridge.list_community_roles'] = [['hive-1', 'owner', '']];
    rest.routes['/hivemind-api/communities/hive-1'] = { body: fixtures.community };

    const roles = await getListCommunityRoles('hive-1');
    const rolesAgain = await getListCommunityRoles('hive-1');
    const community = await getCommunity('hive-1');

    expect(roles).to.deep.equal([['hive-1', 'owner', '']]);
    expect(rolesAgain).to.deep.equal(roles);
    expect(community).to.deep.equal(fixtures.community);
    // The missing endpoint is not asked again; the node still serves the endpoints it has.
    expect(rest.requests).to.deep.equal([
      '/hivemind-api/communities/hive-1/roles',
      '/hivemind-api/communities/hive-1?observer=hive.blog'
    ]);
    expect(rpc.calls.map(({ method }) => method)).to.deep.equal([
      'bridge.list_community_roles',
      'bridge.list_community_roles'
    ]);
  });

  it("takes PostgREST's PGRST202 as a missing endpoint too", async () => {
    rpc.results['bridge.list_subscribers'] = [['bob', 'guest', '', '2026']];
    rest.routes['/hivemind-api/communities/hive-2/subscribers'] = {
      status: 404,
      body: { code: 'PGRST202', message: 'Could not find the function hivemind_endpoints.get_community_subscribers' }
    };
    rest.routes['/hivemind-api/accounts/bob/posts'] = { body: [] };

    expect(await getSubscribers('hive-2')).to.deep.equal([['bob', 'guest', '', '2026']]);
    expect(await getAccountPosts('posts', 'bob', 'hive.blog')).to.deep.equal([]);
    expect(rest.requests).to.have.length(2);
  });

  it("answers an API rejection (400) with JSON-RPC's own answer", async () => {
    rpc.results['bridge.get_post'] = post;
    rest.routes['/hivemind-api/posts/nobody/missing'] = {
      status: 400,
      body: { code: 'P0001', message: 'Post @nobody/missing does not exist' }
    };

    expect(await getPost('nobody', 'missing')).to.deep.equal(post);
    expect(stockCalls(rpc.calls)).to.deep.equal([
      { method: 'bridge.get_post', params: { author: 'nobody', permlink: 'missing', observer: 'hive.blog' } }
    ]);
  });

  it('keeps reading posts over REST after a 404 about one missing post', async () => {
    rest.routes['/hivemind-api/posts/nobody/gone'] = {
      status: 404,
      body: { code: 'PT404', message: 'Post @nobody/gone does not exist' }
    };
    rest.routes[`/hivemind-api/posts/${post.author}/${post.permlink}`] = { body: post };

    expect(await getPost('nobody', 'gone', 'carol')).to.equal(null);
    expect(await getPost('nobody', 'gone', 'carol')).to.equal(null);
    expect(await getPost(post.author, post.permlink, 'carol')).to.deep.equal(post);

    expect(rest.requests).to.deep.equal([
      '/hivemind-api/posts/nobody/gone?observer=carol',
      '/hivemind-api/posts/nobody/gone?observer=carol',
      `/hivemind-api/posts/${post.author}/${post.permlink}?observer=carol`
    ]);
    expect(rpc.calls.filter(({ method }) => method === 'bridge.get_post')).to.have.length(2);
  });

  it("reads a cross-post's original over JSON-RPC when its permlink would not be one path segment", async () => {
    const crossPost = {
      ...post,
      json_metadata: { tags: ['cross-post'], original_author: 'alice', original_permlink: '../x/y?observer=z' }
    };
    rest.routes['/hivemind-api/posts'] = { body: [crossPost] };
    rpc.results['bridge.get_post'] = post;

    const [resolved] = (await getPostsRanked('created', '', '', '', 'bob')) ?? [];

    expect(resolved).to.deep.include({ original_entry: post });
    expect(rest.requests).to.deep.equal([`/hivemind-api/posts?sort=created&observer=bob&page-size=20&${LIST_SHAPE}`]);
    expect(rpc.calls.filter(({ method }) => method === 'bridge.get_post')).to.deep.equal([
      {
        method: 'bridge.get_post',
        params: { author: 'alice', permlink: '../x/y?observer=z', observer: 'bob' }
      }
    ]);
  });

  it('encodes each path placeholder, so its value stays one path segment', async () => {
    const api = getHivemindRestApi();
    rest.routes['/hivemind-api/posts/alice/a%2Fb%3Fc'] = { body: post };

    expect(await api?.post({ author: 'alice', permlink: 'a/b?c', observer: 'bob' })).to.deep.equal(post);
    expect(rest.requests).to.deep.equal(['/hivemind-api/posts/alice/a%2Fb%3Fc?observer=bob']);
  });

  it('reads over JSON-RPC while every hivemind REST node is down, without asking them again', async () => {
    useRestNodes(deadRest.url);
    deadRest.routes['/hivemind-api/communities/hive-3'] = { status: 503, body: { message: 'overloaded' } };
    rpc.results['bridge.get_community'] = fixtures.community;

    expect(await getCommunity('hive-3')).to.deep.equal(fixtures.community);
    expect(await getCommunity('hive-3')).to.deep.equal(fixtures.community);

    expect(deadRest.requests).to.deep.equal(['/hivemind-api/communities/hive-3?observer=hive.blog']);
    expect(rpc.calls.map(({ method }) => method)).to.deep.equal(['bridge.get_community', 'bridge.get_community']);
  });
  describe('vote-free post reads', () => {
    const { active_votes: _votes, ...voteFreePost } = post;
    const observerVote = { rshares: 1200, percent: 5000 };
    const notLite = (node: IJsonRpcNode) => node.calls.filter(({ method }) => method !== 'lite.get_info');

    beforeEach(() => useRestNodes(''));

    it("reads them where the node serves them, each entry with the observer's vote", async () => {
      await onFreshNode(async (node) => {
        node.results['bridge.get_ranked_posts_v2'] = [{ ...voteFreePost, observer_vote: observerVote }];
        node.results['bridge.get_post_v2'] = { ...voteFreePost, observer_vote: null };
        node.results['bridge.get_discussion_v2'] = { [`${post.author}/${post.permlink}`]: voteFreePost };

        const [ranked] = (await getPostsRanked('trending', '', '', '', 'bob')) ?? [];
        const single = await getPost(post.author, post.permlink, 'bob');
        const discussion = await getDiscussion(post.author, post.permlink, 'bob');

        expect(ranked).to.deep.equal({ ...voteFreePost, observer_vote: observerVote, _observer: 'bob' });
        expect(single).to.deep.equal({ ...voteFreePost, observer_vote: null, _observer: 'bob' });
        // An entry without the key has the observer's vote as null all the same.
        expect(discussion?.[`${post.author}/${post.permlink}`]).to.deep.equal({
          ...voteFreePost,
          observer_vote: null,
          _observer: 'bob'
        });
        expect(notLite(node)).to.deep.equal([
          {
            method: 'bridge.get_ranked_posts_v2',
            params: { sort: 'trending', start_author: '', start_permlink: '', limit: 20, tag: '', observer: 'bob', top_votes: 0 }
          },
          { method: 'bridge.get_post_v2', params: { author: post.author, permlink: post.permlink, observer: 'bob', top_votes: 0 } },
          {
            method: 'bridge.get_discussion_v2',
            params: { author: post.author, permlink: post.permlink, observer: 'bob', top_votes: 0 }
          }
        ]);
      });
    });

    it('reads posts with their votes from a node without them, asking it for them only once', async () => {
      await onFreshNode(async (node) => {
        node.results['bridge.get_ranked_posts'] = fixtures.rankedPosts;
        node.results['bridge.get_account_posts'] = fixtures.rankedPosts;

        expect(await getPostsRanked('trending', '', '', '', 'bob')).to.deep.equal(fixtures.rankedPosts);
        expect(await getPostsRanked('hot', '', '', '', 'bob')).to.deep.equal(fixtures.rankedPosts);
        expect(await getAccountPosts('blog', 'alice', 'bob')).to.deep.equal(fixtures.rankedPosts);

        expect(notLite(node).map(({ method }) => method)).to.deep.equal([
          'bridge.get_ranked_posts_v2',
          'bridge.get_ranked_posts',
          'bridge.get_ranked_posts',
          'bridge.get_account_posts'
        ]);
      });
    });

    const liteInfo = (methods: string[]) => ({
      version: '1',
      modes: ['native'],
      render_base: 'https://hive.blog',
      apps: { posts: 'lite_posts' },
      methods
    });
    const LITE_POSTS = ['get_discussion', 'get_post', 'get_ranked_posts', 'get_account_posts'];

    it('reads lite.* posts with their votes from a lite node whose lite.get_info does not list the vote-free reads', async () => {
      await onFreshNode(async (node) => {
        node.results['lite.get_info'] = liteInfo(LITE_POSTS);
        node.results['lite.get_ranked_posts'] = fixtures.rankedPosts;

        expect(await getPostsRanked('trending', '', '', '', 'bob')).to.deep.equal(fixtures.rankedPosts);
        expect(notLite(node).map(({ method }) => method)).to.deep.equal(['lite.get_ranked_posts']);
      });
    });

    it('reads the lite.* vote-free reads a lite node lists, falling back once when it answers "unknown method"', async () => {
      await onFreshNode(async (node) => {
        node.results['lite.get_info'] = liteInfo([...LITE_POSTS, 'get_ranked_posts_v2', 'get_post_v2']);
        node.results['lite.get_ranked_posts_v2'] = [{ ...voteFreePost, observer_vote: observerVote }];
        node.results['lite.get_post'] = post;

        const [ranked] = (await getPostsRanked('trending', '', '', '', 'bob')) ?? [];
        expect(await getPost(post.author, post.permlink, 'bob')).to.deep.equal(post);
        expect(await getPost(post.author, post.permlink, 'bob')).to.deep.equal(post);

        expect(ranked).to.deep.include({ observer_vote: observerVote, _observer: 'bob' });
        expect(notLite(node).map(({ method }) => method)).to.deep.equal([
          'lite.get_ranked_posts_v2',
          'lite.get_post_v2',
          'lite.get_post',
          'lite.get_post'
        ]);
      });
    });
  });

  // Last: the rejection keeps every later REST post list in this process on the old request.
  it('asks a REST node that rejects votes=none for its post lists as before, and then no more', async () => {
    rest.routes['/hivemind-api/posts'] = (url) =>
      url.includes('votes=')
        ? { status: 400, body: { code: 'PGRST100', message: '"votes" is not a parameter' } }
        : { body: fixtures.rankedPosts };

    expect(await getPostsRanked('trending', '', '', '', 'bob')).to.deep.equal(fixtures.rankedPosts);
    expect(await getPostsRanked('hot', '', '', '', 'bob')).to.deep.equal(fixtures.rankedPosts);

    expect(rest.requests).to.deep.equal([
      `/hivemind-api/posts?sort=trending&observer=bob&page-size=20&${LIST_SHAPE}`,
      '/hivemind-api/posts?sort=trending&observer=bob&page-size=20',
      '/hivemind-api/posts?sort=hot&observer=bob&page-size=20'
    ]);
    expect(stockCalls(rpc.calls).filter(({ method }) => method !== 'lite.get_info')).to.deep.equal([]);
  });
});
