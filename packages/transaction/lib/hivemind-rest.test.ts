import { readFileSync } from 'node:fs';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { join } from 'node:path';
import { after, before, beforeEach, describe, it } from 'mocha';
import { expect } from 'chai';
import {
  getAccountNotifications,
  getAccountPosts,
  getCommunities,
  getCommunity,
  getListCommunityRoles,
  getPost,
  getPostsRanked,
  getSubscribers
} from './bridge-api';
import { getActiveVotes, getByText, getFollowers, getFollowing, getProfileInfo } from './hive-api';
import { getHiveChainService } from './hive-chain-service';

/**
 * The bridge / hive-api reads covered by hivemind's REST API, over real sockets between a JSON-RPC
 * node and hivemind REST nodes: the REST request each sends for today's JSON-RPC arguments, the
 * result it resolves to, and the JSON-RPC fallback. A missing endpoint is remembered per endpoint
 * and a dead node per process, so each case reads an endpoint no earlier case made fall back.
 */

const fixtures = JSON.parse(readFileSync(join(__dirname, '__fixtures__/hivemind-rest.json'), 'utf8'));
const [post] = fixtures.rankedPosts;

interface IJsonRpcNode {
  url: string;
  calls: Array<{ method: string; params: unknown }>;
  results: Record<string, unknown>;
}

interface IRestNode {
  url: string;
  requests: string[];
  /** Answer by request path (without its query); a path not listed answers 404. */
  routes: Record<string, { status?: number; body: unknown }>;
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
      if (route) reply(response, route.status ?? 200, route.body);
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

  const useRestNodes = (nodes: string | undefined) => {
    if (nodes === undefined) delete process.env.REACT_APP_HIVEMIND_REST_NODES;
    else process.env.REACT_APP_HIVEMIND_REST_NODES = nodes;
  };

  before(async () => {
    const [rpcStarted, restStarted, deadStarted] = await Promise.all([
      startJsonRpcNode(),
      startRestNode(),
      startRestNode()
    ]);
    servers = [rpcStarted.server, restStarted.server, deadStarted.server];
    [rpc, rest, deadRest] = [rpcStarted.node, restStarted.node, deadStarted.node];
    getHiveChainService().getApiEndpoints = () => ({
      chainId: 'beeab0de',
      apiEndpoint: rpc.url,
      restApiEndpoint: rpc.url,
      apiTimeout: 2_000,
      aiEndpoint: `${rpc.url}/hivesense-api`
    });
  });

  after(async () => {
    getHiveChainService().getApiEndpoints = savedGetApiEndpoints;
    useRestNodes(undefined);
    await closeAll(servers);
  });

  beforeEach(() => {
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
    expect(rpc.calls).to.deep.equal([
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

    expect(posts).to.deep.equal(fixtures.rankedPosts);
    expect(rest.requests).to.deep.equal([
      '/hivemind-api/posts?sort=created&tag=hive-160391&observer=bob&page-size=10&start-author=alice&start-permlink=hello'
    ]);
    expect(rpc.calls).to.deep.equal([]);
  });

  it('leaves an empty tag and start post out of the feed URL, so anonymous readers share it', async () => {
    rest.routes['/hivemind-api/posts'] = { body: [] };

    await getPostsRanked('trending', '', '', '', 'hive.blog');

    expect(rest.requests).to.deep.equal(['/hivemind-api/posts?sort=trending&observer=hive.blog&page-size=20']);
  });

  it('reads a profile tab from /accounts/{name}/posts', async () => {
    rest.routes['/hivemind-api/accounts/alice/posts'] = { body: fixtures.rankedPosts };

    const posts = await getAccountPosts('blog', 'alice', 'hive.blog', 'alice', 'older-post');

    expect(posts).to.deep.equal(fixtures.rankedPosts);
    expect(rest.requests).to.deep.equal([
      '/hivemind-api/accounts/alice/posts?sort=blog&observer=hive.blog&page-size=20&start-author=alice&start-permlink=older-post'
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
    expect(rpc.calls).to.deep.equal([
      { method: 'bridge.get_post', params: { author: 'nobody', permlink: 'missing', observer: 'hive.blog' } }
    ]);
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
});
