/**
 * hb-auth usernames under which the blog's lite accounts keep their keys in safe storage start with
 * the lite DID prefix. No Hive account name contains `:`, so a lite entry never shares a wallet
 * with a Hive account of the same name; the lists of the Hive accounts safe storage holds leave
 * the lite entries out.
 */
const LITE_WALLET_USER_PREFIX = 'did:lite:';

const isLiteWalletUser = (username: string): boolean => username.startsWith(LITE_WALLET_USER_PREFIX);

/** `users` without the lite accounts' entries: the Hive accounts safe storage holds. */
export const hiveSafeStorageUsers = <T extends { username: string }>(users: readonly T[]): T[] =>
  users.filter((user) => !isLiteWalletUser(user.username));
