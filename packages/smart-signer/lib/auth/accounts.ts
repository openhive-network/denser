import type { User } from '@smart-signer/types/common';

/** Upper bound on remembered accounts: they all travel in the session cookie, which has ~4 KB. */
export const MAX_ACCOUNTS = 5;

/**
 * Accounts remembered after `user` signs in. A sign-in while logged out starts a new list; one
 * while logged in as `currentUser` adds to it. An account already listed is replaced in place;
 * past `MAX_ACCOUNTS` the oldest other account is dropped.
 */
export function addAccount(accounts: User[], currentUser: User | undefined, user: User): User[] {
  if (!currentUser?.isLoggedIn) return [user];
  const known = accounts.some((account) => account.username === currentUser.username)
    ? accounts
    : [...accounts, currentUser];
  const index = known.findIndex((account) => account.username === user.username);
  const next = index === -1 ? [...known, user] : known.map((account, i) => (i === index ? user : account));
  return next.length > MAX_ACCOUNTS ? next.slice(next.length - MAX_ACCOUNTS) : next;
}

export function removeAccount(accounts: User[], username: string): User[] {
  return accounts.filter((account) => account.username !== username);
}

export function findAccount(accounts: User[], username: string): User | undefined {
  return accounts.find((account) => account.username === username);
}
