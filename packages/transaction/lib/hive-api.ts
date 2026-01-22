import {
  AccountFollowStats,
  AccountProfile,
  FullAccount,
  Entry,
  IAccountReputations,
  IFeedHistory,
  IFollow,
  IVote,
  IVoteListItem
} from '@hive/common-hiveio-packages/wax';
import { GetDynamicGlobalPropertiesResponse } from '@hiveio/wax';
import { getChain } from './chain';
import { ApiAccount, IManabarData } from '@hiveio/wax';
import { DATA_LIMIT } from './bridge-api';

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
}

interface IManabars {
  upvote: IManabarData;
  downvote: IManabarData;
  rc: IManabarData;
  upvoteCooldown: Date;
  downvoteCooldown: Date;
  rcCooldown: Date;
}

const PERCENT_VALUE_DOUBLE_PRECISION = 100;
const ONE_HUNDRED_PERCENT = BigInt(100) * BigInt(PERCENT_VALUE_DOUBLE_PRECISION);

export const getManabars = async (accountName: string): Promise<IManabars | null> => {
  try {
    const chain = await getChain();

    const [dgpo, {
      accounts: [account]
    }, {
      rc_accounts: [rcAccount]
    }] = await Promise.all([
      chain.api.database_api.get_dynamic_global_properties({}),
      chain.api.database_api.find_accounts({
        accounts: [accountName],
        delayed_votes_active: false
      }),
      chain.api.rc_api.find_rc_accounts({ accounts: [ accountName ] })
    ]);

    if (!account || !rcAccount) {
      return null;
    }

    const time = new Date(`${dgpo.time}Z`).getTime() / 1000;

    const upvoteCooldown = new Date(chain.calculateManabarFullRegenerationTime(
      time,
      account.post_voting_power.amount,
      account.voting_manabar.current_mana,
      account.voting_manabar.last_update_time
    ) * 1000);

    // This code is copied from Wax repository. We should implement an easier way to manually calculate multiple manabars in the future.
    let max = BigInt(account.post_voting_power.amount);
    const downvotePoolPercent = BigInt(dgpo.downvote_pool_percent);
    if(max / ONE_HUNDRED_PERCENT > ONE_HUNDRED_PERCENT)
      max = (max / ONE_HUNDRED_PERCENT) * downvotePoolPercent;
    else
      max = (max * downvotePoolPercent) / ONE_HUNDRED_PERCENT;

    const downvoteCooldown = new Date(chain.calculateManabarFullRegenerationTime(
      time,
      max,
      account.downvote_manabar.current_mana,
      account.downvote_manabar.last_update_time
    ) * 1000);
    const rcCooldown = new Date(chain.calculateManabarFullRegenerationTime(
      time,
      rcAccount.max_rc,
      rcAccount.rc_manabar.current_mana,
      rcAccount.rc_manabar.last_update_time
    ) * 1000);
    const upvote = chain.calculateCurrentManabarValue(
      time,
      account.post_voting_power.amount,
      account.voting_manabar.current_mana,
      account.voting_manabar.last_update_time
    );
    const downvote = chain.calculateCurrentManabarValue(
      time,
      max,
      account.downvote_manabar.current_mana,
      account.downvote_manabar.last_update_time
    );
    const rc = chain.calculateCurrentManabarValue(
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
      rcCooldown
    };
  } catch (error) {
    console.error(error);
    return null;
  }
};
export const getManabar = async (accountName: string): Promise<Manabar | null> => {
  const manabars = await getManabars(accountName!);
  if (!manabars) return null;
  const { upvote, upvoteCooldown, downvote, downvoteCooldown, rc, rcCooldown } = manabars;

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
    }
  };
  return processedManabars;
};

export const getAccounts = async (usernames: string[]): Promise<FullAccount[]> => {
  const result = await (await getChain()).api.database_api.find_accounts({
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

    let profile: AccountProfile | undefined;

    try {
      profile = JSON.parse(x.posting_json_metadata!).profile;
    } catch (e) {}

    if (!profile) {
      try {
        profile = JSON.parse(x.json_metadata!).profile;
      } catch (e) {}
    }

    if (!profile) {
      profile = {
        about: '',
        cover_image: '',
        location: '',
        name: '',
        profile_image: '',
        website: ''
      };
    }

    return { ...account, profile };
  });
};

export const getAccount = (username: string): Promise<FullAccount> =>
  getAccounts([username]).then((resp) => resp[0]);

export const getAccountFull = (username: string): Promise<FullAccount> =>
  getAccount(username).then(async (account) => {
    let follow_stats: AccountFollowStats | undefined;
    try {
      follow_stats = await getFollowCount(username);
    } catch (e) {}
    return { ...account, follow_stats };
  });

export const getFollowCount = async (username: string): Promise<AccountFollowStats> => {
  const profile = await (await getChain()).api.bridge.get_profile({ account: username });
  if (!profile || !profile.stats) {
    return {
      account: username,
      follower_count: 0,
      following_count: 0
    };
  }
  return {
    account: username,
    follower_count: profile.stats.followers,
    following_count: profile.stats.following
  };
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
  return (await getChain()).api.condenser_api.get_reblogged_by([ author, permlink ]);
};

export const getFeedHistory = async (): Promise<IFeedHistory> => {
  return (await getChain()).api.database_api.get_feed_history();
};

// See https://developers.hive.io/apidefinitions/#database_api.list_votes
export const getListVotesByCommentVoter = async (
  start: [string, string, string] | null, // should be [author, permlink, voter]
  limit: number
): Promise<{ votes: IVoteListItem[] }> => {
  return (await getChain()).api.database_api.list_votes({ start, limit, order: 'by_comment_voter' });
};

export const getFindAccounts = async (username: string): Promise<{ accounts: ApiAccount[] }> => {
  return (await getChain()).api.database_api.find_accounts({
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

    return (await getChain()).api.condenser_api.get_following([
      account,
      start,
      type,
      limit
    ]);
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
};

export const getAccountReputations = async (
  account_lower_bound: string,
  _limit: number
): Promise<IAccountReputations[]> => {
  const profile = await (await getChain()).api.bridge.get_profile({ account: account_lower_bound });
  if (!profile) {
    return [];
  }
  return [
    {
      account: profile.name,
      reputation: profile.reputation
    }
  ];
};
export const getDynamicGlobalProperties = async (): Promise<GetDynamicGlobalPropertiesResponse> => {
  return (await getChain()).api.database_api.get_dynamic_global_properties({});
};

export const getFollowers = async (params?: Partial<IGetFollowParams>): Promise<IFollow[]> => {
  try {
    const account = params?.account || DEFAULT_PARAMS_FOR_FOLLOW.account;
    const start = params?.start || '';
    const type = params?.type || DEFAULT_PARAMS_FOR_FOLLOW.type;
    const limit = params?.limit || DEFAULT_PARAMS_FOR_FOLLOW.limit;

    return (await getChain()).api.condenser_api.get_followers([
      account,
      start,
      type,
      limit
    ]);
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
};

export const getByText = async ({
  pattern,
  sort = 'relevance',
  author = '',
  limit = DATA_LIMIT,
  observer,
  start_author = '',
  start_permlink = ''
}: Parameters<Awaited<ReturnType<typeof getChain>>['api']['search-api']['find_text']>[0] // Temporary solution
): Promise<Entry[]> => {
  return (await getChain()).api['search-api'].find_text({
    pattern,
    sort,
    author,
    limit,
    observer,
    start_author,
    start_permlink
  });
};

export const getActiveVotes = async (author: string, permlink: string): Promise<IVote[]> => {
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
