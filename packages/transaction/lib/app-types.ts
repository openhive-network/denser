import { ApiAccount } from '@hive/wax/web';

export type ExpApiAccount = ApiAccount;
export interface AccountProfile {
  about?: string;
  cover_image?: string;
  location?: string;
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
export interface FullAccount extends ApiAccount {
  profile?: AccountProfile;
}
