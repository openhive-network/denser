import type { Server } from 'node:http';
import { test, expect, type Page } from '@playwright/test';
import { WALLET_BASE_PATH } from '../support/basePath';
import { STUB_ACCOUNT, logInAsStubAccount, startWalletApiStub } from '../support/walletApiStub';
import { startApiStub } from '../support/apiStub';
import { WITNESS_RESULTS } from '../support/witnessApiStub';
import { PROPOSALS_PAGE_REST_RESULTS, PROPOSALS_PAGE_RESULTS } from '../support/proposalsApiStub';
import {
  HAFBE_WITNESS,
  VOTED_PROPOSAL,
  VOTERS_JSON_RPC_RESULTS,
  VOTERS_REST_RESULTS
} from '../support/votersApiStub';
import { ProposalsPage } from '../support/pages/proposalsPage';
import { WALLET_INTL_FORMATTED, WALLET_KNOWN_I18N_ISSUES, WALLET_USER_CONTENT } from '../support/i18nLayout';
import {
  I18N_CHECK_LOCALES,
  checkI18nLayout,
  expectNoI18nIssues,
  setUiLocale,
  type I18nCheckLocale,
  type II18nIssue
} from '../../../../../playwright/support/i18n-layout';

/**
 * The transfers page and its balance dialogs, the witnesses and the proposals with their voters
 * dialogs, the account's other pages, the market and the API node health checker, in the pseudo-locale and in Polish, at a desktop and two phone viewports, in a wide font:
 * every text is translated and fits (playwright/support/i18n-layout.ts). The stub nodes are the
 * other specs' (support/walletApiStub.ts, witnessApiStub.ts, proposalsApiStub.ts, votersApiStub.ts).
 */

const HYDRATION_TIMEOUT = 30_000;
/** The balance menus' dialogs: the HIVE menu's, then the Hive Power menu's. */
const BALANCE_DIALOGS = [
  { menu: 'wallet-hive-value', action: 'transfers' },
  { menu: 'wallet-hive-value', action: 'transferTo' },
  { menu: 'wallet-hive-value', action: 'powerUp' },
  { menu: 'wallet-hive-power', action: 'powerDown' },
  { menu: 'wallet-hive-power', action: 'delegate' }
];

// As anonymousNoWasm.spec.ts: without a network Chromium reports offline and React Query pauses.
test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, 'onLine', {
      configurable: true,
      get: () => true
    });
  });
});

const check = (page: Page, locale: I18nCheckLocale, root?: string) =>
  checkI18nLayout(page, {
    locale,
    root,
    userContent: WALLET_USER_CONTENT,
    intlFormatted: WALLET_INTL_FORMATTED
  });

/** Serves `start`'s stub node to the tests of the enclosing describe. */
const serveStub = (start: () => Promise<Server>) => {
  let stub: Server;
  test.beforeAll(async () => {
    stub = await start();
  });
  test.afterAll(async () => {
    await new Promise((resolve) => stub.close(resolve));
  });
};

test.describe('transfers', () => {
  serveStub(() => startWalletApiStub());

  const openTransfers = async (page: Page, locale: I18nCheckLocale, baseURL: string | undefined) => {
    await setUiLocale(page.context(), locale, baseURL);
    await logInAsStubAccount(page, 'active');
    await page.goto(`${WALLET_BASE_PATH}/@${STUB_ACCOUNT}/transfers`);
    await expect(page.getByTestId('wallet-hive-value').getByRole('button')).toBeVisible({
      timeout: HYDRATION_TIMEOUT
    });
  };

  for (const locale of I18N_CHECK_LOCALES) {
    test(`WALLET-I18N-01 [${locale}]: the transfers page is translated and fits`, async ({
      page,
      baseURL
    }) => {
      await openTransfers(page, locale, baseURL);
      expectNoI18nIssues(await check(page, locale), locale, WALLET_KNOWN_I18N_ISSUES);
    });

    test(`WALLET-I18N-02 [${locale}]: the balance menus' dialogs are translated and fit`, async ({
      page,
      baseURL
    }) => {
      await openTransfers(page, locale, baseURL);
      const issues: II18nIssue[] = [];
      for (const { menu, action } of BALANCE_DIALOGS) {
        await test.step(action, async () => {
          const item = page.getByTestId(`balance-action-${action}`);
          await expect(async () => {
            await page.getByTestId(menu).getByRole('button').click();
            await expect(item).toBeVisible({ timeout: 1000 });
          }).toPass({ timeout: HYDRATION_TIMEOUT });
          await item.click();
          await expect(page.getByRole('dialog')).toBeVisible();
          const found = await check(page, locale, '[role="dialog"]');
          issues.push(...found.map((issue) => ({ ...issue, element: `${action}: ${issue.element}` })));
          // The first Escape may only close the recipient's suggestions
          await expect(async () => {
            await page.keyboard.press('Escape');
            await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 1000 });
          }).toPass();
          await page.setViewportSize({ width: 1280, height: 900 });
        });
      }
      expectNoI18nIssues(issues, locale, WALLET_KNOWN_I18N_ISSUES);
    });
  }
});

test.describe('witnesses', () => {
  serveStub(() =>
    startApiStub({
      jsonRpc: {
        ...WITNESS_RESULTS,
        'database_api.list_witness_votes': VOTERS_JSON_RPC_RESULTS['database_api.list_witness_votes']
      },
      rest: VOTERS_REST_RESULTS
    })
  );

  for (const locale of I18N_CHECK_LOCALES) {
    test(`WALLET-I18N-03 [${locale}]: the witnesses and a witness's voters are translated and fit`, async ({
      page,
      baseURL
    }) => {
      await setUiLocale(page.context(), locale, baseURL);
      await page.goto(`${WALLET_BASE_PATH}/~witnesses`);
      const trigger = page
        .getByTestId('witness-table-body')
        .locator('tr')
        .filter({ has: page.getByTestId('witness-name-link').getByText(HAFBE_WITNESS, { exact: true }) })
        .getByTestId('witness-voters-trigger');
      await expect(trigger).toBeVisible({ timeout: HYDRATION_TIMEOUT });
      const issues = await check(page, locale);

      await page.setViewportSize({ width: 1280, height: 900 });
      await trigger.click();
      await expect(page.getByTestId('witness-voters-dialog').getByTestId('voter-row').first()).toBeVisible();
      issues.push(...(await check(page, locale, '[data-testid="witness-voters-dialog"]')));
      expectNoI18nIssues(issues, locale, WALLET_KNOWN_I18N_ISSUES);
    });
  }
});

test.describe('proposals', () => {
  serveStub(() =>
    startWalletApiStub(
      undefined,
      { ...PROPOSALS_PAGE_RESULTS, ...VOTERS_JSON_RPC_RESULTS },
      PROPOSALS_PAGE_REST_RESULTS
    )
  );

  for (const locale of I18N_CHECK_LOCALES) {
    test(`WALLET-I18N-04 [${locale}]: the proposals and a proposal's voters are translated and fit`, async ({
      page,
      baseURL
    }) => {
      await setUiLocale(page.context(), locale, baseURL);
      await page.goto(`${WALLET_BASE_PATH}/proposals`);
      const trigger = new ProposalsPage(page)
        .proposalCard(VOTED_PROPOSAL)
        .getByTestId('vote-proposals-dialog-trigger');
      await expect(trigger).toBeVisible({ timeout: HYDRATION_TIMEOUT });
      const issues = await check(page, locale);

      await page.setViewportSize({ width: 1280, height: 900 });
      await trigger.click();
      await expect(page.getByTestId('vote-proposals-dialog').getByTestId('voter-row').first()).toBeVisible();
      issues.push(...(await check(page, locale, '[data-testid="vote-proposals-dialog"]')));
      expectNoI18nIssues(issues, locale, WALLET_KNOWN_I18N_ISSUES);
    });
  }
});

/** The stub account's other wallet pages and the market, each once its data is in. */
const ACCOUNT_PAGES = [
  { id: '05', path: `/@${STUB_ACCOUNT}/delegations`, ready: '[data-testid="wallet-rc-delegations"]' },
  { id: '06', path: `/@${STUB_ACCOUNT}/permissions`, ready: 'img[src$="permissions.png"]' },
  { id: '07', path: `/@${STUB_ACCOUNT}/authorities`, ready: '[data-testid="authority-toggle-active"]' },
  { id: '08', path: `/@${STUB_ACCOUNT}/password`, ready: 'input[type="password"]' },
  { id: '09', path: `/@${STUB_ACCOUNT}/author-rewards`, ready: 'main' },
  { id: '10', path: `/@${STUB_ACCOUNT}/curation-rewards`, ready: 'main' },
  { id: '11', path: `/@${STUB_ACCOUNT}/communities`, ready: 'input[name="title"]' },
  { id: '12', path: '/market', ready: '[data-testid="buy-form-amount-input"]' },
  { id: '13', path: '/recovery_step_1', ready: 'input' }
];

test.describe('account pages', () => {
  serveStub(() => startWalletApiStub());

  for (const { id, path, ready } of ACCOUNT_PAGES) {
    for (const locale of I18N_CHECK_LOCALES) {
      test(`WALLET-I18N-${id} [${locale}]: ${path} is translated and fits`, async ({ page, baseURL }) => {
        await setUiLocale(page.context(), locale, baseURL);
        await logInAsStubAccount(page, 'active');
        await page.goto(`${WALLET_BASE_PATH}${path}`);
        await expect(page.locator(ready).first()).toBeVisible({ timeout: HYDRATION_TIMEOUT });
        // Loading's spinner (@ui/components/loading)
        await expect(page.locator('main .animate-spin')).toHaveCount(0, { timeout: HYDRATION_TIMEOUT });
        expectNoI18nIssues(await check(page, locale), locale, WALLET_KNOWN_I18N_ISSUES);
      });
    }
  }
});

const API_SETS_PANEL = '[data-testid="api-sets-component"]';

test.describe('health checker', () => {
  serveStub(() => startWalletApiStub());

  for (const locale of I18N_CHECK_LOCALES) {
    test(`WALLET-I18N-14 [${locale}]: /healthchecker is translated and fits`, async ({ page, baseURL }) => {
      await setUiLocale(page.context(), locale, baseURL);
      await page.goto(`${WALLET_BASE_PATH}/healthchecker`);
      await expect(page.locator(API_SETS_PANEL)).toBeVisible({ timeout: HYDRATION_TIMEOUT });
      const issues = await checkI18nLayout(page, {
        locale,
        userContent: WALLET_USER_CONTENT,
        intlFormatted: WALLET_INTL_FORMATTED
      });
      expectNoI18nIssues(issues, locale, WALLET_KNOWN_I18N_ISSUES);
    });
  }
});
