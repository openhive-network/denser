import type { Server } from 'node:http';
import { test, expect, type Page } from '@playwright/test';
import { WALLET_BASE_PATH } from '../support/basePath';
import { installBroadcastInterceptor } from '../support/broadcastInterceptor';
import { expectUpdateProposalVotesOperation } from '../support/walletOperations';
import {
  STUB_ACCOUNT,
  logInAsStubAccount,
  startWalletApiStub,
  storeStubAccountKey,
  stubProposalVotes
} from '../support/walletApiStub';

/**
 * Voting for a proposal, and removing that vote, from the proposals page signs and broadcasts one
 * `update_proposal_votes_operation` for the proposal. Reads come from the stub node
 * (support/walletApiStub.ts), with its one proposal, STUB_PROPOSAL_ID, voted for by STUB_ACCOUNT
 * in the removal cases; the broadcast and `verify_authority` are answered by the interceptor, so
 * the key signing it belongs to no account.
 */

const HYDRATION_TIMEOUT = 30_000;
const ATTEMPT_TIMEOUT = 2000;

/** Randomly generated, of no account. */
const ACTIVE_WIF = '5Jp5Ei5K5Yg8BpALHRsS1bnfsWu7oLUAUk77CinpCbHDsCTeJrR';

/** The id of walletApiStub.ts's proposal, as wax's API JSON writes an int64. */
const STUB_PROPOSAL_ID = '7';

/** The class the vote icon has while STUB_ACCOUNT's vote for the proposal stands. */
const VOTED_CLASS = /!bg-red-500/;

// As anonymousNoWasm.spec.ts: without a network Chromium reports offline and React Query pauses.
test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, 'onLine', {
      configurable: true,
      get: () => true
    });
  });
});

/** Runs the stub node for the specs of the enclosing describe, with STUB_ACCOUNT's vote `voted`. */
const useStubWithVote = (voted: boolean) => {
  let stub: Server;
  test.beforeAll(async () => {
    stub = await startWalletApiStub(undefined, stubProposalVotes(voted));
  });
  test.afterAll(async () => {
    await new Promise((resolve) => stub.close(resolve));
  });
};

/**
 * Opens the proposals page logged in as STUB_ACCOUNT, with its active key stored unless
 * `storeKey` is false (then signing asks for it), once the vote icon shows whether it `voted`.
 */
const openProposalsPage = async (page: Page, { storeKey, voted }: { storeKey: boolean; voted: boolean }) => {
  const broadcasts = await installBroadcastInterceptor(page);
  await logInAsStubAccount(page, 'active');
  if (storeKey) await storeStubAccountKey(page, 'active', ACTIVE_WIF);
  await page.goto(`${WALLET_BASE_PATH}/proposals`);
  // Until then the vote icon is the logged-out one, which opens the login dialog.
  await expect(page.getByTestId('profile-avatar-button')).toBeVisible({ timeout: HYDRATION_TIMEOUT });
  const icon = page.getByTestId('voting-button-icon');
  await (voted ? expect(icon).toHaveClass(VOTED_CLASS) : expect(icon).not.toHaveClass(VOTED_CLASS));
  return broadcasts;
};

/** Clicks the proposal's vote icon; resolves once the vote is pending (the icon is a spinner then). */
const toggleVote = (page: Page) => {
  const proposal = page.getByTestId('proposal-list-item');
  return expect(async () => {
    await proposal.getByTestId('voting-button-icon').click({ timeout: ATTEMPT_TIMEOUT });
    await expect(proposal.locator('.animate-spin')).toBeVisible({ timeout: ATTEMPT_TIMEOUT });
  }).toPass({ timeout: HYDRATION_TIMEOUT });
};

/** Dismisses the prompt for the active key that signing opens; resolves once the vote has given up. */
const declineKeyPrompt = async (page: Page) => {
  const keyInput = page.getByPlaceholder('Your active private key');
  await expect(keyInput).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(keyInput).toBeHidden();
  await expect(page.getByTestId('voting-button-icon')).toBeVisible();
};

test.describe('Proposal vote broadcast: voting', () => {
  useStubWithVote(false);

  test('WALLET-TX-PROPOSAL-VOTE-01 — voting for a proposal broadcasts the voter, the proposal id and approve true', async ({
    page
  }) => {
    const broadcasts = await openProposalsPage(page, { storeKey: true, voted: false });

    await toggleVote(page);

    await broadcasts.waitForCount(1);
    expect(broadcasts.calls).toHaveLength(1);
    expectUpdateProposalVotesOperation(broadcasts.calls[0], {
      voter: STUB_ACCOUNT,
      proposal_ids: [STUB_PROPOSAL_ID],
      approve: true,
      extensions: []
    });
  });

  test('WALLET-TX-PROPOSAL-VOTE-02 — declining to give the active key for a vote broadcasts nothing', async ({
    page
  }) => {
    const broadcasts = await openProposalsPage(page, { storeKey: false, voted: false });

    await toggleVote(page);
    await declineKeyPrompt(page);

    await expect(page.getByTestId('voting-button-icon')).not.toHaveClass(VOTED_CLASS);
    expect(broadcasts.calls).toHaveLength(0);
  });
});

test.describe('Proposal vote broadcast: removing the vote', () => {
  useStubWithVote(true);

  test('WALLET-TX-PROPOSAL-UNVOTE-01 — removing a proposal vote broadcasts the voter, the proposal id and approve false', async ({
    page
  }) => {
    const broadcasts = await openProposalsPage(page, { storeKey: true, voted: true });

    await toggleVote(page);

    await broadcasts.waitForCount(1);
    expect(broadcasts.calls).toHaveLength(1);
    expectUpdateProposalVotesOperation(broadcasts.calls[0], {
      voter: STUB_ACCOUNT,
      proposal_ids: [STUB_PROPOSAL_ID],
      approve: false,
      extensions: []
    });
  });

  test('WALLET-TX-PROPOSAL-UNVOTE-02 — declining to give the active key for a vote removal broadcasts nothing', async ({
    page
  }) => {
    const broadcasts = await openProposalsPage(page, { storeKey: false, voted: true });

    await toggleVote(page);
    await declineKeyPrompt(page);

    await expect(page.getByTestId('voting-button-icon')).toHaveClass(VOTED_CLASS);
    expect(broadcasts.calls).toHaveLength(0);
  });
});
