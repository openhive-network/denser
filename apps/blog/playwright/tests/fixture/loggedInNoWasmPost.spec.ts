import { test } from '../support/fixture-proxy-test';
import { POST_DETAIL_AUTHOR, POST_DETAIL_COMMUNITY, POST_DETAIL_PERMLINK } from '../support/postDisplayContext';
import { expectNoSigningStackOnLoggedInLoad } from '../support/signingStack';

/** A logged-in reader of a post downloads neither wax's wasm nor the signing stack. */

test.use({ fixtureTestName: 'loggedInPostDetail', authenticatedUser: {} });

test('LOGGED-WASM-02: a logged-in post page requests no .wasm and loads no signing stack', async ({ page }) => {
  await expectNoSigningStackOnLoggedInLoad(page, `/${POST_DETAIL_COMMUNITY}/@${POST_DETAIL_AUTHOR}/${POST_DETAIL_PERMLINK}/`);
});
