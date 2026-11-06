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
import { getReadChain } from './chain';
import { nonEmpty, readFromHivemind } from './hivemind-rest';
import { postsReadOptionsOf, readPosts } from './lite-api';
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

export const getPostsRanked = async (
  sort: string,
  tag: string = '',
  start_author: string = '',
  start_permlink: string = '',
  observer: string,
  limit: number = DATA_LIMIT
): Promise<Entry[] | null> => {
  return readPosts(
    (api) => api.get_ranked_posts({ sort, start_author, start_permlink, limit, tag, observer }),
    () =>
      readFromHivemind(
        'rankedPosts',
        {},
        (api) =>
          api.rankedPosts({
            sort,
            tag: nonEmpty(tag),
            observer,
            'page-size': limit,
            'start-author': nonEmpty(start_author),
            'start-permlink': nonEmpty(start_permlink)
          }),
        () =>
          getReadChain().api.bridge.get_ranked_posts({
            sort,
            start_author,
            start_permlink,
            limit,
            tag,
            observer
          })
      )
  ).then((resp) => {
    // logger.info('getPostsRanked result: %o', resp);
    if (resp) {
      return resolvePosts(resp, observer);
    }
    console.log('response', resp);

    return resp;
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
  return readPosts(
    (api) => api.get_post({ author, permlink, observer }),
    () =>
      readFromHivemind(
        'post',
        { accounts: [author], permlinks: [permlink] },
        (api) => api.post({ author, permlink, observer }),
        () =>
          getReadChain().api.bridge.get_post({
            author,
            permlink,
            observer
          })
      ),
    postsReadOptionsOf(author)
  ).then((resp) => {
    if (resp) {
      return resolvePost(resp, observer);
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
  return readPosts(
    (api) => api.get_account_posts({ sort, account, start_author, start_permlink, limit, observer }),
    () =>
      readFromHivemind(
        'accountPosts',
        { accounts: [account] },
        (api) =>
          api.accountPosts({
            'account-name': account,
            sort,
            observer,
            'page-size': limit,
            'start-author': nonEmpty(start_author),
            'start-permlink': nonEmpty(start_permlink)
          }),
        () =>
          getReadChain().api.bridge.get_account_posts({
            sort,
            account,
            start_author,
            start_permlink,
            limit,
            observer
          })
      ),
    postsReadOptionsOf(account)
  ).then((resp) => {
    if (resp) {
      return resolvePosts(resp, observer);
    }

    return resp;
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
  return readPosts(
    (api) => api.get_discussion({ author, permlink, observer }),
    () =>
      readFromHivemind(
        'postDiscussion',
        { accounts: [author], permlinks: [permlink] },
        (api) => api.postDiscussion({ author, permlink, observer }),
        () =>
          getReadChain().api.bridge.get_discussion({
            author,
            permlink,
            observer
          })
      ),
    postsReadOptionsOf(author)
  );
};
