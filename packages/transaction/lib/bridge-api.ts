import { getLogger } from '@ui/lib/logging';
import {
  Community,
  Entry,
  FollowListType,
  IAccountNotification,
  IFollowList,
  IGetPostHeader,
  IUnreadNotifications
} from '@hive/common-hiveio-packages/wax';
import { commonVariables } from '@ui/lib/common-variables';
import { getApiSetCallNode, getReadChain } from './chain';
import { nonEmpty, readFromHivemind, readRestPost, readRestPostList } from './hivemind-rest';
import {
  postsReadOptionsOf,
  readPosts,
  servesVoteFreeLite,
  type TPostsApi,
  type TPostsMethod,
  type TPostsRead
} from './lite-api';
import {
  createVoteFreeSupport,
  discussionWithObserverVotes,
  listWithObserverVotes,
  readVoteFree,
  withObserverVote
} from './vote-free-posts';
import type { IObserverListsApi } from './observer-lists';
import type { IHiddenAuthorsApi } from './hidden-authors';

export const DATA_LIMIT = 20;

const logger = getLogger('bridge');
export const getPostHeader = async (author: string, permlink: string): Promise<IGetPostHeader> => {
  return readFromHivemind(
    'postHeader',
    { accounts: [author], permlinks: [permlink] },
    (api) => api.postHeader({ author, permlink }),
    () =>
      getReadChain().api.bridge.get_post_header({
        author,
        permlink
      })
  );
};
export const getUnreadNotifications = async (account: string): Promise<IUnreadNotifications | null> => {
  return readFromHivemind(
    'accountUnreadNotifications',
    { accounts: [account] },
    (api) => api.accountUnreadNotifications({ 'account-name': account }),
    () =>
      getReadChain().api.bridge.unread_notifications({
        account
      })
  );
};

export const getCommunities = async (
  sort: string,
  query?: string | null,
  observer: string = commonVariables.defaultObserver
): Promise<Community[] | null> => {
  return readFromHivemind(
    'communities',
    {},
    (api) => api.communities({ sort, query: nonEmpty(query), observer }),
    () =>
      getReadChain().api.bridge.list_communities({
        query,
        sort,
        observer
      })
  );
};

export const getSubscriptions = async (account: string): Promise<string[][] | null> => {
  return readFromHivemind(
    'accountSubscriptions',
    { accounts: [account] },
    (api) => api.accountSubscriptions({ 'account-name': account }),
    () =>
      getReadChain().api.bridge.list_all_subscriptions({
        account
      })
  );
};

/** The top votes the vote-free post reads are asked for: cards and post pages show no voters. */
const NO_TOP_VOTES = 0;

// The nodes, per process or browser tab, that answered a vote-free read with "unknown method". A
// lite node has a record of its own: it may serve `bridge.*_v2` and not `lite.*_v2`, or the reverse.
const bridgeVoteFree = createVoteFreeSupport();
const liteVoteFree = createVoteFreeSupport();

/** The node `bridge.*` post reads go to: the first the failover will admit of the bridge API set. */
export const getBridgeReadNode = async (): Promise<string> => {
  return (await getApiSetCallNode('bridge')) ?? getReadChain().endpointUrl;
};

/**
 * The post read `method` in hivemind's vote-free form (`voteFree`, `<method>_v2`) where its node
 * serves it, else with votes (`stock`): on a lite node, only when its `lite.get_info` lists the
 * method; on `bridge.*`, unless the bridge node the call goes to (past the nodes failover skips)
 * answered it with "unknown method" before. A node failover carries the read to that answered so
 * before is asked it with votes.
 */
const voteFreeRead =
  <T>(
    method: TPostsMethod,
    voteFree: (api: TPostsApi) => Promise<T>,
    stock: (api: TPostsApi) => Promise<T>
  ): TPostsRead<T> =>
  async (api, lite) => {
    if (lite) {
      if (!servesVoteFreeLite(lite.info, method)) return stock(api);
      return readVoteFree(liteVoteFree, lite.node, api, voteFree, stock);
    }
    return readVoteFree(bridgeVoteFree, await getBridgeReadNode(), api, voteFree, stock);
  };

export const getPostsRanked = async (
  sort: string,
  tag: string = '',
  start_author: string = '',
  start_permlink: string = '',
  observer: string,
  limit: number = DATA_LIMIT
): Promise<Entry[] | null> => {
  const params = { sort, start_author, start_permlink, limit, tag, observer };
  const read = voteFreeRead(
    'get_ranked_posts',
    (api) => api.get_ranked_posts_v2({ ...params, top_votes: NO_TOP_VOTES }),
    (api) => api.get_ranked_posts(params)
  );
  return readPosts(read, () =>
    readFromHivemind(
      'rankedPosts',
      {},
      (api) =>
        readRestPostList((shape) =>
          api.rankedPosts({
            sort,
            tag: nonEmpty(tag),
            observer,
            'page-size': limit,
            'start-author': nonEmpty(start_author),
            'start-permlink': nonEmpty(start_permlink),
            ...shape
          })
        ),
      () => read(getReadChain().api.bridge)
    )
  ).then((resp) => {
    const posts = listWithObserverVotes(resp, observer);
    return posts && resolvePosts(posts, observer);
  });
};

/** `posts` with each cross-post's original post (`original_entry`) read as `observer`. */
export const resolvePosts = <T extends Entry>(posts: T[], observer: string): Promise<T[]> => {
  const promises = posts.map((p) => resolvePost(p, observer));

  return Promise.all(promises);
};

const resolvePost = <T extends Entry>(post: T, observer: string): Promise<T> => {
  const { json_metadata: json } = post;

  if (json.original_author && json.original_permlink && json.tags && json.tags[0] === 'cross-post') {
    return getPost(json.original_author, json.original_permlink, observer)
      .then((resp) => {
        if (resp) {
          return {
            ...post,
            original_entry: resp
          };
        }

        return post;
      })
      .catch(() => {
        return post;
      });
  }

  return new Promise((resolve) => {
    resolve(post);
  });
};

export const getPost = async (
  author: string = '',
  permlink: string = '',
  observer: string = commonVariables.defaultObserver
): Promise<Entry | null> => {
  const params = { author, permlink, observer };
  const read = voteFreeRead(
    'get_post',
    (api) => api.get_post_v2({ ...params, top_votes: NO_TOP_VOTES }),
    (api) => api.get_post(params)
  );
  return readPosts(
    read,
    () =>
      readFromHivemind(
        'post',
        { accounts: [author], permlinks: [permlink] },
        (api) => readRestPost((shape) => api.post({ ...params, ...shape })),
        () => read(getReadChain().api.bridge)
      ),
    postsReadOptionsOf(author)
  ).then((resp) => {
    if (resp) {
      return resolvePost(withObserverVote(resp, observer), observer);
    }

    return resp;
  });
};

export const getAccountPosts = async (
  sort: string,
  account: string,
  observer: string,
  start_author: string = '',
  start_permlink: string = '',
  limit: number = DATA_LIMIT
): Promise<Entry[] | null> => {
  const params = { sort, account, start_author, start_permlink, limit, observer };
  const read = voteFreeRead(
    'get_account_posts',
    (api) => api.get_account_posts_v2({ ...params, top_votes: NO_TOP_VOTES }),
    (api) => api.get_account_posts(params)
  );
  return readPosts(
    read,
    () =>
      readFromHivemind(
        'accountPosts',
        { accounts: [account] },
        (api) =>
          readRestPostList((shape) =>
            api.accountPosts({
              'account-name': account,
              sort,
              observer,
              'page-size': limit,
              'start-author': nonEmpty(start_author),
              'start-permlink': nonEmpty(start_permlink),
              ...shape
            })
          ),
        () => read(getReadChain().api.bridge)
      ),
    postsReadOptionsOf(account)
  ).then((resp) => {
    const posts = listWithObserverVotes(resp, observer);
    return posts && resolvePosts(posts, observer);
  });
};

export const getFollowList = async (
  observer: string,
  follow_type: FollowListType
): Promise<IFollowList[]> => {
  return readFromHivemind(
    'accountFollowList',
    { accounts: [observer] },
    (api) => api.accountFollowList({ 'account-name': observer, type: follow_type }),
    () =>
      getReadChain().api.bridge.get_follow_list({
        observer,
        follow_type
      })
  );
};

export const doesUserFollowAnyLists = async (observer: string): Promise<boolean> => {
  return readFromHivemind(
    'accountFollowsAnyLists',
    { accounts: [observer] },
    (api) => api.accountFollowsAnyLists({ 'account-name': observer }),
    () => getReadChain().api.bridge.does_user_follow_any_lists({ observer })
  );
};

export const observerListsApi: IObserverListsApi = { getFollowList, doesUserFollowAnyLists };

export const hiddenAuthorsApi: IHiddenAuthorsApi = { getFollowList };

export const getSubscribers = async (community: string): Promise<string[][] | null> => {
  return readFromHivemind(
    'communitySubscribers',
    { accounts: [community] },
    (api) => api.communitySubscribers({ name: community }),
    () =>
      getReadChain().api.bridge.list_subscribers({
        community
      })
  );
};

export const getAccountNotifications = async (
  account: string,
  lastId: number | string | null = null,
  limit = 50
): Promise<IAccountNotification[] | null> => {
  const params: { account: string; last_id?: number | string; limit: number } = {
    account,
    limit
  };

  if (lastId) {
    params.last_id = lastId;
  }
  // A string id names a lite notification row, which only a lite-aware node has (its
  // `lite.account_notifications` pages by it); hivemind's own ids are numbers.
  const restLastId = typeof params.last_id === 'number' ? params.last_id : undefined;
  return readFromHivemind(
    'accountNotifications',
    { accounts: [account] },
    (api) => api.accountNotifications({ 'account-name': account, 'page-size': limit, 'last-id': restLastId }),
    () => getReadChain().api.bridge.account_notifications(params)
  );
};

export const getCommunity = async (
  name: string,
  observer: string = commonVariables.defaultObserver
): Promise<Community | null> => {
  return readFromHivemind(
    'community',
    { accounts: [name] },
    (api) => api.community({ name, observer }),
    () => getReadChain().api.bridge.get_community({ name, observer })
  );
};
export const getListCommunityRoles = async (community: string): Promise<string[][] | null> => {
  return readFromHivemind(
    'communityRoles',
    { accounts: [community] },
    (api) => api.communityRoles({ name: community }),
    () => getReadChain().api.bridge.list_community_roles({ community })
  );
};

export const getDiscussion = async (
  author: string,
  permlink: string,
  observer: string = commonVariables.defaultObserver
): Promise<Record<string, Entry> | null> => {
  const params = { author, permlink, observer };
  const read = voteFreeRead(
    'get_discussion',
    (api) => api.get_discussion_v2({ ...params, top_votes: NO_TOP_VOTES }),
    (api) => api.get_discussion(params)
  );
  return readPosts(
    read,
    () =>
      readFromHivemind(
        'postDiscussion',
        { accounts: [author], permlinks: [permlink] },
        (api) => readRestPost((shape) => api.postDiscussion({ ...params, ...shape })),
        () => read(getReadChain().api.bridge)
      ),
    postsReadOptionsOf(author)
  ).then((discussion) => discussionWithObserverVotes(discussion, observer));
};

/**
 * `getDiscussion` read with every post's votes (`active_votes`) wherever the node serves the
 * vote-free reads too, for what needs the votes themselves rather than their number.
 */
export const getDiscussionWithVotes = async (
  author: string,
  permlink: string,
  observer: string = commonVariables.defaultObserver
): Promise<Record<string, Entry> | null> => {
  const params = { author, permlink, observer };
  return readPosts(
    (api) => api.get_discussion(params),
    () =>
      readFromHivemind(
        'postDiscussion',
        { accounts: [author], permlinks: [permlink] },
        (api) => api.postDiscussion(params),
        () => getReadChain().api.bridge.get_discussion(params)
      ),
    postsReadOptionsOf(author)
  );
};
