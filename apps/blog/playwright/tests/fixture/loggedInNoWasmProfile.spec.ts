import { test } from '../support/fixture-proxy-test';
import { OBSERVER } from '../support/postDisplayContext';
import { expectNoSigningStackOnLoggedInLoad } from '../support/signingStack';

/** A logged-in user's own profile (manabars, follow lists) downloads neither wax's wasm nor the signing stack. */

test.use({ fixtureTestName: 'loggedInUserProfile', authenticatedUser: {} });

test('LOGGED-WASM-03: the logged-in own profile requests no .wasm and loads no signing stack', async ({ page }) => {
  await expectNoSigningStackOnLoggedInLoad(page, `/@${OBSERVER}`);
});
