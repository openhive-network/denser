import { test, expect } from '../support/fixture-proxy-test';
import {
  installBroadcastInterceptor,
  expectCommentOperation
} from '../support/fixture-auth/broadcast-interceptor';
import { PostEditorPage } from '../support/pages/postEditorPage';
import { PostPage } from '../support/pages/postPage';
import {
  POST_AUTHOR,
  DEFAULT_TAG,
  fillPostBody,
  gotoSubmitLoggedIn,
  submitPost
} from '../support/postCreationContext';

/**
 * Post creation — body content variants (§2.1 POST-11/12/13/14).
 *
 * All four tests share the same submit flow as POST-01; they only
 * differ by what's in the post body. The intent: prove that the app
 * preserves the user-typed body bytes through to the broadcast
 * (TX-01 `comment.body`) and renders them on the destination post
 * page after the redirect.
 *
 * - POST-11: `@username` mention is preserved in body.
 * - POST-12: raw `<a href>` HTML markup is preserved (not stripped).
 * - POST-13: emoji codepoints survive the round-trip.
 * - POST-14: long bodies are not truncated.
 *
 * Each test uses a unique title so its `bridge.get_post_header`
 * uniqueness check has its own recorded fixture entry. They share the
 * `postCreateBodyVariants` fixture set.
 *
 * Record:  FIXTURE_UPSTREAM=api.openhive.network FIXTURE_MODE=record \
 *          pnpm --filter @hive/blog test:fixture -- postCreateBodyVariants.spec
 * Replay:  pnpm --filter @hive/blog test:fixture -- postCreateBodyVariants.spec
 */

test.use({
  fixtureTestName: 'postCreateBodyVariants',
  authenticatedUser: {}
});

interface BodyVariantCase {
  testId: 'POST-11' | 'POST-12' | 'POST-13' | 'POST-14';
  description: string;
  title: string;
  body: string;
  /** Bare slug — used both as a permlink-end-of-string regex for
   * expectCommentOperation and as a substring matcher inside the
   * `?pending=1` post-redirect URL. */
  permlinkSlug: string;
}

const LONG_PARAGRAPH =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do ' +
  'eiusmod tempor incididunt ut labore et dolore magna aliqua. ';

const CASES: BodyVariantCase[] = [
  {
    testId: 'POST-11',
    description: 'create post with @username mention',
    title: 'POST-11 fixture-test mention post',
    body: 'Hello @gtg, take a look at this content.',
    permlinkSlug: 'post-11-fixture-test-mention-post'
  },
  {
    testId: 'POST-12',
    description: 'create post with raw HTML link',
    title: 'POST-12 fixture-test html link post',
    body: 'Visit <a href="https://example.com">our site</a> for more.',
    permlinkSlug: 'post-12-fixture-test-html-link-post'
  },
  {
    testId: 'POST-13',
    description: 'create post with emoji in body',
    title: 'POST-13 fixture-test emoji post',
    body: 'Welcome to the new post! Cheers and stay awesome.',
    // emoji suffix appended below — keeping the literal out of the
    // source for editors that can't render astral codepoints.
    permlinkSlug: 'post-13-fixture-test-emoji-post'
  },
  {
    testId: 'POST-14',
    description: 'create post with very long body',
    title: 'POST-14 fixture-test long text post',
    // ~1800 chars — long enough to assert "no truncation" without
    // pushing the per-test timeout via per-char keyboard.type.
    body: LONG_PARAGRAPH.repeat(15),
    permlinkSlug: 'post-14-fixture-test-long-text-post'
  }
];

const EMOJI_SUFFIX = ' \u{1F389} ❤️ ✨';

test.describe('Post creation — body variants (§2.1)', () => {
  for (const c of CASES) {
    test(`${c.testId}: ${c.description}`, async ({ page }) => {
      const broadcast = await installBroadcastInterceptor(page, undefined, {
        confirmInBlock: true
      });
      await gotoSubmitLoggedIn(page);
      const editor = new PostEditorPage(page);
      await editor.validateDefaultPostEditorIsLoaded();

      const expectedBody = c.testId === 'POST-13' ? c.body + EMOJI_SUFFIX : c.body;

      await editor.getPostTitleInput.fill(c.title);
      await fillPostBody(page, expectedBody);
      await editor.getEnterYourTagsInput.fill(DEFAULT_TAG);
      await submitPost(page);

      await broadcast.waitForCount(1);
      expectCommentOperation(broadcast.calls[0], {
        parent_author: '',
        parent_permlink: DEFAULT_TAG,
        author: POST_AUTHOR,
        body: expectedBody,
        permlinkPattern: new RegExp(`${c.permlinkSlug}$`)
      });

      await expect(editor.getPostSubmittedToast).toBeVisible();
      await page.waitForURL(new RegExp(`${c.permlinkSlug}.*pending=1`));
      await expect(new PostPage(page).articleTitle).toHaveText(c.title);
    });
  }
});
