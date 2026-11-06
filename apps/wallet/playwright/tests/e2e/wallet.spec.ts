import { expect, Locator, Page, Response, test } from '@playwright/test';
import { WalletPage } from '../support/pages/walletPage';
import { LoginToVoteDialog } from '../support/pages/loginToVoteDialog';
import { HomePage } from '../../../../blog/playwright/tests/support/pages/homePage';
import { locatorSelector } from '../../../../blog/playwright/tests/support/locatorSelector';

// These specs read the live chain, which moves between any two reads: each check compares the page
// with the response it rendered, captured from the page's own traffic, not with a second API call.

/** Rows the history table renders at a time (HISTORY_PAGE_SIZE in history-table.tsx). */
const HISTORY_ROWS_PER_VIEW = 50;

const DELEGATED_VESTS_PATTERN = /delegated_vesting_shares\\*":\{[^}]*?\\*"amount\\*":\\*"(\d+)/;

/** How long one response body may take to read before it counts as not carrying the account. */
const BODY_READ_TIMEOUT_MS = 5_000;

/**
 * Follows the responses the page renders the account from: the server-rendered document (or RSC
 * refresh) carrying the account prefetched on the server, or the browser's own find_accounts when
 * that prefetch failed. The returned function answers whether the latest of them has the account
 * delegating HIVE POWER, and fails when none carried the account.
 *
 * Only requests whose body finished downloading count, in the order they finished: a response of a
 * page navigated away from (the language switch reloads the page) may never finish, and awaiting its
 * body would wait out the test. Each read is still bounded, as Playwright can lose a body it had.
 */
function trackRenderedDelegation(page: Page): () => Promise<boolean> {
  const amounts: Promise<string | undefined>[] = [];
  page.on('requestfinished', (request) => {
    const type = request.resourceType();
    if (type !== 'document' && type !== 'fetch') return;
    amounts.push(readDelegatedVests(request.response()));
  });
  return async () => {
    const latest = (await Promise.all(amounts)).filter((amount) => amount !== undefined).at(-1);
    if (latest === undefined) throw new Error('No response the page rendered carried the account');
    return BigInt(latest) > 0n;
  };
}

async function readDelegatedVests(pendingResponse: Promise<Response | null>): Promise<string | undefined> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timedOut = new Promise<undefined>((resolve) => {
    timer = setTimeout(() => resolve(undefined), BODY_READ_TIMEOUT_MS);
  });
  const read = pendingResponse
    .then(async (response) => {
      if (!response?.ok()) return undefined;
      return (await response.text()).match(DELEGATED_VESTS_PATTERN)?.[1];
    })
    // The body of a response from a page navigated away from is gone; that page shows nothing now
    .catch(() => undefined);
  try {
    return await Promise.race([read, timedOut]);
  } finally {
    clearTimeout(timer);
  }
}

// The delegated sentence is shown only while the account delegates, which changes over time.
async function expectDelegatedSentenceToFollowAccount(
  description: Locator,
  isDelegating: () => Promise<boolean>,
  delegatedSentence: string
) {
  if (await isDelegating()) {
    await expect(description).toContainText(delegatedSentence);
  } else {
    await expect(description).not.toContainText(delegatedSentence);
  }
}

interface IRenderedOperation {
  op?: { type: string; value?: { from?: string; to?: string } };
}

/**
 * The newest page of `username`'s wallet operations the history rendered: the answer to the page's
 * own request. Register it before the page loads. Only operations with a value make a row.
 */
async function captureRenderedOperations(page: Page, username: string): Promise<IRenderedOperation[]> {
  const operationsUrl = new RegExp(`/hivemind-api/accounts/${username}/operations\\?`);
  const response = await page.waitForResponse(
    (candidate) =>
      operationsUrl.test(candidate.url()) && candidate.request().method() === 'GET' && candidate.ok(),
    { timeout: 60000 }
  );
  const body: { operations_result: IRenderedOperation[] } = await response.json();
  return body.operations_result.filter(({ op }) => op?.value);
}

// Transfers from bad actors are hidden behind a notice: show them, so the rows follow the operations
// one to one.
async function showHiddenTransfers(page: Page) {
  const showButton = page.getByTestId('wallet-account-history-scam-show');
  if (await showButton.isVisible()) await showButton.click();
}

interface IVestingDelegationReply {
  delegator: string;
  delegatee: string;
}

/** The delegations the delegations tab rendered: the answer to its own list_vesting_delegations read. */
async function readRenderedDelegations(
  response: Response,
  delegator: string
): Promise<IVestingDelegationReply[]> {
  // A single JSON-RPC reply, or a batch of them
  const replies: { result?: { delegations?: IVestingDelegationReply[] } }[] = [await response.json()].flat();
  const delegations = replies.find(({ result }) => result?.delegations)?.result?.delegations ?? [];
  return delegations.filter((delegation) => delegation.delegator === delegator);
}

test.describe('Wallet page tests', () => {
  let walletPage: WalletPage;

  test.beforeEach(async ({ page }) => {
    walletPage = new WalletPage(page);
  });

  test('validate that wallet page is loaded', async ({ page }) => {
    await walletPage.goToWalletPage();
    await expect(walletPage.page.url()).toMatch(/https?:\/\/[\w\.]+(:\d{1,5})?\/?/); // https://caddy/ or http://localhost:4000

    await expect(walletPage.hiveTokenLabel).toHaveText('HIVE');
    await expect(walletPage.hiveTokensLiquidPlatformTokenLabel).toBeVisible();
    await expect(walletPage.hivePowerTokenLabel).toHaveText('HIVE power');
    await expect(walletPage.hiveTokensVestingInfluenceTokenLabel).toBeVisible();
    await expect(walletPage.hiveTokenHBDLabel).toHaveText('HBD');
    await expect(walletPage.hiveTokensSeeksPriceStabilityWithUSD).toBeVisible();
  });

  // test("move to the login dialog", async ({ page }) => {
  //   const loginDialog = new LoginToVoteDialog(page);

  //   await walletPage.goToWalletPage();
  //   await expect(walletPage.page.url()).toMatch(/https?:\/\/[\w\.]+(:\d{1,5})?\/?/); // https://caddy/ or http://localhost:4000

  //   await walletPage.hiveWalletLoginButton.click();
  //   await loginDialog.validateLoginToVoteDialogIsVisible();
  //   await loginDialog.closeLoginDialog();
  // });
});

test.describe('Wallet page of @gtg tests', () => {
  let walletPage: WalletPage;
  let homePage: HomePage;

  test.beforeEach(async ({ page }) => {
    walletPage = new WalletPage(page);
    homePage = new HomePage(page);
  });

  test('validate that wallet of @gtg page is loaded', async ({ page }) => {
    await walletPage.goToWalletPageOfUser('@gtg');
    await expect(walletPage.page.url()).toMatch(/https?:\/\/[\w\.]+(:\d{1,5})?\/@gtg\/transfers/);
    await expect(walletPage.balancesTab).toBeVisible();
  });

  test('validate hive balances on @gtg wallet page is visible', async ({ page }) => {
    await walletPage.goToWalletPageOfUser('@gtg');
    await expect(walletPage.page.url()).toMatch(/https?:\/\/[\w\.]+(:\d{1,5})?\/@gtg\/transfers/);
    await walletPage.page.waitForSelector(locatorSelector(walletPage.walletSearchInput));
    await expect(await walletPage.walletHiveDescription.textContent()).toContain(
      'Tradeable tokens that may be transferred anywhere at anytime.'
    );
    await expect(await walletPage.walletHiveValue).toBeVisible();
  });

  test('validate hive power balances on @gtg wallet page is visible', async ({ page }) => {
    const renderedDelegation = trackRenderedDelegation(page);
    await walletPage.goToWalletPageOfUser('@gtg');
    await expect(walletPage.page.url()).toMatch(/https?:\/\/[\w\.]+(:\d{1,5})?\/@gtg\/transfers/);
    await walletPage.page.waitForSelector(locatorSelector(walletPage.walletSearchInput));
    const description = walletPage.walletHivePowerDescription;
    await expect(description).toContainText(
      'Influence tokens which give you more control over post payouts and allow you to earn on curation rewards.'
    );
    await expect(description).toContainText(
      /HIVE POWER increases at an APR of approximately \d+(\.\d+)?%, subject to blockchain variance\./
    );
    await expectDelegatedSentenceToFollowAccount(
      description,
      renderedDelegation,
      "Part of gtg's HIVE POWER is currently delegated."
    );
    await expect(await walletPage.walletHivePowerValue).toBeVisible();
  });

  test('validate hive dollars balances on @gtg wallet page is visible', async ({ page }) => {
    await walletPage.goToWalletPageOfUser('@gtg');
    await expect(walletPage.page.url()).toMatch(/https?:\/\/[\w\.]+(:\d{1,5})?\/@gtg\/transfers/);
    await walletPage.page.waitForSelector(locatorSelector(walletPage.walletSearchInput));
    await expect(await walletPage.walletHiveDollarsDescription.textContent()).toContain(
      'Tradeable tokens that may be transferred anywhere at anytime.'
    );
    await expect(await walletPage.walletHiveDollarsValue).toBeVisible();
  });

  test('validate hive savings balances on @gtg wallet page is visible', async ({ page }) => {
    await walletPage.goToWalletPageOfUser('@gtg');
    await expect(walletPage.page.url()).toMatch(/https?:\/\/[\w\.]+(:\d{1,5})?\/@gtg\/transfers/);
    await walletPage.page.waitForSelector(locatorSelector(walletPage.walletSearchInput));
    const savingsDescription = await walletPage.walletSavingsDescription.textContent();
    await expect(savingsDescription).toMatch(
      /Balances subject to 3 day withdraw waiting period\. HBD interest rate: \d+(\.\d+)?% APR/
    );
    await expect(await walletPage.walletSavingsHiveValue).toBeVisible();
    await expect(await walletPage.walletSavingsHbdValue).toBeVisible();
  });

  test('validate estimated account value on @gtg wallet page is visible', async ({ page }) => {
    await walletPage.goToWalletPageOfUser('@gtg');
    await expect(walletPage.page.url()).toMatch(/https?:\/\/[\w\.]+(:\d{1,5})?\/@gtg\/transfers/);
    await walletPage.page.waitForSelector(locatorSelector(walletPage.walletSearchInput));
    await expect(await walletPage.walletEstimatedAccountValueDescription.textContent()).toContain(
      'The estimated value is based on an average value of Hive in US dollars.'
    );
    await expect(await walletPage.walletEstimatedAccountValue).toBeVisible();
  });

  test('validate filters on @gtg wallet page is visible', async ({ page }) => {
    await walletPage.goToWalletPageOfUser('@gtg');
    await expect(walletPage.page.url()).toMatch(/https?:\/\/[\w\.]+(:\d{1,5})?\/@gtg\/transfers/);
    await walletPage.page.waitForSelector(locatorSelector(walletPage.walletSearchInput));
    await expect(walletPage.walletCheckboxOthers).not.toBeChecked();
    await expect(walletPage.walletCheckboxIncoming).not.toBeChecked();
    await expect(walletPage.walletCheckboxOutcoming).not.toBeChecked();
    await expect(walletPage.walletCheckboxExcludeLessThan1).not.toBeChecked();
  });

  test('validate search by user on @gtg wallet page is visible', async ({ page }) => {
    await walletPage.goToWalletPageOfUser('@gtg');
    await expect(walletPage.page.url()).toMatch(/https?:\/\/[\w\.]+(:\d{1,5})?\/@gtg\/transfers/);
    await walletPage.page.waitForSelector(locatorSelector(walletPage.walletSearchInput));
    await expect(walletPage.walletSearchInput).toHaveAttribute('placeholder', 'username');
    await walletPage.walletSearchInput.fill('unknownuser');
    await expect(walletPage.walletSearchInput).toHaveAttribute('value', 'unknownuser');
  });

  // Quarantined (#962): waits on live @gtg account history; a slow history API times out (#943).
  // Kept as live smoke coverage; fixture/gtgWalletHistory.spec.ts covers it offline with a recorded @gtg history (#1084).
  test('@flaky validate searching by unknown user on @gtg wallet page is visible', async ({ page }) => {
    await walletPage.goToWalletPageOfUser('@gtg');
    await expect(walletPage.page.url()).toMatch(/https?:\/\/[\w\.]+(:\d{1,5})?\/@gtg\/transfers/);
    await walletPage.page.waitForSelector(locatorSelector(walletPage.walletSearchInput));
    // Wait until the account history actually finished loading. On webkit
    // testenv the fetch is slow enough that fill+assert can race the loader,
    // and HistoryTable only renders the no-transactions element once
    // isLoading becomes false.
    await expect(walletPage.walletAccountHistoryRow.first()).toBeVisible({ timeout: 30000 });
    await walletPage.walletSearchInput.fill('unknownuser');
    await expect(walletPage.walletSearchInput).toHaveAttribute('value', 'unknownuser');
    await expect(walletPage.walletAccountHistoryNoTransactionMsg).toHaveText('No transactions found', {
      timeout: 15000
    }); // a typo to correct
    await expect(
      await walletPage.getElementCssPropertyValue(
        await walletPage.walletAccountHistoryNoTransactionMsg,
        'color'
      )
    ).toBe('rgb(252, 165, 165)');
  });

  test('validate amount of transactions on @gtg in account history', async ({ page }) => {
    const renderedOperations = captureRenderedOperations(page, 'gtg');
    await walletPage.goToWalletPageOfUser('@gtg');
    await expect(walletPage.page.url()).toMatch(/https?:\/\/[\w\.]+(:\d{1,5})?\/@gtg\/transfers/);
    await walletPage.page.waitForSelector(locatorSelector(walletPage.walletSearchInput));
    const operations = await renderedOperations;
    // History rows and the empty-state message render only after the history
    // query settles - wait for either before checking them
    await expect(
      walletPage.walletAccountHistoryRow.first().or(walletPage.walletAccountHistoryNoTransactionMsg)
    ).toBeVisible({ timeout: 30000 });

    if (operations.length === 0) {
      await expect(walletPage.walletAccountHistoryNoTransactionMsg).toContainText('No transactions found');
      return;
    }
    await showHiddenTransfers(page);
    await expect(walletPage.walletAccountHistoryRow).toHaveCount(
      Math.min(operations.length, HISTORY_ROWS_PER_VIEW)
    );
    if (operations.length > HISTORY_ROWS_PER_VIEW) {
      // The next rows of the page already loaded are shown without another request
      await page.getByTestId('wallet-account-history-older').click();
      await expect(walletPage.walletAccountHistoryRow).toHaveCount(
        Math.min(operations.length, 2 * HISTORY_ROWS_PER_VIEW)
      );
    }
  });

  test('validate first transaction on @gtg in account history', async ({ page }) => {
    const username: string = 'gtg';
    const renderedOperations = captureRenderedOperations(page, username);
    await walletPage.goToWalletPageOfUser('@gtg');
    await expect(walletPage.page.url()).toMatch(/https?:\/\/[\w\.]+(:\d{1,5})?\/@gtg\/transfers/);
    await walletPage.page.waitForSelector(locatorSelector(walletPage.walletSearchInput));
    const operations = await renderedOperations;

    // History rows and the empty-state message render only after the history
    // query settles - wait for either before branching
    await expect(
      walletPage.walletAccountHistoryRow.first().or(walletPage.walletAccountHistoryNoTransactionMsg)
    ).toBeVisible({ timeout: 30000 });

    if (operations.length > 0) {
      await showHiddenTransfers(page);
      const firstAccountHistoryOperation = operations[0].op;
      // The API names operations with an `_operation` suffix, e.g. `transfer_operation`
      const firstAccountHistoryOperationType = firstAccountHistoryOperation?.type.replace(/_operation$/, '');
      const firstAccountHistoryTransfer = await walletPage.walletAccountHistoryRow.first();

      if (firstAccountHistoryOperationType == 'claim_reward_balance') {
        await expect(firstAccountHistoryTransfer).toContainText('Claim rewards');
      } else if (firstAccountHistoryOperationType == 'transfer') {
        const firstAccountHistoryOperationTo = firstAccountHistoryOperation?.value?.to;
        const firstAccountHistoryOperationFrom = firstAccountHistoryOperation?.value?.from;
        if (firstAccountHistoryOperationTo == username) {
          await expect(firstAccountHistoryTransfer).toContainText('Received');
        }
        if (firstAccountHistoryOperationFrom == username) {
          await expect(firstAccountHistoryTransfer).toContainText('Transfer');
        }
      } else if (firstAccountHistoryOperationType == 'transfer_from_savings') {
        await expect(firstAccountHistoryTransfer).toContainText('Transfer from savings');
      } else if (firstAccountHistoryOperationType == 'transfer_to_savings') {
        await expect(firstAccountHistoryTransfer).toContainText('Transfer to savings');
      } else if (firstAccountHistoryOperationType == 'transfer_to_vesting') {
        await expect(firstAccountHistoryTransfer).toContainText(/^(Receive|Transfer)/);
      } else if (firstAccountHistoryOperationType == 'interest') {
        await expect(firstAccountHistoryTransfer).toContainText('Receive interest of');
      } else if (firstAccountHistoryOperationType == 'cancel_transfer_from_savings') {
        await expect(firstAccountHistoryTransfer).toContainText('Cancel transfer from savings');
      } else if (firstAccountHistoryOperationType == 'fill_order') {
        await expect(firstAccountHistoryTransfer).toContainText('Paid');
      } else {
        console.log('Other transaction!!! - Check it!');
      }
    } else {
      await expect(await walletPage.walletAccountHistoryNoTransactionMsg).toContainText(
        'No transactions found'
      );
    }
  });

  test('validate delegations on @blocktrades in wallet', async ({ page }) => {
    const username: string = 'blocktrades';
    await walletPage.goToWalletPageOfUser(`@${username}`);
    await expect(walletPage.page.url()).toMatch(/https?:\/\/[\w\.]+(:\d{1,5})?\/@blocktrades\/transfers/);
    await walletPage.page.waitForSelector(locatorSelector(walletPage.walletSearchInput));

    const delegationsResponse = page.waitForResponse(
      (response) =>
        Boolean(response.request().postData()?.includes('database_api.list_vesting_delegations')) &&
        response.ok()
    );
    await walletPage.delegationsTab.click();
    const delegations = await readRenderedDelegations(await delegationsResponse, username);
    await walletPage.page.waitForSelector(locatorSelector(walletPage.walletDelegationItem));

    // One row per delegation, in the answer's order, each naming its delegatee
    await expect(walletPage.walletDelegationItem.locator('td:nth-child(2)')).toHaveText(
      delegations.map(({ delegatee }) => delegatee)
    );
  });

  test('Wallet page - translation polish', async ({ page }) => {
    const renderedDelegation = trackRenderedDelegation(page);
    await walletPage.goToWalletPageOfUser('@gtg');
    await expect(page.locator('.container.p-0').last()).toBeVisible();
    await homePage.toggleLanguage.click();
    await expect(homePage.languageMenu.first()).toBeVisible();
    await homePage.languageMenuPl.click();
    await expect(page.locator('.container.p-0').last()).toBeVisible();
    await expect(page.getByTestId('wallet-balances-link')).toHaveText('Salda');
    await expect(page.getByRole('link', { name: 'Delegacje' })).toBeVisible();
    await expect(page.getByTestId('wallet-hive-description')).toHaveText(
      'Zbywalne tokeny, które mogą być przesłane gdziekolwiek w dowolnym momencie. HIVE mogą zostać również przekonwertowane na HIVE POWER w procesie nazywanym zwiększenie mocy.'
    );
    const hivePowerDescription = page.getByTestId('wallet-hive-power-description');
    await expect(hivePowerDescription).toContainText(
      'Tokeny wpływu, które zwiększają Twój wpływ na podział wypłat za publikowanie treści, oraz pozwalają Ci zarabiać na głosowaniu na treści.'
    );
    await expect(hivePowerDescription).toContainText(
      /HIVE POWER rośnie w tempie około \d+(\.\d+)?% w skali roku \(APR\), z zastrzeżeniem zmienności blockchaina\./
    );
    await expectDelegatedSentenceToFollowAccount(
      hivePowerDescription,
      renderedDelegation,
      'Część HIVE POWER użytkownika gtg jest obecnie oddelegowana.'
    );
    await expect(page.getByTestId('wallet-account-history-description')).toContainText(
      'Uważaj na spam i linki phishingowe w notatkach transakcji. Nie otwieraj linków od użytkowników, którym nie ufasz. Nie udostępniaj swoich kluczy prywatnych żadnym stronom internetowym osób trzecich. Transakcje nie zostaną wyświetlone, dopóki nie zostaną potwierdzone w blockchain, co może zająć kilka minut.'
    );
  });
});
