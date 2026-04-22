import { sealData } from 'iron-session';
import type { BrowserContext } from '@playwright/test';
import { LoginType, KeyType, type User } from '@smart-signer/types/common';
import {
  FIXTURE_COOKIE_NAME,
  FIXTURE_COOKIE_PASSWORD
} from './constants';

const DEFAULT_USERNAME = process.env.CI_TEST_USER || 'guest4test';

const DEFAULT_USER: User = {
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

/**
 * Pre-seeds logged-in state for the blog app without running the real login
 * flow. Two-sided: the iron-session cookie satisfies server-side handlers
 * (e.g. `/api/users/me`), and the `localStorage['user']` entry satisfies the
 * client — `useUserCore` hydrates `useQuery` from localStorage via
 * `initialData` with `refetchOnMount: false`, so seeding only the cookie
 * leaves the UI stuck in anonymous state.
 *
 * Call before any `page.goto(...)` in the test.
 */
export async function seedAuthCookie(
  context: BrowserContext,
  overrides: Partial<User> = {}
): Promise<User> {
  const user: User = { ...DEFAULT_USER, ...overrides, isLoggedIn: true };

  const sealed = await sealData(
    { user },
    { password: FIXTURE_COOKIE_PASSWORD }
  );

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

  // Runs before any page script on every navigation in this context.
  // Key and shape must match `smart-signer/lib/auth/user-localstore.ts`.
  const userJson = JSON.stringify(user);

  // Optional posting WIF — lets broadcast-style operations (e.g. upvote) sign
  // without popping the password dialog. Storage key must match
  // `signer-wif.ts#storageKey`: `wif.{username}@{keyType}`. Reading from env
  // rather than hardcoding keeps test secrets out of the repo.
  const postingWif = process.env.CI_TEST_USER_WIF_POSTING || '';
  const wifKey = `wif.${user.username}@${KeyType.posting}`;
  const wifValue = postingWif ? JSON.stringify(postingWif) : '';

  await context.addInitScript(
    ({ userJson, wifKey, wifValue }) => {
      try {
        window.localStorage.setItem('user', userJson);
        if (wifValue) {
          window.localStorage.setItem(wifKey, wifValue);
        }
      } catch {
        /* storage may be unavailable in some edge contexts — ignore */
      }
    },
    { userJson, wifKey, wifValue }
  );

  return user;
}
