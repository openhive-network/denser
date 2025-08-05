import { ApiAccount } from '@hiveio/wax';
import { Authority } from '@hiveio/dhive/lib/chain/account';
import { Asset } from '@hiveio/dhive/lib/chain/asset';

export type ExpApiAccount = ApiAccount;
export interface AccountProfile {
  about?: string;
  cover_image?: string;
  location?: string;
  blacklist_description?: string;
  muted_list_description?: string;
  name?: string;
  profile_image?: string;
  website?: string;
  pinned?: string;
  witness_description?: string;
  witness_owner?: string;
}
export interface AccountFollowStats {
  follower_count: number;
  following_count: number;
  account: string;
}
export interface FullAccount {
  vesting_balance: string | Asset;
  name: string;
  owner: Authority;
  active: Authority;
  posting: Authority;
  memo_key: string;
  post_count: number;
  created: string;
  reputation: string | number;
  json_metadata: string;
  posting_json_metadata: string;
  last_vote_time: string;
  last_post: string;
  reward_hbd_balance: string;
  reward_vesting_hive: string;
  reward_hive_balance: string;
  reward_vesting_balance: string;
  governance_vote_expiration_ts: string;
  balance: string;
  vesting_shares: string;
  hbd_balance: string;
  savings_balance: string;
  savings_hbd_balance: string;
  savings_hbd_seconds: string;
  savings_hbd_last_interest_payment: string;
  savings_hbd_seconds_last_update: string;
  next_vesting_withdrawal: string;
  delegated_vesting_shares: string;
  received_vesting_shares: string;
  vesting_withdraw_rate: string;
  to_withdraw: number;
  withdrawn: number;
  witness_votes: string[];
  proxy: string;
  proxied_vsf_votes: number[] | string[];
  voting_manabar: {
    current_mana: string | number;
    last_update_time: number;
  };
  voting_power: number;
  downvote_manabar: {
    current_mana: string | number;
    last_update_time: number;
  };
  profile?: AccountProfile;
  follow_stats?: AccountFollowStats;
  __loaded?: true;
  proxyVotes?: Array<unknown>;
  // Temporary properties for UI purposes
  _temporary?: boolean;
}

export interface Beneficiarie {
  account: string;
  weight: string;
}

export interface Preferences {
  nsfw: 'hide' | 'warn' | 'show';
  blog_rewards: '0%' | '50%' | '100%';
  comment_rewards: '0%' | '50%' | '100%';
  referral_system: 'enabled' | 'disabled';
}
