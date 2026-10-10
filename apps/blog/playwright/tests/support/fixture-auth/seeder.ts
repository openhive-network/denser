import { sealData, unsealData } from 'iron-session';
import type { BrowserContext } from '@playwright/test';
import { LoginType, KeyType, type IronSessionData, type User } from '@smart-signer/types/common';
import {
  FIXTURE_COOKIE_NAME,
  FIXTURE_COOKIE_PASSWORD,
  FIXTURE_POSTING_WIF
} from './constants';

const DEFAULT_USERNAME = process.env.CI_TEST_USER || 'guest4test';

export const DEFAULT_USER: User = {
  isLoggedIn: true,
  username: DEFAULT_USERNAME,
  avatarUrl: '',
  loginType: LoginType.wif,
  keyType: KeyType.posting,
  authenticateOnBackend: false,
  chatAuthToken: '',
  oauthConsent: {},
  strict: false
};

// Must match `transaction/lib/observer-lists.ts` (storage key prefix, cookie name, TTL).
const OWN_LISTS_STORAGE_PREFIX = 'observer-own-lists-';
const NO_OWN_LISTS_COOKIE = 'observer-no-own-lists';
const OWN_LISTS_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Pre-seeds logged-in state for the blog app without running the real login
 * flow. Two-sided: the iron-session and `observer` cookies satisfy server-side
 * handlers (e.g. `/api/users/me`) and renders, and the `localStorage['user']` entry satisfies the
 * client — `useUserCore` hydrates `useQuery` from localStorage via
 * `initialData` with `refetchOnMount: false`, so seeding only the cookie
 * leaves the UI stuck in anonymous state.
 *
 * A session the context already holds (e.g. a pending OAuth request the
 * server stored) is kept, with the user replaced, as a real login keeps it.
 *
 * `hasOwnLists` seeds the answer the login-time list check stores (see
 * `observer-lists.ts`): true (the default) keeps every read on the username, as
 * the recordings expect, and makes no check request; false makes feed and post
 * reads send the default observer.
 *
 * Call before any `page.goto(...)` in the test.
 */
export async function seedAuthCookie(
  context: BrowserContext,
  overrides: Partial<User> = {},
  hasOwnLists = true
): Promise<User> {
  const user: User = { ...DEFAULT_USER, ...overrides, isLoggedIn: true };

  const existing = (await context.cookies()).find((c) => c.name === FIXTURE_COOKIE_NAME);
  const session = existing
    ? await unsealData<IronSessionData>(existing.value, { password: FIXTURE_COOKIE_PASSWORD })
    : {};
  const sealed = await sealData(
    { ...session, user },
    { password: FIXTURE_COOKIE_PASSWORD }
  );

  // The server's cookie is host-only; one added for `domain` would sit next to it.
  if (existing) await context.clearCookies({ name: FIXTURE_COOKIE_NAME });
  await context.addCookies([
    {
      name: FIXTURE_COOKIE_NAME,
      value: sealed,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'Lax'
    },
    // What `use-sign-in.tsx` sets on login; server renders read the observer from it first.
    {
      name: 'observer',
      value: user.username,
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax'
    },
    // What the list check sets for an account without lists of its own; server renders read it.
    ...(hasOwnLists
      ? []
      : [
          {
            name: NO_OWN_LISTS_COOKIE,
            value: user.username,
            domain: 'localhost',
            path: '/',
            httpOnly: false,
            secure: false,
            sameSite: 'Lax' as const
          }
        ])
  ]);

  // Runs before any page script on every navigation in this context.
  // Key and shape must match `smart-signer/lib/auth/user-localstore.ts`.
  const userJson = JSON.stringify(user);

  // Posting WIF — lets broadcast-style operations (e.g. upvote) sign
  // without popping the password dialog. Storage key must match
  // `signer-wif.ts#storageKey`: `wif.{username}@{keyType}`. The test account's
  // real key comes from env when set; otherwise a throwaway key, which is
  // enough because broadcasts are intercepted (see FIXTURE_POSTING_WIF).
  const postingWif = process.env.CI_TEST_USER_WIF_POSTING || FIXTURE_POSTING_WIF;
  const wifKey = `wif.${user.username}@${KeyType.posting}`;
  const wifValue = postingWif ? JSON.stringify(postingWif) : '';

  // Shape must match `ui/lib/storage-with-ttl.ts`. Seeded only when absent: a list change in
  // the test updates it, and later navigations must not undo that.
  const ownListsKey = `${OWN_LISTS_STORAGE_PREFIX}${user.username}`;
  const ownListsValue = JSON.stringify({
    value: hasOwnLists,
    expiresAt: Date.now() + OWN_LISTS_TTL_MS,
    createdAt: Date.now()
  });

  await context.addInitScript(
    ({ userJson, wifKey, wifValue, ownListsKey, ownListsValue }) => {
      try {
        window.localStorage.setItem('user', userJson);
        if (wifValue) {
          window.localStorage.setItem(wifKey, wifValue);
        }
        if (window.localStorage.getItem(ownListsKey) === null) {
          window.localStorage.setItem(ownListsKey, ownListsValue);
        }
      } catch {
        /* storage may be unavailable in some edge contexts — ignore */
      }
    },
    { userJson, wifKey, wifValue, ownListsKey, ownListsValue }
  );

  return user;
}

/**
 * Pre-seeds the accounts remembered for switching (the session's `accounts` and
 * `localStorage['accounts']`), as signing in to each of them in turn would. Call
 * after `seedAuthCookie` (the `authenticatedUser` option) and before any
 * `page.goto(...)`. The localStorage entry is written only when absent, so a
 * change the test makes survives navigation.
 */
export async function seedRememberedAccounts(context: BrowserContext, accounts: User[]): Promise<void> {
  const existing = (await context.cookies()).find((c) => c.name === FIXTURE_COOKIE_NAME);
  if (!existing) throw new Error('seedRememberedAccounts: seed the logged-in user first');
  const session = await unsealData<IronSessionData>(existing.value, { password: FIXTURE_COOKIE_PASSWORD });
  const sealed = await sealData({ ...session, accounts }, { password: FIXTURE_COOKIE_PASSWORD });

  await context.clearCookies({ name: FIXTURE_COOKIE_NAME });
  await context.addCookies([
    {
      name: FIXTURE_COOKIE_NAME,
      value: sealed,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'Lax'
    }
  ]);

  await context.addInitScript((accountsJson) => {
    try {
      if (window.localStorage.getItem('accounts') === null) {
        window.localStorage.setItem('accounts', accountsJson);
      }
    } catch {
      /* storage may be unavailable in some edge contexts — ignore */
    }
  }, JSON.stringify(accounts));
}
