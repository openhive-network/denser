import { expect, type Page } from '@playwright/test';

/**
 * Mirrors `apps/blog/lib/utils.ts`'s `Preferences` interface. Re-declared
 * here because the playwright test suite is excluded from the app's
 * tsconfig `include` (apps/blog/tsconfig.json:exclude) and the `@/blog/*`
 * path alias doesn't resolve from `playwright/`. Keep the two in sync —
 * if the app's interface changes shape, update this one too.
 */
export interface Preferences {
  nsfw: 'hide' | 'warn' | 'show';
  blog_rewards: '0%' | '50%' | '100%';
  comment_rewards: '0%' | '50%' | '100%';
  referral_system: 'enabled' | 'disabled';
}

/**
 * §8 User Profile & Settings — shared constants and helpers.
 *
 * The settings page is gated on `user.isLoggedIn && user.username === username`
 * (content.tsx:12), so all §8 specs navigate to `/@{SETTINGS_USER}/settings`
 * where `SETTINGS_USER` is the seeded observer.
 */

/** Seeded logged-in user. Same env contract as VOTER / OBSERVER. */
export const SETTINGS_USER = process.env.CI_TEST_USER || 'guest4test';

/**
 * localStorage key the preferences form writes to (form.tsx:36). The
 * stored payload wraps the `Preferences` object in `StorageItem<T>`:
 *   { value: Preferences, expiresAt: null, createdAt: <ms> }
 * (expiresAt is null because the store uses StorageTTL.PERMANENT.)
 */
export const preferencesStorageKey = (username: string = SETTINGS_USER): string =>
  `user-preferences-${username}`;

/** Sample values for the SET-01..04 profile field updates. */
export const TEST_DISPLAY_NAME = 'Settings Test Name';
export const TEST_ABOUT = 'Updated bio for §8 fixture tests.';
export const TEST_LOCATION = 'Test City, Country';
export const TEST_WEBSITE = 'https://example.org/profile';

/**
 * Stable post used by SET-09 / SET-10 to assert that `comment_rewards`
 * affects the rewards notice rendered above the reply textbox. Mirrors
 * `postDisplayContext`'s POST_DETAIL_*, so re-recordings track the same
 * canonical target. Path matches the App Router pattern
 * `[community]/[author]/[permlink]`.
 */
export const PREF_POST_AUTHOR = 'gtg';
export const PREF_POST_PERMLINK = 'hive-hardfork-25-jump-starter-kit';
export const PREF_POST_COMMUNITY = 'hive-160391';
export const prefPostUrl = (): string =>
  `/${PREF_POST_COMMUNITY}/@${PREF_POST_AUTHOR}/${PREF_POST_PERMLINK}`;

/** Tag-filtered feed page used by SET-11 / SET-12. */
export const NSFW_FEED_URL = '/trending/nsfw';

/**
 * Reads `user-preferences-{username}` from the page's localStorage and
 * returns the decoded `Preferences` object. Returns `null` if the key is
 * missing or the stored value can't be unwrapped — callers should
 * `expect(prefs).not.toBeNull()` before accessing fields.
 *
 * Tolerates both the TTL-wrapped shape and the legacy bare-object shape
 * (`getStorageItem` in `@ui/lib/storage-with-ttl` reads either).
 */
export async function readPreferences(
  page: Page,
  username: string = SETTINGS_USER
): Promise<Preferences | null> {
  const key = preferencesStorageKey(username);
  const raw = await page.evaluate((k) => window.localStorage.getItem(k), key);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as
      | { value?: Preferences }
      | Preferences;
    if (parsed && typeof parsed === 'object' && 'value' in parsed && parsed.value) {
      return parsed.value as Preferences;
    }
    return parsed as Preferences;
  } catch {
    return null;
  }
}

/**
 * Wait until `user-preferences-{username}` reflects `expected`. Avoids
 * racing the Radix Select's onValueChange → useStorageWithTTL → setItem
 * pipeline. Subset match: only keys present in `expected` are checked.
 */
export async function expectPreferences(
  page: Page,
  expected: Partial<Preferences>,
  username: string = SETTINGS_USER
): Promise<void> {
  await expect
    .poll(
      async () => {
        const prefs = await readPreferences(page, username);
        if (!prefs) return null;
        const subset: Partial<Preferences> = {};
        for (const k of Object.keys(expected) as (keyof Preferences)[]) {
          subset[k] = prefs[k] as never;
        }
        return subset;
      },
      { message: `localStorage[${preferencesStorageKey(username)}] should match`, timeout: 5_000 }
    )
    .toEqual(expected);
}
