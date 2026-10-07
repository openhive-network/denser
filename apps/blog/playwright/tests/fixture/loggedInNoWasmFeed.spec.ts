import { test } from '../support/fixture-proxy-test';
import { expectNoSigningStackOnLoggedInLoad } from '../support/signingStack';

/**
 * A logged-in reader of a feed downloads neither wax's wasm nor the signing stack: being logged in
 * (the `observer` cookie and the localStorage `user`) loads nothing that signs; the first action
 * that signs does (loggedInVoteSigningStack.spec.ts).
 */

test.use({ fixtureTestName: 'loggedInHomeFeeds', authenticatedUser: {} });

test('LOGGED-WASM-01: logged-in /trending requests no .wasm and loads no signing stack', async ({ page }) => {
  await expectNoSigningStackOnLoggedInLoad(page, '/trending');
});
