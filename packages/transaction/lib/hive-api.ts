import { AccountFollowStats, AccountProfile, FullAccount } from './app-types';
import { getChain } from './chain';
import { IManabarData } from '@hiveio/wax';

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

export const getManabars = async (accountName: string): Promise<IManabars | null> => {
  try {
    const upvoteCooldownPromise = (await getChain()).calculateManabarFullRegenerationTimeForAccount(
      accountName,
      0
    );
    const downvoteCooldownPromise = (await getChain()).calculateManabarFullRegenerationTimeForAccount(
      accountName,
      1
    );
    const rcCooldownPromise = (await getChain()).calculateManabarFullRegenerationTimeForAccount(
      accountName,
      2
    );
    const upvotePromise = (await getChain()).calculateCurrentManabarValueForAccount(accountName, 0);
    const downvotePromise = (await getChain()).calculateCurrentManabarValueForAccount(accountName, 1);
    const rcPromise = (await getChain()).calculateCurrentManabarValueForAccount(accountName, 2);
    const manabars = await Promise.all([
      upvotePromise,
      upvoteCooldownPromise,
      downvotePromise,
      downvoteCooldownPromise,
      rcPromise,
      rcCooldownPromise
    ]);
    return {
      upvote: manabars[0],
      upvoteCooldown: manabars[1],
      downvote: manabars[2],
      downvoteCooldown: manabars[3],
      rc: manabars[4],
      rcCooldown: manabars[5]
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
  return (await getChain()).api.condenser_api.get_accounts([usernames]).then((resp: any[]): FullAccount[] =>
    resp.map((x) => {
      const account: FullAccount = {
        name: x.name,
        owner: x.owner,
        active: x.active,
        posting: x.posting,
        memo_key: x.memo_key,
        post_count: x.post_count,
        created: x.created,
        reputation: x.reputation,
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
        savings_hbd_last_interest_payment: x.savings_hbd_last_interest_payment,
        savings_hbd_seconds_last_update: x.savings_hbd_seconds_last_update,
        savings_hbd_seconds: x.savings_hbd_seconds,
        next_vesting_withdrawal: x.next_vesting_withdrawal,
        vesting_shares: x.vesting_shares,
        delegated_vesting_shares: x.delegated_vesting_shares,
        received_vesting_shares: x.received_vesting_shares,
        vesting_withdraw_rate: x.vesting_withdraw_rate,
        to_withdraw: x.to_withdraw,
        withdrawn: x.withdrawn,
        witness_votes: x.witness_votes,
        proxy: x.proxy,
        proxied_vsf_votes: x.proxied_vsf_votes,
        voting_manabar: x.voting_manabar,
        voting_power: x.voting_power,
        downvote_manabar: x.downvote_manabar,
        vesting_balance: x.vesting_balance,
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
    })
  );
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
  return (await getChain()).api.condenser_api.get_follow_count([username]);
};
