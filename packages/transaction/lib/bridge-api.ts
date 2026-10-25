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
import type { IObserverListsApi } from './observer-lists';
import type { IHiddenAuthorsApi } from './hidden-authors';

export const DATA_LIMIT = 20;

const logger = getLogger('bridge');
export const getPostHeader = async (author: string, permlink: string): Promise<IGetPostHeader> => {
  return getReadChain().api.bridge.get_post_header({
    author,
    permlink
  });
};
export const getUnreadNotifications = async (account: string): Promise<IUnreadNotifications | null> => {
  return getReadChain().api.bridge.unread_notifications({
    account
  });
};

export const getCommunities = async (
  sort: string,
  query?: string | null,
  observer: string = commonVariables.defaultObserver
): Promise<Community[] | null> => {
  return readFromHivemind(
    'communities',
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
  return getReadChain().api.bridge.list_all_subscriptions({
    account
  });
};

export const getPostsRanked = async (
  sort: string,
  tag: string = '',
  start_author: string = '',
  start_permlink: string = '',
  observer: string,
  limit: number = DATA_LIMIT
): Promise<Entry[] | null> => {
  return readFromHivemind(
    'rankedPosts',
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
  return readFromHivemind(
    'post',
    (api) => api.post({ author, permlink, observer }),
    () =>
      getReadChain().api.bridge.get_post({
        author,
        permlink,
        observer
      })
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
  return readFromHivemind(
    'accountPosts',
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
  return getReadChain().api.bridge.get_follow_list({
    observer,
    follow_type
  });
};

export const doesUserFollowAnyLists = async (observer: string): Promise<boolean> => {
  return getReadChain().api.bridge.does_user_follow_any_lists({ observer });
};

export const observerListsApi: IObserverListsApi = { getFollowList, doesUserFollowAnyLists };

export const hiddenAuthorsApi: IHiddenAuthorsApi = { getFollowList };

export const getSubscribers = async (community: string): Promise<string[][] | null> => {
  return readFromHivemind(
    'communitySubscribers',
    (api) => api.communitySubscribers({ name: community }),
    () =>
      getReadChain().api.bridge.list_subscribers({
        community
      })
  );
};

export const getAccountNotifications = async (
  account: string,
  lastId: number | null = null,
  limit = 50
): Promise<IAccountNotification[] | null> => {
  const params: { account: string; last_id?: number; limit: number } = {
    account,
    limit
  };

  if (lastId) {
    params.last_id = lastId;
  }
  return readFromHivemind(
    'accountNotifications',
    (api) =>
      api.accountNotifications({ 'account-name': account, 'page-size': limit, 'last-id': params.last_id }),
    () => getReadChain().api.bridge.account_notifications(params)
  );
};

export const getCommunity = async (
  name: string,
  observer: string = commonVariables.defaultObserver
): Promise<Community | null> => {
  return readFromHivemind(
    'community',
    (api) => api.community({ name, observer }),
    () => getReadChain().api.bridge.get_community({ name, observer })
  );
};
export const getListCommunityRoles = async (community: string): Promise<string[][] | null> => {
  return readFromHivemind(
    'communityRoles',
    (api) => api.communityRoles({ name: community }),
    () => getReadChain().api.bridge.list_community_roles({ community })
  );
};

export const getDiscussion = async (
  author: string,
  permlink: string,
  observer: string = commonVariables.defaultObserver
): Promise<Record<string, Entry> | null> => {
  return getReadChain().api.bridge.get_discussion({
    author,
    permlink,
    observer
  });
};
