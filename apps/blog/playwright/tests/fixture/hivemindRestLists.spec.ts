import { test, expect } from '../support/fixture-proxy-test';
import { useHivemindRestStub } from '../support/hivemindRestSpec';
import { FOLLOWER } from '../support/followMuteContext';
import { UserListPage } from '../support/pages/userListPage';

/**
 * A user's muted list page reads the list from hivemind's REST GET
 * `/accounts/{name}/follow-lists/muted` (HIVEMIND_REST_NODES), as hivemindRest.spec.ts checks for
 * feeds. The recording is MUTE-05's populated muted list (socialMutedListPage_populated). Server
 * HTML only (JavaScript off), so only the servers' reads reach the stub.
 *
 * Replay:  pnpm --filter @hive/blog test:fixture -- hivemindRestLists
 */

test.use({
  fixtureTestName: 'socialMutedListPage_populated',
  authenticatedUser: {},
  javaScriptEnabled: false
});
test.describe.configure({ mode: 'serial' });

const rest = useHivemindRestStub();

test('HIVEMIND-REST-08 — the muted list page renders the same from /accounts/{name}/follow-lists/muted', async ({
  page
}) => {
  const mutedAccounts = async (url: string) => {
    const response = await page.goto(url);
    expect(response?.status(), url).toBe(200);
    return new UserListPage(page).itemNames.allInnerTexts();
  };

  const overJsonRpc = await mutedAccounts(`/@${FOLLOWER}/lists/muted`);
  expect(rest.requests, 'the server without HIVEMIND_REST_NODES makes no REST request').toEqual([]);
  const overRest = await mutedAccounts(`${rest.restBaseURL}/@${FOLLOWER}/lists/muted`);

  expect(overJsonRpc.length).toBeGreaterThan(0);
  expect(overRest).toEqual(overJsonRpc);
  expect(rest.servedRestRequests()).toContain(`/hivemind-api/accounts/${FOLLOWER}/follow-lists/muted`);
});
