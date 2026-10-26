import { test, expect } from '../support/fixture-proxy-test';
import { PostPage } from '../support/pages/postPage';
import { keyMember, mockPasskeyGateway, openLoginDialog, ROOT_KEY, SIGNER } from '../support/litePasskeyContext';

/**
 * The Login dialog on a node without lite support, on the `postDetail` recording (its node answers
 * `lite.get_info` as a node without lite support does). The gateway relays update_authority; the
 * node, not the gateway, keeps the lite sign-in link out.
 *
 *   LITE-ID-10 – a node without lite support leaves the Login dialog without the lite link
 *
 * The lite-aware LITE-ID-10 cases are in liteIdentityPasskeySignIn.spec.ts.
 */

test.use({ fixtureTestName: 'postDetail' });

const POST_URL = '/hive-160391/@gtg/hive-hardfork-25-jump-starter-kit/';

test('LITE-ID-10: a node without lite support leaves the Login dialog without the lite link', async ({ page }) => {
  await mockPasskeyGateway(page, 'lite-smoke-1016', {
    owner: [keyMember(ROOT_KEY, { meta: { kind: 'passkey', signer: SIGNER } })],
    posting: []
  });
  await page.goto(POST_URL, { waitUntil: 'domcontentloaded' });
  await new PostPage(page).waitForPostHydration();

  const login = await openLoginDialog(page);
  await page.waitForTimeout(1000);
  await expect(login.getByTestId('login-lite-passkey')).toHaveCount(0);
});
