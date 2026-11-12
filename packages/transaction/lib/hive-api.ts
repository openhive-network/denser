import {
  AccountFollowStats,
  FullAccount,
  Entry,
  HivemindRestPostVote,
  IAccountReputations,
  IFeedHistory,
  IFollow,
  IProfile,
  IVote,
  IVoteListItem,
  IWitnessSchedule,
  SearchType
} from '@hive/common-hiveio-packages/wax';
import { GetDynamicGlobalPropertiesResponse } from '@hiveio/wax';
import { getHiveChainService } from './hive-chain-service';
import {
  getApiSetCallNode,
  getReadChain,
  getSearchHivemindRestApi,
  getSearchReadChain,
  type HivemindRestApi
} from './chain';
import { nonEmpty, readFromHivemind } from './hivemind-rest';
import { ApiAccount } from '@hiveio/wax';
import {
  calculateCurrentManabarValue,
  calculateManabarFullRegenerationTime,
  type IManabarValue
} from './manabar-math';
import { DATA_LIMIT } from './bridge-api';
import { fetchReadTransport } from './read-transport';
import { createViewerVoteBatcher, listVotesNodeOf } from './viewer-votes-batch';
import { readAccountProfile } from './profile-metadata';
import { getLogger } from '@ui/lib/logging';
import { getLiteFollowCount, getLiteFollowers, getLiteFollowing } from './lite-social-api';
import { createVoteFreeSupport, listWithObserverVotes, readVoteFree } from './vote-free-posts';

const logger = getLogger('hive-api');

interface ISingleManabar {
  max: string;
  current: string;
  percentageValue: number;
  cooldown: Date;
}
interface Manabar {
  upvote: ISingleManabar;
  downvote: ISingleManabar;
  rc: ISingleManabar;
  /** RC the account got for creating accounts: counted in the RC max, but never delegatable. */
  rcCreationAdjustment: string;
  /** RC other accounts delegate to this one: counted in the RC max, but never delegatable. */
  rcReceivedDelegated: string;
}

interface IManabars {
  upvote: IManabarValue;
  downvote: IManabarValue;
  rc: IManabarValue;
  upvoteCooldown: Date;
  downvoteCooldown: Date;
  rcCooldown: Date;
  rcCreationAdjustment: string;
  rcReceivedDelegated: string;
}

const PERCENT_VALUE_DOUBLE_PRECISION = 100;
const ONE_HUNDRED_PERCENT = BigInt(100) * BigInt(PERCENT_VALUE_DOUBLE_PRECISION);

/** find_rc_accounts replies with the RC an account received, though wax's RcAccount type leaves it out. */
const getReceivedDelegatedRc = (rcAccount: {
  account: string;
  received_delegated_rc?: string | number;
}): string => String(rcAccount.received_delegated_rc ?? 0);

type ManabarDynamicGlobalProperties = Pick<
  GetDynamicGlobalPropertiesResponse,
  'time' | 'downvote_pool_percent'
>;

/**
 * Loads the global properties the manabars are computed against. Callers that already hold them
 * (e.g. in a query cache) pass a loader to avoid another get_dynamic_global_properties request.
 */
type DynamicGlobalPropertiesLoader = () => Promise<ManabarDynamicGlobalProperties>;

export const getManabars = async (
  accountName: string,
  loadDynamicGlobalProperties?: DynamicGlobalPropertiesLoader
): Promise<IManabars | null> => {
  try {
    const chain = getReadChain();

    const [
      dgpo,
      {
        accounts: [account]
      },
      {
        rc_accounts: [rcAccount]
      }
    ] = await Promise.all([
      loadDynamicGlobalProperties
        ? loadDynamicGlobalProperties()
        : chain.api.database_api.get_dynamic_global_properties({}),
      chain.api.database_api.find_accounts({
        accounts: [accountName],
        delayed_votes_active: false
      }),
      chain.api.rc_api.find_rc_accounts({ accounts: [accountName] })
    ]);

    if (!account || !rcAccount) {
      return null;
    }

    const time = new Date(`${dgpo.time}Z`).getTime() / 1000;

    const upvoteCooldown = new Date(
      calculateManabarFullRegenerationTime(
        time,
        account.post_voting_power.amount,
        account.voting_manabar.current_mana,
        account.voting_manabar.last_update_time
      ) * 1000
    );

    // This code is copied from Wax repository. We should implement an easier way to manually calculate multiple manabars in the future.
    let max = BigInt(account.post_voting_power.amount);
    const downvotePoolPercent = BigInt(dgpo.downvote_pool_percent);
    if (max / ONE_HUNDRED_PERCENT > ONE_HUNDRED_PERCENT)
      max = (max / ONE_HUNDRED_PERCENT) * downvotePoolPercent;
    else max = (max * downvotePoolPercent) / ONE_HUNDRED_PERCENT;

    const downvoteCooldown = new Date(
      calculateManabarFullRegenerationTime(
        time,
        max,
        account.downvote_manabar.current_mana,
        account.downvote_manabar.last_update_time
      ) * 1000
    );
    const rcCooldown = new Date(
      calculateManabarFullRegenerationTime(
        time,
        rcAccount.max_rc,
        rcAccount.rc_manabar.current_mana,
        rcAccount.rc_manabar.last_update_time
      ) * 1000
    );
    const upvote = calculateCurrentManabarValue(
      time,
      account.post_voting_power.amount,
      account.voting_manabar.current_mana,
      account.voting_manabar.last_update_time
    );
    const downvote = calculateCurrentManabarValue(
      time,
      max,
      account.downvote_manabar.current_mana,
      account.downvote_manabar.last_update_time
    );
    const rc = calculateCurrentManabarValue(
      time,
      rcAccount.max_rc,
      rcAccount.rc_manabar.current_mana,
      rcAccount.rc_manabar.last_update_time
    );

    return {
      upvote,
      upvoteCooldown,
      downvote,
      downvoteCooldown,
      rc,
      rcCooldown,
      rcCreationAdjustment: rcAccount.max_rc_creation_adjustment.amount,
      rcReceivedDelegated: getReceivedDelegatedRc(rcAccount)
    };
  } catch (error) {
    console.error(error);
    return null;
  }
};
export const getManabar = async (
  accountName: string,
  loadDynamicGlobalProperties?: DynamicGlobalPropertiesLoader
): Promise<Manabar | null> => {
  const manabars = await getManabars(accountName!, loadDynamicGlobalProperties);
  if (!manabars) return null;
  const {
    upvote,
    upvoteCooldown,
    downvote,
    downvoteCooldown,
    rc,
    rcCooldown,
    rcCreationAdjustment,
    rcReceivedDelegated
  } = manabars;

  const processedManabars = {
    upvote: {
      cooldown: upvoteCooldown,
      max: upvote.max.toString(),
      current: upvote.current.toString(),
      percentageValue: upvote.percent
    },
    downvote: {
      cooldown: downvoteCooldown,
      max: downvote.max.toString(),
      current: downvote.current.toString(),
      percentageValue: downvote.percent
    },
    rc: {
      cooldown: rcCooldown,
      max: rc.max.toString(),
      current: rc.current.toString(),
      percentageValue: rc.percent
    },
    rcCreationAdjustment,
    rcReceivedDelegated
  };
  return processedManabars;
};

export const getAccounts = async (usernames: string[]): Promise<FullAccount[]> => {
  const result = await getReadChain().api.database_api.find_accounts({
    accounts: usernames,
    delayed_votes_active: false
  });

  return result.accounts.map((x) => {
    const account: FullAccount = {
      name: x.name,
      owner: x.owner,
      active: x.active,
      posting: x.posting,
      memo_key: x.memo_key,
      post_count: x.post_count,
      created: x.created,
      posting_json_metadata: x.posting_json_metadata,
      last_vote_time: x.last_vote_time,
      last_post: x.last_post,
      json_metadata: x.json_metadata,
      reward_hive_balance: x.reward_hive_balance,
      reward_hbd_balance: x.reward_hbd_balance,
      reward_vesting_hive: x.reward_vesting_hive,
      governance_vote_expiration_ts: x.governance_vote_expiration_ts,
      reward_vesting_balance: x.reward_vesting_balance,
      balance: x.balance,
      hbd_balance: x.hbd_balance,
      savings_balance: x.savings_balance,
      savings_hbd_balance: x.savings_hbd_balance,
      savings_hbd_last_interest_payment: x.hbd_last_interest_payment,
      savings_hbd_seconds_last_update: x.savings_hbd_seconds_last_update,
      savings_hbd_seconds: x.savings_hbd_seconds,
      next_vesting_withdrawal: x.next_vesting_withdrawal,
      vesting_shares: x.vesting_shares,
      delegated_vesting_shares: x.delegated_vesting_shares,
      received_vesting_shares: x.received_vesting_shares,
      vesting_withdraw_rate: x.vesting_withdraw_rate,
      to_withdraw: x.to_withdraw,
      withdrawn: x.withdrawn,
      proxy: x.proxy,
      proxied_vsf_votes: x.proxied_vsf_votes,
      voting_manabar: x.voting_manabar,
      downvote_manabar: x.downvote_manabar,
      __loaded: true
    };

    return { ...account, profile: readAccountProfile(x.posting_json_metadata, x.json_metadata) };
  });
};

export const getAccount = (username: string): Promise<FullAccount> =>
  getAccounts([username]).then((resp) => resp[0]);

const getBridgeProfile = (account: string): Promise<IProfile | null> =>
  readFromHivemind(
    'accountProfile',
    { accounts: [account] },
    (api) => api.accountProfile({ 'account-name': account }),
    () => getReadChain().api.bridge.get_profile({ account })
  );

/**
 * Fetches follow stats and reputation from bridge.get_profile. On a node serving the lite social
 * graph the follow counts come from `lite.get_follow_count`, which counts lite followers too.
 */
export const getProfileInfo = async (
  username: string
): Promise<{ follow_stats: AccountFollowStats; reputation: number }> => {
  const [profile, liteCounts] = await Promise.all([getBridgeProfile(username), getLiteFollowCount(username)]);
  if (liteCounts)
    return { follow_stats: { ...liteCounts, account: username }, reputation: profile?.reputation ?? 25 };
  if (!profile || !profile.stats) {
    return {
      follow_stats: {
        account: username,
        follower_count: 0,
        following_count: 0
      },
      reputation: 25
    };
  }
  return {
    follow_stats: {
      account: username,
      follower_count: profile.stats.followers,
      following_count: profile.stats.following
    },
    reputation: profile.reputation ?? 25
  };
};

/**
 * The account with its follow stats and reputation. When the profile read fails, `follow_stats`
 * and `reputation` are left undefined (unavailable) rather than failing the whole account read.
 */
export const getAccountFull = (username: string): Promise<FullAccount> =>
  getAccount(username).then(async (account) => {
    let follow_stats: AccountFollowStats | undefined;
    let reputation: number | undefined;
    try {
      const profileInfo = await getProfileInfo(username);
      follow_stats = profileInfo.follow_stats;
      reputation = profileInfo.reputation;
    } catch (error) {
      logger.warn(error, 'getAccountFull: profile read for %s failed, follow stats unavailable', username);
    }
    return { ...account, follow_stats, reputation };
  });

export const getFollowCount = async (username: string): Promise<AccountFollowStats> => {
  const profileInfo = await getProfileInfo(username);
  return profileInfo.follow_stats;
};

/**
 * Returns list of accounts that reblogged given post, defined by tuple
 * `[author: string, permlink: string]`.
 *
 * @param author
 * @param permlink
 * @returns
 */
export const getRebloggedBy = async (author: string, permlink: string): Promise<string[]> => {
  return readFromHivemind(
    'postRebloggedBy',
    { accounts: [author], permlinks: [permlink] },
    (api) => api.postRebloggedBy({ author, permlink }),
    () => getReadChain().api.condenser_api.get_reblogged_by([author, permlink])
  );
};

export const getFeedHistory = async (): Promise<IFeedHistory> => {
  return getReadChain().api.database_api.get_feed_history();
};

export const getWitnessSchedule = async (): Promise<IWitnessSchedule> => {
  return getReadChain().api.database_api.get_witness_schedule({});
};

// See https://developers.hive.io/apidefinitions/#database_api.list_votes
export const getListVotesByCommentVoter = async (
  start: [string, string, string] | null, // should be [author, permlink, voter]
  limit: number
): Promise<{ votes: IVoteListItem[] }> => {
  return getReadChain().api.database_api.list_votes({ start, limit, order: 'by_comment_voter' });
};

/**
 * `voter`'s vote on `author`/`permlink`, as `getListVotesByCommentVoter([author, permlink, voter], 1)`
 * answers it with that vote only; lookups made together (the cards of a page) go in one JSON-RPC
 * batch to the node the core set routes `database_api` calls to, see `createViewerVoteBatcher`.
 */
export const getViewerVote = createViewerVoteBatcher({
  nodeOf: listVotesNodeOf(getApiSetCallNode, () => getReadChain().endpointUrl),
  send: async (node, batch) => {
    const { response } = await fetchReadTransport.request({
      method: 'POST',
      endpoint: node,
      url: '',
      timeout: getHiveChainService().getApiEndpoints().apiTimeout,
      data: JSON.stringify(batch),
      responseType: 'json'
    });
    return response;
  },
  lookUpOne: ({ author, permlink, viewer }) => getListVotesByCommentVoter([author, permlink, viewer], 1)
});

export const getFindAccounts = async (username: string): Promise<{ accounts: ApiAccount[] }> => {
  return getReadChain().api.database_api.find_accounts({
    accounts: [username],
    delayed_votes_active: false
  });
};

export interface IGetFollowParams {
  account: string;
  start: string | null;
  type: string;
  limit: number;
}

export const DEFAULT_PARAMS_FOR_FOLLOW: IGetFollowParams = {
  account: '',
  start: null,
  type: 'blog',
  limit: 50
};

export const getFollowing = async (params?: Partial<IGetFollowParams>): Promise<IFollow[]> => {
  try {
    const account = params?.account || DEFAULT_PARAMS_FOR_FOLLOW.account;
    const start = params?.start || '';
    const type = params?.type || DEFAULT_PARAMS_FOR_FOLLOW.type;
    const limit = params?.limit || DEFAULT_PARAMS_FOR_FOLLOW.limit;

    const lite = await getLiteFollowing({ account, start, type, limit });
    if (lite) return lite;
    return readFromHivemind(
      'accountFollowing',
      { accounts: [account] },
      (api) =>
        api.accountFollowing({ 'account-name': account, type, 'page-size': limit, start: nonEmpty(start) }),
      () => getReadChain().api.condenser_api.get_following([account, start, type, limit])
    );
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
};

export const getAccountReputations = async (
  account_lower_bound: string,
  _limit: number
): Promise<IAccountReputations[]> => {
  const profile = await getBridgeProfile(account_lower_bound);
  if (!profile) {
    return [];
  }
  // bridge get_profile.reputation is calibrated, not a condenser raw share_type.
  return [
    {
      account: profile.name,
      reputation: profile.reputation
    }
  ];
};
export const getDynamicGlobalProperties = async (): Promise<GetDynamicGlobalPropertiesResponse> => {
  return getReadChain().api.database_api.get_dynamic_global_properties({});
};

export const getFollowers = async (params?: Partial<IGetFollowParams>): Promise<IFollow[]> => {
  try {
    const account = params?.account || DEFAULT_PARAMS_FOR_FOLLOW.account;
    const start = params?.start || '';
    const type = params?.type || DEFAULT_PARAMS_FOR_FOLLOW.type;
    const limit = params?.limit || DEFAULT_PARAMS_FOR_FOLLOW.limit;

    const lite = await getLiteFollowers({ account, start, type, limit });
    if (lite) return lite;
    return readFromHivemind(
      'accountFollowers',
      { accounts: [account] },
      (api) =>
        api.accountFollowers({ 'account-name': account, type, 'page-size': limit, start: nonEmpty(start) }),
      () => getReadChain().api.condenser_api.get_followers([account, start, type, limit])
    );
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
};

// The search nodes, per process or browser tab, that answered `search-api.find_text_v2` with "unknown method".
const searchVoteFree = createVoteFreeSupport();

/** The top votes a vote-free search is asked for: search results show no voters. */
const SEARCH_TOP_VOTES = 0;

/**
 * `search-api.find_text` in hivemind's vote-free form (`find_text_v2`) unless the node the search
 * goes to (the search endpoint the reader picked, else the API node) answered it with "unknown
 * method" before.
 */
const findText = (params: SearchType): Promise<Entry[]> => {
  const chain = getSearchReadChain();
  const api = chain.api['search-api'];
  const node = getHiveChainService().getApiEndpoints().searchApiEndpoint || chain.endpointUrl;
  return readVoteFree(
    searchVoteFree,
    node,
    () => api.find_text_v2({ ...params, top_votes: SEARCH_TOP_VOTES }),
    () => api.find_text(params)
  );
};

export const getByText = async ({
  pattern,
  sort = 'relevance',
  author = '',
  limit = DATA_LIMIT,
  observer,
  start_author = '',
  start_permlink = ''
}: SearchType): Promise<Entry[]> => {
  // A search is asked of each node once, without moving any other call off a node it is slow on.
  const readFindText = () => findText({ pattern, sort, author, limit, observer, start_author, start_permlink });
  const read = (): Promise<Entry[]> => {
    // A search endpoint the reader picked is asked, not hivemind's own search.
    if (getHiveChainService().getApiEndpoints().searchApiEndpoint) return readFindText();
    return readFromHivemind(
      'searchPosts',
      {},
      (api) =>
        api.searchPosts({
          q: pattern,
          sort,
          author: nonEmpty(author),
          observer,
          'page-size': limit,
          'start-author': nonEmpty(start_author),
          'start-permlink': nonEmpty(start_permlink)
        }),
      readFindText,
      getSearchHivemindRestApi()
    );
  };
  return listWithObserverVotes(await read(), observer ?? '') ?? [];
};

const ACTIVE_VOTES_PAGE_SIZE = 1000;

/** Every vote of the post, from hivemind REST pages of ACTIVE_VOTES_PAGE_SIZE that start after `start-voter`. */
const getPostVotesFromHivemind = async (
  api: HivemindRestApi,
  author: string,
  permlink: string
): Promise<IVote[]> => {
  const votes: HivemindRestPostVote[] = [];
  let startVoter: string | undefined;
  while (true) {
    const page = await api.postVotes({
      author,
      permlink,
      'page-size': ACTIVE_VOTES_PAGE_SIZE,
      'start-voter': startVoter
    });
    votes.push(...page.filter((vote) => vote.voter !== startVoter));
    if (page.length < ACTIVE_VOTES_PAGE_SIZE) break;
    startVoter = page[page.length - 1].voter;
  }
  return votes.map((vote) => ({
    voter: vote.voter,
    percent: vote.vote_percent,
    rshares: Number(vote.rshares),
    time: vote.last_update,
    weight: parseInt(vote.weight, 10),
    reputation: 0
  }));
};

export const getActiveVotes = (author: string, permlink: string): Promise<IVote[]> =>
  readFromHivemind(
    'postVotes',
    { accounts: [author], permlinks: [permlink] },
    (api) => getPostVotesFromHivemind(api, author, permlink),
    () => getActiveVotesFromListVotes(author, permlink)
  );

const getActiveVotesFromListVotes = async (author: string, permlink: string): Promise<IVote[]> => {
  const BATCH_SIZE = 1000;
  const allVotes: IVoteListItem[] = [];
  let lastVoter = '';

  // Paginate through all votes for this post
  while (true) {
    const response = await getListVotesByCommentVoter([author, permlink, lastVoter], BATCH_SIZE);
    const postVotes = response.votes.filter((vote) => vote.author === author && vote.permlink === permlink);

    if (postVotes.length === 0) break;

    allVotes.push(...postVotes);

    // If we got fewer votes than requested, we've reached the end
    if (postVotes.length < BATCH_SIZE) break;

    // Set up for next page - start after the last voter
    lastVoter = postVotes[postVotes.length - 1].voter;
  }

  // Transform to IVote format
  return allVotes.map((vote) => ({
    voter: vote.voter,
    percent: vote.vote_percent,
    rshares: vote.rshares,
    time: vote.last_update,
    weight: typeof vote.weight === 'string' ? parseInt(vote.weight, 10) : vote.weight,
    reputation: 0 // Not available in database_api.list_votes
  }));
};
