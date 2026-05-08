import { test, expect } from '../support/fixture-proxy-test';
import { PostEditorPage } from '../support/pages/postEditorPage';
import {
  fillPostBody,
  gotoSubmitLoggedIn
} from '../support/postCreationContext';

/**
 * Post creation — preview rendering (§2.1 POST-07).
 *
 * The editor's right pane (`preview-container`) renders the typed
 * markdown live — same renderer the post detail page uses. POST-07
 * exercises a representative slice of markdown features (heading,
 * emphasis, list, blockquote, code, link, table) and asserts each
 * lands in the preview as the expected HTML element. No broadcast,
 * no submit — re-uses the existing `postCreate` fixture set since
 * the only RPCs hit are the /submit.html page load.
 *
 * Replay:  pnpm --filter @hive/blog test:fixture -- postCreatePreview.spec
 */

test.use({ fixtureTestName: 'postCreate', authenticatedUser: {} });

const PREVIEW_BODY = [
  '# Heading 1',
  '## Heading 2',
  '',
  '**bold** and *italic* text.',
  '',
  '- list item 1',
  '- list item 2',
  '',
  '> blockquote text',
  '',
  '`inline code`',
  '',
  '[link](https://example.com)'
].join('\n');

test.describe('Post creation — preview (§2.1)', () => {
  test('POST-07: preview renders typed markdown side-by-side', async ({
    page
  }) => {
    await gotoSubmitLoggedIn(page);
    const editor = new PostEditorPage(page);
    await editor.validateDefaultPostEditorIsLoaded();

    // Side-by-side preview is on by default for /submit.html.
    await expect(editor.getPreviewContainer).toBeVisible();

    await fillPostBody(page, PREVIEW_BODY);

    const preview = editor.getPreviewContainer;
    await expect(preview.locator('h1', { hasText: 'Heading 1' })).toBeVisible();
    await expect(preview.locator('h2', { hasText: 'Heading 2' })).toBeVisible();
    await expect(preview.locator('strong', { hasText: 'bold' })).toBeVisible();
    await expect(preview.locator('em', { hasText: 'italic' })).toBeVisible();
    await expect(
      preview.locator('ul > li', { hasText: 'list item 1' })
    ).toBeVisible();
    await expect(
      preview.locator('blockquote', { hasText: 'blockquote text' })
    ).toBeVisible();
    await expect(preview.locator('code', { hasText: 'inline code' })).toBeVisible();
    await expect(
      preview.locator('a[href="https://example.com"]', { hasText: 'link' })
    ).toBeVisible();
  });
});
