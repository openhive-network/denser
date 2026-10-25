import { EFollowBlogAction, type FollowOperation } from '@hiveio/wax';

/** The follow-plugin lists an account can empty with one `reset_*` operation. */
export type FollowListReset = 'following' | 'muted' | 'blacklist' | 'followBlacklist' | 'followMuted';

const ALL = 'all';

const BUILDERS: Record<FollowListReset, (operation: FollowOperation, account: string) => FollowOperation> = {
  // EFollowBlogAction.BOTH would also reset the mute list.
  following: (operation, account) => operation.resetBlogList(EFollowBlogAction.FOLLOW_BLOG, account, ALL),
  muted: (operation, account) => operation.resetBlogList(EFollowBlogAction.MUTE_BLOG, account, ALL),
  blacklist: (operation, account) => operation.resetBlacklistBlog(account, ALL),
  followBlacklist: (operation, account) => operation.resetFollowBlacklistBlog(account, ALL),
  followMuted: (operation, account) => operation.resetFollowMutedBlog(account, ALL)
};

/** Adds to `operation` the `follow` entry that empties `account`'s `list`, and returns it. */
export function buildFollowListReset(list: FollowListReset, operation: FollowOperation, account: string) {
  return BUILDERS[list](operation, account);
}
