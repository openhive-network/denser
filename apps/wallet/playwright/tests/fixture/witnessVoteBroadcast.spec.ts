import type { Server } from 'node:http';
import { test, expect, type Locator, type Page } from '@playwright/test';
import { WALLET_BASE_PATH } from '../support/basePath';
import { installBroadcastInterceptor } from '../support/broadcastInterceptor';
import { expectAccountWitnessVoteOperation } from '../support/walletOperations';
import {
  STUB_ACCOUNT,
  logInAsStubAccount,
  startWalletApiStub,
  storeStubAccountKey,
  stubWitnessVotes
} from '../support/walletApiStub';

/**
 * Voting for a witness, and removing that vote, from the witness page signs and broadcasts one
 * `account_witness_vote_operation`. STUB_ACCOUNT has already voted for VOTED_WITNESS; the other
 * reads come from the stub node (support/walletApiStub.ts). The broadcast and `verify_authority`
 * are answered by the interceptor, so the key signing it belongs to no account.
 */

const HYDRATION_TIMEOUT = 30_000;
const ATTEMPT_TIMEOUT = 2000;

/** Randomly generated, of no account. */
const ACTIVE_WIF = '5Jp5Ei5K5Yg8BpALHRsS1bnfsWu7oLUAUk77CinpCbHDsCTeJrR';

const VOTED_WITNESS = 'stub-beta';
const UNVOTED_WITNESS = 'stub-alpha';

let stub: Server;

test.beforeAll(async () => {
  stub = await startWalletApiStub(undefined, stubWitnessVotes([VOTED_WITNESS]));
});

test.afterAll(async () => {
  await new Promise((resolve) => stub.close(resolve));
});

// As anonymousNoWasm.spec.ts: without a network Chromium reports offline and React Query pauses.
test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, 'onLine', {
      configurable: true,
      get: () => true
    });
  });
});

/**
 * Opens the witness page logged in as STUB_ACCOUNT, with its active key stored unless `storeKey`
 * is false (then signing asks for it), once the page shows the account's votes.
 */
const openWitnessesPage = async (page: Page, { storeKey }: { storeKey: boolean }) => {
  const broadcasts = await installBroadcastInterceptor(page);
  await logInAsStubAccount(page, 'active');
  if (storeKey) await storeStubAccountKey(page, 'active', ACTIVE_WIF);
  await page.goto(`${WALLET_BASE_PATH}/~witnesses`);
  await expect(page.getByTestId('witness-header-vote-remaining')).toHaveText('You have 29 votes remaining.', {
    timeout: HYDRATION_TIMEOUT
  });
  return broadcasts;
};

/** The vote control of `witness`'s row. */
const witnessVote = (page: Page, witness: string) =>
  page
    .getByTestId('witness-table-body')
    .locator('tr')
    .filter({ has: page.getByTestId('witness-name-link').getByText(witness, { exact: true }) })
    .getByTestId('witness-vote');

/**
 * Repeats `vote` until `control` shows the vote pending: until the page has read STUB_ACCOUNT a
 * vote does nothing. While pending the control shows a spinner instead, so no vote is sent twice.
 */
const voteUntilPending = (control: Locator, vote: () => Promise<void>) =>
  expect(async () => {
    await vote();
    await expect(control.locator('.animate-spin')).toBeVisible({ timeout: ATTEMPT_TIMEOUT });
  }).toPass({ timeout: HYDRATION_TIMEOUT });

/** Removes the vote for VOTED_WITNESS through its confirmation dialog; resolves once it is pending. */
const removeVote = (page: Page) => {
  const control = witnessVote(page, VOTED_WITNESS);
  const confirm = page.getByRole('dialog').filter({ hasText: 'Confirm Account Witness Vote' });
  return voteUntilPending(control, async () => {
    await control.locator('svg').click({ timeout: ATTEMPT_TIMEOUT });
    await confirm.getByRole('button', { name: 'OK', exact: true }).click({ timeout: ATTEMPT_TIMEOUT });
  });
};

test.describe('Witness vote broadcast', () => {
  test('WALLET-TX-WITNESS-VOTE-01 — voting for a witness broadcasts the account, the witness and approve true', async ({
    page
  }) => {
    const broadcasts = await openWitnessesPage(page, { storeKey: true });

    const control = witnessVote(page, UNVOTED_WITNESS);
    await voteUntilPending(control, () => control.locator('svg').click({ timeout: ATTEMPT_TIMEOUT }));

    await broadcasts.waitForCount(1);
    expect(broadcasts.calls).toHaveLength(1);
    expectAccountWitnessVoteOperation(broadcasts.calls[0], {
      account: STUB_ACCOUNT,
      witness: UNVOTED_WITNESS,
      approve: true
    });
  });

  test('WALLET-TX-WITNESS-VOTE-02 — a vote for an invalid account name fails validation and broadcasts nothing', async ({
    page
  }) => {
    const broadcasts = await openWitnessesPage(page, { storeKey: true });

    const voteBox = page.getByTestId('witnesses-vote-box');
    await voteBox.getByRole('textbox').fill('Not An Account!');
    // The rejection can be too quick to catch the pending state, so the error is what shows the vote ran.
    await expect(async () => {
      await voteBox.getByRole('button').click({ timeout: ATTEMPT_TIMEOUT });
      await expect(page.getByTestId('error-toast-content').first()).toContainText('validate_account_name', {
        timeout: ATTEMPT_TIMEOUT
      });
    }).toPass({ timeout: HYDRATION_TIMEOUT });

    await expect(voteBox.getByRole('button', { name: 'vote', exact: true })).toBeEnabled();
    expect(broadcasts.calls).toHaveLength(0);
  });

  test('WALLET-TX-WITNESS-UNVOTE-01 — removing a witness vote broadcasts the account, the witness and approve false', async ({
    page
  }) => {
    const broadcasts = await openWitnessesPage(page, { storeKey: true });

    await removeVote(page);

    await broadcasts.waitForCount(1);
    expect(broadcasts.calls).toHaveLength(1);
    expectAccountWitnessVoteOperation(broadcasts.calls[0], {
      account: STUB_ACCOUNT,
      witness: VOTED_WITNESS,
      approve: false
    });
  });

  test('WALLET-TX-WITNESS-UNVOTE-02 — declining to give the active key for a vote removal broadcasts nothing', async ({
    page
  }) => {
    const broadcasts = await openWitnessesPage(page, { storeKey: false });

    await removeVote(page);
    const keyInput = page.getByPlaceholder('Your active private key');
    await expect(keyInput).toBeVisible();
    await page.keyboard.press('Escape');

    await expect(keyInput).toBeHidden();
    await expect(witnessVote(page, VOTED_WITNESS).locator('.animate-spin')).toBeHidden();
    expect(broadcasts.calls).toHaveLength(0);
  });
});
