import type { Server } from 'node:http';
import { test, expect, type Locator, type Page } from '@playwright/test';
import { WALLET_BASE_PATH } from '../support/basePath';
import { installBroadcastInterceptor } from '../support/broadcastInterceptor';
import { confirmBroadcastsInBlocks } from '../support/blockConfirmation';
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
const openWitnessesPage = async (
  page: Page,
  { storeKey, confirmInBlocks = false, votesRemaining = 'You have 29 votes remaining.' }: {
    storeKey: boolean;
    confirmInBlocks?: boolean;
    votesRemaining?: string;
  }
) => {
  const broadcasts = await installBroadcastInterceptor(page);
  if (confirmInBlocks) await confirmBroadcastsInBlocks(page);
  await logInAsStubAccount(page, 'active');
  if (storeKey) await storeStubAccountKey(page, 'active', ACTIVE_WIF);
  await page.goto(`${WALLET_BASE_PATH}/~witnesses`);
  await expect(page.getByTestId('witness-header-vote-remaining')).toHaveText(votesRemaining, {
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

/** The witness page's texts for STUB_ACCOUNT, and the success toasts of a vote and a removal, in each locale checked. */
const WITNESS_VOTE_LOCALES = [
  {
    locale: 'en',
    votesRemaining: 'You have 29 votes remaining.',
    removeTitle: `Remove your vote for witness @${VOTED_WITNESS}`,
    removeConfirmation: `Remove your vote for @${VOTED_WITNESS}?`,
    cancel: 'Cancel',
    voted: `Voted for witness @${UNVOTED_WITNESS}`,
    removed: `Removed your vote for witness @${VOTED_WITNESS}`
  },
  {
    locale: 'pl',
    votesRemaining: 'Pozostało ci 29 głosów.',
    removeTitle: `Wycofaj głos na świadka @${VOTED_WITNESS}`,
    removeConfirmation: `Wycofać swój głos na @${VOTED_WITNESS}?`,
    cancel: 'Anuluj',
    voted: `Oddano głos na świadka @${UNVOTED_WITNESS}`,
    removed: `Wycofano głos na świadka @${VOTED_WITNESS}`
  }
];

/**
 * Removes the vote for VOTED_WITNESS through its confirmation dialog, which names the witness;
 * resolves once it is pending.
 */
const removeVote = (page: Page, labels = WITNESS_VOTE_LOCALES[0]) => {
  const control = witnessVote(page, VOTED_WITNESS);
  const confirm = page
    .getByRole('dialog')
    .filter({ hasText: labels.removeTitle })
    .filter({ hasText: labels.removeConfirmation });
  return voteUntilPending(control, async () => {
    await control.locator('svg').click({ timeout: ATTEMPT_TIMEOUT });
    await confirm.getByRole('button', { name: 'OK', exact: true }).click({ timeout: ATTEMPT_TIMEOUT });
  });
};

/** The page's toasts holding `text`: the notification list's items, not the announcement Radix reads out. */
const toastsWith = (page: Page, text: string) => page.getByRole('listitem').filter({ hasText: text });

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

  test('WALLET-TX-WITNESS-VOTE-03 — the vote control is a named toggle button that Space votes with', async ({
    page
  }) => {
    const broadcasts = await openWitnessesPage(page, { storeKey: true });

    const button = page.getByRole('button', { name: `Vote for witness ${UNVOTED_WITNESS}`, exact: true });
    await expect(button).toHaveAttribute('aria-pressed', 'false');
    await expect(
      page.getByRole('button', { name: `Remove vote for witness ${VOTED_WITNESS}`, exact: true })
    ).toHaveAttribute('aria-pressed', 'true');
    await voteUntilPending(witnessVote(page, UNVOTED_WITNESS), async () => {
      await button.focus();
      await page.keyboard.press('Space');
    });

    await broadcasts.waitForCount(1);
    expectAccountWitnessVoteOperation(broadcasts.calls[0], {
      account: STUB_ACCOUNT,
      witness: UNVOTED_WITNESS,
      approve: true
    });
    await expect(button).toBeFocused();
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
      await expect(page.getByTestId('error-toast-content').first()).toContainText(
        "Account name 'Not An Account!' is not valid",
        { timeout: ATTEMPT_TIMEOUT }
      );
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

  test('WALLET-TX-WITNESS-UNVOTE-02 — the key prompt after the confirmation names the removal, and declining it broadcasts nothing', async ({
    page
  }) => {
    const broadcasts = await openWitnessesPage(page, { storeKey: false });

    await removeVote(page);
    const keyInput = page.getByPlaceholder('Your active private key');
    await expect(keyInput).toBeVisible();
    await expect(page.getByTestId('password-form-operation')).toHaveText(
      `Sign: remove witness vote for @${VOTED_WITNESS}`
    );
    await page.keyboard.press('Escape');

    await expect(keyInput).toBeHidden();
    await expect(witnessVote(page, VOTED_WITNESS).locator('.animate-spin')).toBeHidden();
    expect(broadcasts.calls).toHaveLength(0);
  });

  for (const labels of WITNESS_VOTE_LOCALES) {
    test.describe(`in ${labels.locale}`, () => {
      test.beforeEach(async ({ context, baseURL }) => {
        await context.addCookies([{ name: 'NEXT_LOCALE', value: labels.locale, url: baseURL }]);
      });

      test(`WALLET-TX-WITNESS-VOTE-04-${labels.locale} — a vote included in a block shows one success toast naming the witness`, async ({
        page
      }) => {
        const broadcasts = await openWitnessesPage(page, { storeKey: true, confirmInBlocks: true, ...labels });

        const control = witnessVote(page, UNVOTED_WITNESS);
        await voteUntilPending(control, () => control.locator('svg').click({ timeout: ATTEMPT_TIMEOUT }));

        await broadcasts.waitForCount(1);
        await expect(toastsWith(page, labels.voted)).toHaveCount(1);
        await expect(page.getByTestId('error-toast-content')).toHaveCount(0);
      });

      test(`WALLET-TX-WITNESS-UNVOTE-03-${labels.locale} — a removal included in a block shows one success toast naming the witness`, async ({
        page
      }) => {
        const broadcasts = await openWitnessesPage(page, { storeKey: true, confirmInBlocks: true, ...labels });

        await removeVote(page, labels);

        await broadcasts.waitForCount(1);
        await expect(toastsWith(page, labels.removed)).toHaveCount(1);
        await expect(page.getByTestId('error-toast-content')).toHaveCount(0);
      });

      test(`WALLET-TX-WITNESS-UNVOTE-04-${labels.locale} — cancelling the removal shows no toast`, async ({ page }) => {
        const broadcasts = await openWitnessesPage(page, { storeKey: true, confirmInBlocks: true, ...labels });

        const control = witnessVote(page, VOTED_WITNESS);
        const confirm = page.getByRole('dialog').filter({ hasText: labels.removeConfirmation });
        await expect(async () => {
          await control.locator('svg').click({ timeout: ATTEMPT_TIMEOUT });
          await expect(confirm).toBeVisible({ timeout: ATTEMPT_TIMEOUT });
        }).toPass({ timeout: HYDRATION_TIMEOUT });
        await confirm.getByRole('button', { name: labels.cancel, exact: true }).click();

        await expect(confirm).toBeHidden();
        await expect(page.getByRole('listitem').filter({ hasText: `@${VOTED_WITNESS}` })).toHaveCount(0);
        expect(broadcasts.calls).toHaveLength(0);
      });
    });
  }
});
