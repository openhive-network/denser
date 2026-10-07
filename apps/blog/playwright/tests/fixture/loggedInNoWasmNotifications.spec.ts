import { test } from '../support/fixture-proxy-test';
import { expectNoSigningStackOnLoggedInLoad } from '../support/signingStack';

/**
 * A logged-in user's notifications page downloads neither wax's wasm nor the signing stack; only
 * "Mark all as read", which signs, would load it.
 */

const OWNER = 'gtg';

test.use({ fixtureTestName: 'notifications', authenticatedUser: { username: OWNER } });

test('LOGGED-WASM-04: logged-in notifications request no .wasm and load no signing stack', async ({ page }) => {
  await expectNoSigningStackOnLoggedInLoad(page, `/@${OWNER}/notifications`);
});
