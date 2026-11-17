import type { Server } from 'node:http';
import { test, expect, type Page } from '@playwright/test';
import { WALLET_BASE_PATH } from '../support/basePath';
import { startApiStub } from '../support/apiStub';
import { HEAD_BLOCK, STUB_WITNESSES, WITNESS_RESULTS, stubWitness } from '../support/witnessApiStub';

/**
 * The witness rows' texts fit, in Polish and English: at 1280 px each rank-up text fits its cell,
 * the longest one included ("+999.99K do miejsca 100"); at 390 px a row with a stale tag, a version
 * tag and an announcement link does not make the page scroll sideways. A witness that never
 * published a feed shows a dash, a disabled one says how long ago in the language's plural form,
 * and an account page's tab is not taken for an announcement.
 */

const HYDRATION_TIMEOUT = 30_000;
/** As witnessesPriceFeedWidth.spec.ts: about 19 % wider text, standing in for wider system fonts. */
const WIDER_FONT_LETTER_SPACING = '0.1em';

/** One more than the table always lists, so the last row reads "to #100". */
const WITNESS_COUNT = 101;
/** The vote gap between neighbours in VESTS satoshis: about 999,994 HP, shown as "+999.99K". */
const VOTE_GAP = 1_833_322_333_333_333n;
const LOWEST_VOTES = 100_000_000_000_000_000n;
const BLOCKS_PER_DAY = 28_800;

const TAGGED_WITNESS = 'stub-long-name16';
const NO_FEED_WITNESS = 'stub-w-002';
const DISABLED_WITNESS = 'stub-w-003';
const PROFILE_TAB_WITNESS = 'stub-w-004';

const OVERRIDES: Record<number, object> = {
  // Stale for 10 days, below the majority version, linked to an announcement
  1: {
    owner: TAGGED_WITNESS,
    last_confirmed_block_num: HEAD_BLOCK - 10 * BLOCKS_PER_DAY,
    running_version: '1.27.5'
  },
  // The date the node gives a witness that never published a feed
  2: { last_hbd_exchange_update: '1970-01-01T00:00:00' },
  3: {
    signing_key: 'STM1111111111111111111111111111111114T1Anm',
    last_confirmed_block_num: HEAD_BLOCK - 3 * 365 * BLOCKS_PER_DAY
  },
  4: { url: `https://peakd.com/@${PROFILE_TAB_WITNESS}/posts` }
};

const witnesses = Array.from({ length: WITNESS_COUNT }, (_, index) => ({
  ...stubWitness(STUB_WITNESSES[0], index),
  owner: `stub-w-${String(index).padStart(3, '0')}`,
  url: `https://hive.blog/@stub-w-${String(index).padStart(3, '0')}/witness-post`,
  votes: String(LOWEST_VOTES + BigInt(WITNESS_COUNT - 1 - index) * VOTE_GAP),
  ...OVERRIDES[index]
}));

const EXPECTED = {
  pl: { lastRankUp: '+999.99K do miejsca 100', disabled: 'Wyłączony 3 lata temu' },
  en: { lastRankUp: '+999.99K to #100', disabled: 'Disabled 3 years ago' }
} as const;

let stub: Server;

test.beforeAll(async () => {
  stub = await startApiStub({
    jsonRpc: { ...WITNESS_RESULTS, 'database_api.list_witnesses': () => ({ witnesses }) }
  });
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

const openWitnessesPage = async (page: Page, lang: string, baseURL: string | undefined) => {
  await page.context().addCookies([{ name: 'NEXT_LOCALE', value: lang, url: baseURL }]);
  await page.goto(`${WALLET_BASE_PATH}/~witnesses`);
  await expect(page.getByTestId('witness-table-body').locator('tr')).toHaveCount(WITNESS_COUNT, {
    timeout: HYDRATION_TIMEOUT
  });
};

const witnessRow = (page: Page, owner: string) =>
  page
    .getByTestId('witness-table-body')
    .locator('tr')
    .filter({ has: page.getByTestId('witness-name-link').getByText(owner, { exact: true }) });

/** The rank-up texts wider than their cell, or whose title is not the whole text. */
const clippedRankUps = (page: Page) =>
  page
    .getByTestId('witness-rank-up')
    .evaluateAll((cells) =>
      cells
        .filter(
          (cell) => cell.scrollWidth > cell.clientWidth || cell.getAttribute('title') !== cell.textContent
        )
        .map((cell) => `${cell.textContent}: ${cell.scrollWidth}/${cell.clientWidth}`)
    );

for (const lang of ['pl', 'en'] as const) {
  test.describe(`witness rows in ${lang}`, () => {
    test(`WALLET-WITNESSES-ROW-01 — every ${lang} rank-up text fits its cell at 1280 px and has it as title`, async ({
      page,
      baseURL
    }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await openWitnessesPage(page, lang, baseURL);

      await expect(page.getByTestId('witness-rank-up').last()).toHaveText(EXPECTED[lang].lastRankUp);
      expect(await clippedRankUps(page)).toEqual([]);
      await page.addStyleTag({
        content: `[data-testid="witness-table-body"] td { letter-spacing: ${WIDER_FONT_LETTER_SPACING}; }`
      });
      expect(await clippedRankUps(page)).toEqual([]);
    });

    test(`WALLET-WITNESSES-ROW-02 — a ${lang} row with every tag does not scroll the page sideways at 390 px`, async ({
      page,
      baseURL
    }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await openWitnessesPage(page, lang, baseURL);

      const tagged = witnessRow(page, TAGGED_WITNESS);
      await expect(tagged.getByTestId('witness-has-not-produced-blocks-warning')).toBeVisible();
      await expect(tagged.getByText('v1.27.5', { exact: true })).toBeVisible();
      await expect(tagged.getByTestId('witness-external-site-link').getByRole('link')).toBeVisible();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });

    test(`WALLET-WITNESSES-ROW-03 — ${lang}: no feed shows a dash, a disabled witness says how long ago, a profile tab is no announcement`, async ({
      page,
      baseURL
    }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await openWitnessesPage(page, lang, baseURL);

      await expect(witnessRow(page, NO_FEED_WITNESS).getByTestId('witness-price-feed-cell')).toHaveText('—');
      await expect(witnessRow(page, DISABLED_WITNESS).getByTestId('witness-external-site-link')).toHaveText(
        EXPECTED[lang].disabled
      );
      await expect(
        witnessRow(page, PROFILE_TAB_WITNESS).getByTestId('witness-external-site-link').getByRole('link')
      ).toHaveText(`peakd.com/@${PROFILE_TAB_WITNESS}/posts`);
    });
  });
}
