import { test, expect } from '../support/fixture-proxy-test';
import { CHUNK_MARKERS } from '../support/initialChunks';
import { PostEditorPage } from '../support/pages/postEditorPage';
import { fillPostBody, gotoSubmitLoggedIn } from '../support/postCreationContext';
import {
  CODE_BLOCKS_MARKDOWN,
  collectScriptsContaining,
  expectCodeBlocksMarkdownRendered,
  expectThemeSwitchRecolours,
  highlightedBlocks
} from '../support/syntaxHighlightContext';

/**
 * The post editor's live preview renders in the browser, so the client loads the syntax
 * highlighter (its own chunk) once the typed body has a tagged code block, then highlights it the
 * way the server does. Untagged, unknown-language and inline code stay plain; markup in a
 * highlighted block stays text.
 *
 * Fixtures: reuses `postCreate` (only the /submit.html page load hits the API).
 *
 * Replay:  pnpm --filter @hive/blog test:fixture -- syntaxHighlightEditor
 */

test.use({ fixtureTestName: 'postCreate', authenticatedUser: {} });

test('HL-03 — the editor preview highlights tagged code blocks', async ({ page }) => {
  const shikiScripts = collectScriptsContaining(page, CHUNK_MARKERS.shiki);
  await gotoSubmitLoggedIn(page);
  const editor = new PostEditorPage(page);
  await editor.validateDefaultPostEditorIsLoaded();
  await page.waitForLoadState('networkidle');
  expect(await shikiScripts(), 'nothing loads Shiki before the body has a tagged block').toEqual([]);

  await fillPostBody(page, CODE_BLOCKS_MARKDOWN);

  await expectCodeBlocksMarkdownRendered(editor.getPreviewContainer);
  expect(await shikiScripts(), 'the preview loaded Shiki on demand').not.toEqual([]);
  await expectThemeSwitchRecolours(highlightedBlocks(editor.getPreviewContainer).first());
});
