import { test, expect } from '../support/fixture-proxy-test';
import { PostEditorPage } from '../support/pages/postEditorPage';
import { gotoSubmitLoggedIn } from '../support/postCreationContext';
import { settleAfterLoad } from '../support/wasmRequests';
import { recordCspViolations } from '../support/csp';

/**
 * The post editor, logged in, raises no Content-Security-Policy violation (see cspNonce.spec.ts).
 *
 * Replay:  pnpm --filter @hive/blog test:fixture -- cspEditor.spec
 */

test.use({ fixtureTestName: 'postCreate', authenticatedUser: {} });

test('CSP-05: the logged-in post editor raises no CSP violation', async ({ page }) => {
  const violations = await recordCspViolations(page);

  await gotoSubmitLoggedIn(page);
  await new PostEditorPage(page).validateDefaultPostEditorIsLoaded();
  await settleAfterLoad(page);

  expect(violations, violations.join('\n')).toEqual([]);
});
