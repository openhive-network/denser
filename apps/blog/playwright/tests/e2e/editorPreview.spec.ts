import { expect, test } from '@playwright/test';
import { PostPage } from '../support/pages/postPage';
import { chromiumOnly, loginAndOpenEditor, hasEditorCredentials, assertDefined } from '../support/testHelpers';

/**
 * Tests for the post editor preview panel:
 * text-before-link order, collapsible sections.
 */

test.describe('Editor preview - text before link order', () => {
  test.skip(() => !hasEditorCredentials(), 'CI_TEST_USER and CI_TEST_USER_WIF_POSTING are required');

  test('text before a markdown link is not moved to the end of preview', async ({ page, browserName }) => {
    chromiumOnly(browserName);

    const { postEditorPage } = await loginAndOpenEditor(page);
    const postPage = new PostPage(page);

    // Type markdown with text before a link
    const markdownContent =
      '### A... Collection of Hive Development Contributions\n' +
      'At the 5-year anniversary of Hive, @thebeedevs published a ' +
      '[list of their contributions](https://peakd.com/hive-139531/@thebeedevs/hive-is-five) ' +
      'to important projects for Hive. Among them, hAIve - the new ' +
      'AI-powered search engine they worked on, which you can test on a development ' +
      'version of Hive.blog they made public. Sadly, when I looked for ' +
      '"adrian\'s lenses" or anything related (found in titles, bodies, and tags of ' +
      'these and other posts), I didn\'t find any post of mine.';

    await postEditorPage.getEditorContentTextarea.fill(markdownContent);
    await expect(postPage.articleBody).toBeVisible();

    // Verify text order in preview: "At the 5-year" must appear BEFORE "list of their contributions"
    const previewText = await postPage.articleBody.textContent();
    assertDefined(previewText, 'Preview should have text content');
    const textBeforeLink = previewText.indexOf('At the 5-year anniversary');
    const linkText = previewText.indexOf('list of their contributions');

    expect(textBeforeLink, 'Text before link should exist in preview').toBeGreaterThanOrEqual(0);
    expect(linkText, 'Link text should exist in preview').toBeGreaterThanOrEqual(0);
    expect(
      textBeforeLink,
      'Text before a link must appear before the link text in preview'
    ).toBeLessThan(linkText);
  });
});

test.describe('Editor preview - collapsible sections', () => {
  test.skip(() => !hasEditorCredentials(), 'CI_TEST_USER and CI_TEST_USER_WIF_POSTING are required');

  test('collapsible details section renders and toggles in preview', async ({ page, browserName }) => {
    chromiumOnly(browserName);

    const { postEditorPage } = await loginAndOpenEditor(page);
    const postPage = new PostPage(page);

    const markdownContent = [
      '<details>',
      '<summary>Click to expand</summary>',
      '',
      'These details remain hidden until expanded.',
      '',
      '</details>'
    ].join('\n');

    await postEditorPage.getEditorContentTextarea.fill(markdownContent);
    await expect(postPage.articleBody).toBeVisible();

    const details = postPage.articleBody.locator('details');
    const summary = details.locator('summary');
    const content = details.getByText('These details remain hidden until expanded.');

    await expect(details).toBeAttached();
    await expect(summary).toHaveText('Click to expand');

    // Content should be hidden when collapsed (native <details> behavior)
    await expect(content).not.toBeVisible();

    // Click summary to expand
    await summary.click();
    await expect(content).toBeVisible();

    // Click summary again to collapse
    await summary.click();
    await expect(content).not.toBeVisible();
  });

  test('spoiler syntax renders as collapsible with custom title', async ({ page, browserName }) => {
    chromiumOnly(browserName);

    const { postEditorPage } = await loginAndOpenEditor(page);
    const postPage = new PostPage(page);

    const markdownContent = '>! [Hidden Spoiler Text] This is the spoiler content.';

    await postEditorPage.getEditorContentTextarea.fill(markdownContent);
    await expect(postPage.articleBody).toBeVisible();

    const details = postPage.articleBody.locator('details');
    const summary = details.locator('summary');
    const content = details.getByText('This is the spoiler content.');

    await expect(details).toBeAttached();
    await expect(summary).toContainText('Hidden Spoiler Text');

    // Content should be hidden when collapsed
    await expect(content).not.toBeVisible();

    // Click summary to expand
    await summary.click();
    await expect(content).toBeVisible();
  });
});
