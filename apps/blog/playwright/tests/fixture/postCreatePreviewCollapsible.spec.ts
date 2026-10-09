import type { Page } from '@playwright/test';
import { test, expect } from '../support/fixture-proxy-test';
import { PostEditorPage } from '../support/pages/postEditorPage';
import { PostPage } from '../support/pages/postPage';
import { fillPostBody, gotoSubmitLoggedIn } from '../support/postCreationContext';
import { assertDefined } from '../support/testHelpers';

/**
 * Post creation — preview rendering of link order and collapsible
 * sections. Offline port of e2e/editorPreview.spec.ts, which needs a
 * live login; the live spec stays as an optional smoke test.
 *
 * Re-uses the `postCreate` fixture set: only the /submit.html page load
 * hits RPCs, the preview renders client-side.
 *
 * Replay:  pnpm --filter @hive/blog test:fixture -- postCreatePreviewCollapsible.spec
 */

test.use({ fixtureTestName: 'postCreate', authenticatedUser: {} });

const TEXT_BEFORE_LINK_BODY =
  '### A... Collection of Hive Development Contributions\n' +
  'At the 5-year anniversary of Hive, @thebeedevs published a ' +
  '[list of their contributions](https://peakd.com/hive-139531/@thebeedevs/hive-is-five) ' +
  'to important projects for Hive. Among them, hAIve - the new ' +
  'AI-powered search engine they worked on, which you can test on a development ' +
  'version of Hive.blog they made public. Sadly, when I looked for ' +
  '"adrian\'s lenses" or anything related (found in titles, bodies, and tags of ' +
  'these and other posts), I didn\'t find any post of mine.';

const DETAILS_BODY = [
  '<details>',
  '<summary>Click to expand</summary>',
  '',
  'These details remain hidden until expanded.',
  '',
  '</details>'
].join('\n');

const SPOILER_BODY = '>! [Hidden Spoiler Text] This is the spoiler content.';

async function openEditorWithBody(page: Page, body: string) {
  await gotoSubmitLoggedIn(page);
  await new PostEditorPage(page).validateDefaultPostEditorIsLoaded();
  await fillPostBody(page, body);
  const postPage = new PostPage(page);
  await expect(postPage.articleBody).toBeVisible();
  return postPage.articleBody;
}

test.describe('Post creation — preview links and collapsibles (§2.1)', () => {
  test('text before a markdown link stays before the link in the preview', async ({ page }) => {
    const preview = await openEditorWithBody(page, TEXT_BEFORE_LINK_BODY);

    // The preview is debounced behind typing: wait for the last words before reading it.
    await expect(preview).toContainText('any post of mine.');
    await expect(preview.locator('a', { hasText: 'list of their contributions' })).toBeVisible();
    const previewText = await preview.textContent();
    assertDefined(previewText, 'Preview should have text content');
    const textBeforeLink = previewText.indexOf('At the 5-year anniversary');
    const linkText = previewText.indexOf('list of their contributions');

    expect(textBeforeLink, 'Text before link should exist in preview').toBeGreaterThanOrEqual(0);
    expect(textBeforeLink, 'Text before a link must appear before the link text').toBeLessThan(linkText);
  });

  test('details section renders collapsed and toggles on summary click', async ({ page }) => {
    const preview = await openEditorWithBody(page, DETAILS_BODY);

    const details = preview.locator('details');
    const summary = details.locator('summary');
    const content = details.getByText('These details remain hidden until expanded.');

    await expect(summary).toHaveText('Click to expand');
    await expect(content).toBeHidden();

    await summary.click();
    await expect(content).toBeVisible();

    await summary.click();
    await expect(content).toBeHidden();
  });

  test('spoiler syntax renders as a collapsible with its custom title', async ({ page }) => {
    const preview = await openEditorWithBody(page, SPOILER_BODY);

    const details = preview.locator('details');
    const summary = details.locator('summary');
    const content = details.getByText('This is the spoiler content.');

    await expect(summary).toContainText('Hidden Spoiler Text');
    await expect(content).toBeHidden();

    await summary.click();
    await expect(content).toBeVisible();
  });
});
