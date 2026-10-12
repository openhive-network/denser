import { test, expect } from '../support/fixture-proxy-test';
import type { Locator, Page } from '@playwright/test';
import { PostPage } from '../support/pages/postPage';
import { TIMEOUTS } from '../support/constants';
import { pressUntilOpen } from '../support/uiPrimitives';

/**
 * The post footer's share controls (Facebook, Twitter, LinkedIn, Reddit, "Share this post") used
 * from the keyboard: each is one named button reached by Tab in visual order, Enter/Space opens
 * the share dialog and Esc gives focus back to its trigger, and Enter on a network opens that
 * network's share page for the post's own URL.
 *
 * `window.open` is replaced by a recorder, so no popup leaves the offline run.
 *
 * Tagged @basepath: .aidev/run-fixture-e2e.sh runs it a second time against a build served under
 * FIXTURE_BASE_PATH, whose blog URL carries the base path; the shared post URL has to keep it.
 *
 * Fixtures: reuses `postDetail` (anonymous view of the same post).
 *
 * Replay:  pnpm --filter @hive/blog test:fixture -- postShareControls
 */

test.use({ fixtureTestName: 'postDetail' });

declare global {
  interface Window {
    sharedUrls?: string[];
  }
}

const BASE_PATH = process.env.FIXTURE_BASE_PATH ?? '';
const POST_PATH = '/hive-160391/@gtg/hive-hardfork-25-jump-starter-kit';

interface ShareNetwork {
  name: string;
  control: (postPage: PostPage) => Locator;
  shareOrigin: string;
  postUrlParam: string;
}

const NETWORKS: ShareNetwork[] = [
  {
    name: 'Facebook',
    control: (p) => p.facebookIcon,
    shareOrigin: 'https://www.facebook.com',
    postUrlParam: 'u'
  },
  { name: 'Twitter', control: (p) => p.twitterIcon, shareOrigin: 'http://twitter.com', postUrlParam: 'url' },
  {
    name: 'LinkedIn',
    control: (p) => p.linkedinIcon,
    shareOrigin: 'https://www.linkedin.com',
    postUrlParam: 'url'
  },
  { name: 'Reddit', control: (p) => p.redditIcon, shareOrigin: 'https://www.reddit.com', postUrlParam: 'url' }
];

/** Replaces `window.open` with a recorder of the URLs it is called with. */
async function recordWindowOpens(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const opened: string[] = [];
    window.sharedUrls = opened;
    window.open = (url?: string | URL) => {
      opened.push(String(url));
      return null;
    };
  });
}

function recordedWindowOpens(page: Page): Promise<string[]> {
  return page.evaluate(() => window.sharedUrls ?? []);
}

async function gotoPost(page: Page): Promise<PostPage> {
  await page.goto(`${BASE_PATH}${POST_PATH}/`, { waitUntil: 'domcontentloaded' });
  const postPage = new PostPage(page);
  await postPage.waitForPostHydration();
  return postPage;
}

test.describe('Post footer share controls — keyboard', { tag: '@basepath' }, () => {
  test('SHARE-KBD-01 — Tab reaches each share control once, in visual order, as a named button', async ({
    page
  }) => {
    const postPage = await gotoPost(page);
    const controls: [Locator, string][] = [
      ...NETWORKS.map((network): [Locator, string] => [network.control(postPage), `Share on ${network.name}`]),
      [postPage.sharePostBtn, 'Share this post']
    ];

    for (const [control, name] of controls) {
      await expect(control).toHaveRole('button');
      await expect(control).toHaveAccessibleName(name);
      await expect(control.locator('svg')).toHaveAttribute('aria-hidden', 'true');
    }

    await controls[0][0].focus();
    for (const [index, [control]] of controls.entries()) {
      if (index > 0) await page.keyboard.press('Tab');
      await expect(control).toBeFocused();
    }
    await page.keyboard.press('Tab');
    for (const [control] of controls) {
      await expect(control).not.toBeFocused();
    }
  });

  test('SHARE-KBD-02 — Enter and Space open the share dialog, Esc closes it and refocuses the trigger', async ({
    page
  }) => {
    const postPage = await gotoPost(page);
    const trigger = postPage.sharePostBtn;
    const dialog = page.getByTestId('share-post-dialog');

    for (const key of ['Enter', ' ']) {
      await pressUntilOpen(trigger, key, dialog);
      await page.keyboard.press('Escape');
      await expect(dialog).toBeHidden();
      await expect(trigger).toBeFocused();
    }
  });

  test("SHARE-KBD-03 — Enter on a network opens its share page for the post's URL", async ({ page }) => {
    await recordWindowOpens(page);
    const postPage = await gotoPost(page);

    for (const network of NETWORKS) {
      const control = network.control(postPage);
      await expect(async () => {
        await control.focus();
        await control.press('Enter');
        expect(await recordedWindowOpens(page)).toHaveLength(NETWORKS.indexOf(network) + 1);
      }).toPass({ timeout: TIMEOUTS.HYDRATION });

      const opened = new URL((await recordedWindowOpens(page)).at(-1) ?? '');
      expect(opened.origin, network.name).toBe(network.shareOrigin);
      const sharedPostUrl = new URL(opened.searchParams.get(network.postUrlParam) ?? '');
      expect(sharedPostUrl.pathname, network.name).toBe(`${BASE_PATH}${POST_PATH}`);
    }
  });
});
