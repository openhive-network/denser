import { getLogger } from '@ui/lib/logging';
import { Community, Entry } from './extended-hive.chain';
import type { IGetPostHeader, IUnreadNotifications } from './extended-hive.chain';
import { getChain } from './chain';

export const DATA_LIMIT = 20;

const logger = getLogger('bridge');
export const getPostHeader = async (author: string, permlink: string): Promise<IGetPostHeader> => {
  return (await getChain()).api.bridge.get_post_header({
    author,
    permlink
  });
};
export const getUnreadNotifications = async (account: string): Promise<IUnreadNotifications | null> => {
  return (await getChain()).api.bridge.unread_notifications({
    account
  });
};

export const getCommunities = async (
  sort: string,
  query?: string | null,

  observer: string = 'hive.blog'
): Promise<Community[] | null> => {
  return (await getChain()).api.bridge.list_communities({
    query,
    sort,
    observer
  });
};

export const getSubscriptions = async (account: string): Promise<string[][] | null> => {
  return (await getChain()).api.bridge.list_all_subscriptions({
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
  console.log('getPostsRanked', { sort, tag, start_author, start_permlink, observer, limit });
  return (await getChain()).api.bridge
    .get_ranked_posts({
      sort,
      start_author,
      start_permlink,
      limit,
      tag,
      observer
    })
    .then((resp) => {
      // logger.info('getPostsRanked result: %o', resp);
      if (resp) {
        return resolvePosts(resp, observer);
      }
      console.log('response', resp);

      return resp;
    });
};

const resolvePosts = (posts: Entry[], observer: string): Promise<Entry[]> => {
  const promises = posts.map((p) => resolvePost(p, observer));

  return Promise.all(promises);
};

const resolvePost = (post: Entry, observer: string): Promise<Entry> => {
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
  observer: string = ''
): Promise<Entry | null> => {
  return (await getChain()).api.bridge
    .get_post({
      author,
      permlink,
      observer
    })
    .then((resp) => {
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
  return (await getChain()).api.bridge
    .get_account_posts({
      sort,
      account,
      start_author,
      start_permlink,
      limit,
      observer
    })
    .then((resp) => {
      if (resp) {
        return resolvePosts(resp, observer);
      }

      return resp;
    });
};
