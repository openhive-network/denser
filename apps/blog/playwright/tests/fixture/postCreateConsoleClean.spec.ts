import { test, expect } from '../support/fixture-proxy-test';
import { PostEditorPage } from '../support/pages/postEditorPage';
import { gotoSubmitLoggedIn } from '../support/postCreationContext';
import { collectConsoleProblems } from '../support/uiPrimitives';

/**
 * Post creation — opening the editor logs no console error (POST-CONSOLE-01).
 *
 * The editor's loading placeholder renders the shared CircleSpinner. Its
 * styled-components wrapper used to forward the kit's `sizeUnit` prop onto a
 * <div>, which React reports as an unknown-prop console.error. React only
 * emits that warning in development builds, so this spec catches that
 * regression on the dev stack (`.aidev/dev-stack-spec.sh`); on the production
 * fixture build it still guards every other console error, warning or page error
 * raised while the editor opens.
 *
 * Replay:  pnpm --filter @hive/blog test:fixture -- postCreateConsoleClean.spec
 */

test.use({ fixtureTestName: 'postCreate', authenticatedUser: {} });

test.describe('Post creation — console (§2.1)', () => {
  test('POST-CONSOLE-01: opening the post editor logs no console problem', async ({ page }) => {
    const problems = collectConsoleProblems(page);

    await gotoSubmitLoggedIn(page);
    const editor = new PostEditorPage(page);
    await editor.validateDefaultPostEditorIsLoaded();

    expect(problems, problems.join('\n')).toEqual([]);
  });
});
