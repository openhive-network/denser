import { ApiAccount, NaiAsset, ApiAuthority, ApiManabar } from '@hiveio/wax';

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

/**
 * Extended account interface that combines ApiAccount fields with app-specific additions.
 * Uses NAI format for all asset fields (from database_api.find_accounts).
 */
export interface FullAccount {
  name: string;
  owner: ApiAuthority;
  active: ApiAuthority;
  posting: ApiAuthority;
  memo_key: string;
  post_count: number;
  created: string;
  json_metadata: string;
  posting_json_metadata: string;
  last_vote_time: string;
  last_post: string;
  reward_hbd_balance: NaiAsset;
  reward_vesting_hive: NaiAsset;
  reward_hive_balance: NaiAsset;
  reward_vesting_balance: NaiAsset;
  governance_vote_expiration_ts: string;
  balance: NaiAsset;
  vesting_shares: NaiAsset;
  hbd_balance: NaiAsset;
  savings_balance: NaiAsset;
  savings_hbd_balance: NaiAsset;
  savings_hbd_seconds: string;
  savings_hbd_last_interest_payment: string;
  savings_hbd_seconds_last_update: string;
  next_vesting_withdrawal: string;
  delegated_vesting_shares: NaiAsset;
  received_vesting_shares: NaiAsset;
  vesting_withdraw_rate: NaiAsset;
  to_withdraw: number | string;
  withdrawn: number | string;
  proxy: string;
  proxied_vsf_votes: (number | string)[];
  voting_manabar: ApiManabar;
  downvote_manabar: ApiManabar;
  // Fields that need to be fetched from separate APIs (not available in database_api.find_accounts)
  witness_votes?: string[];
  // App-specific additions
  profile?: AccountProfile;
  follow_stats?: AccountFollowStats;
  __loaded?: true;
  proxyVotes?: Array<unknown>;
  // Temporary properties for UI purposes
  _temporary?: boolean;
}

export interface Beneficiarie {
  account: string;
  weight: number;
}

export interface Preferences {
  nsfw: 'hide' | 'warn' | 'show';
  blog_rewards: '0%' | '50%' | '100%';
  comment_rewards: '0%' | '50%' | '100%';
  referral_system: 'enabled' | 'disabled';
}

/**
 * Metadata properties for SEO and page meta tags
 */
export interface MetadataProps {
  tabTitle: string;
  description: string;
  image: string;
  title: string;
}
