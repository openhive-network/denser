import type { Server } from 'node:http';
import { test, expect, type Page } from '@playwright/test';
import { WALLET_BASE_PATH } from '../support/basePath';
import { startApiStub } from '../support/apiStub';
import { HEAD_BLOCK, STUB_WITNESSES, WITNESS_RESULTS, stubWitness } from '../support/witnessApiStub';

/**
 * The witness rows' texts fit, in Polish and English: at 1280 px each rank-up text fits its cell,
 * the longest one included ("+999,99K do miejsca 100"); at 390 px a row with a stale tag, a version
 * tag and an announcement link does not make the page scroll sideways, and the line that wraps does
 * not start with a "·". At 844 px (a phone in landscape) no site link runs into the version column and
 * no rank-up text is cut short. At 1280 px a typical row keeps its name and site link on one line and
 * its Voters link on the HP line, so it stays about 52 px tall. A witness that never published a feed shows a dash, a disabled one
 * says how long ago in the language's plural form, 12 months reading as a year, and an account page's
 * tab is not taken for an announcement.
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
/** A row of two 20 px lines and its 6 px top and bottom padding, as before the Voters link came. */
const TWO_LINE_ROW_HEIGHT = 52;
const ROW_HEIGHT_TOLERANCE = 2;

const TAGGED_WITNESS = 'stub-long-name16';
const NO_FEED_WITNESS = 'stub-w-002';
const DISABLED_WITNESS = 'stub-w-003';
const PROFILE_TAB_WITNESS = 'stub-w-004';
const DISABLED_FOR_A_YEAR_WITNESS = 'stub-w-005';

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
  4: { url: `https://peakd.com/@${PROFILE_TAB_WITNESS}/posts` },
  // 362 days: 12 months of 30 days, short of 365
  5: {
    signing_key: 'STM1111111111111111111111111111111114T1Anm',
    last_confirmed_block_num: HEAD_BLOCK - 362 * BLOCKS_PER_DAY
  }
};

const witnesses = Array.from({ length: WITNESS_COUNT }, (_, index) => ({
  ...stubWitness(STUB_WITNESSES[0], index),
  owner: `stub-w-${String(index).padStart(3, '0')}`,
  url: `https://hive.blog/@stub-w-${String(index).padStart(3, '0')}/witness-post`,
  votes: String(LOWEST_VOTES + BigInt(WITNESS_COUNT - 1 - index) * VOTE_GAP),
  ...OVERRIDES[index]
}));

const EXPECTED = {
  pl: {
    lastRankUp: '+999,99K do miejsca 100',
    disabled: 'Wyłączony 3 lata temu',
    disabledForAYear: 'Wyłączony 1 rok temu',
    voters: 'Głosujący'
  },
  en: {
    lastRankUp: '+999.99K to #100',
    disabled: 'Disabled 3 years ago',
    disabledForAYear: 'Disabled 1 year ago',
    voters: 'Voters'
  }
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

/** The site links that reach past their cell into the version column. */
const siteLinksOverVersion = (page: Page) =>
  page.getByTestId('witness-table-body').locator('tr').evaluateAll((rows) =>
    rows.flatMap((row) => {
      const site = row.querySelector('[data-testid="witness-external-site-link"]');
      const version = row.querySelector('[data-testid="witness-version"]');
      if (!site || !version) return [];
      const overlap = site.getBoundingClientRect().right - version.getBoundingClientRect().left;
      return overlap > 0 ? [`${site.textContent}: ${overlap}px`] : [];
    })
  );

const medianRowHeight = (page: Page) =>
  page
    .getByTestId('witness-table-body')
    .locator('tr')
    .evaluateAll((rows) => {
      const heights = rows.map((row) => row.getBoundingClientRect().height).sort((a, b) => a - b);
      return heights[Math.floor(heights.length / 2)];
    });

/** Whether `testId`'s element in `owner`'s row starts on the line `otherTestId`'s element starts on. */
const sharesLine = (page: Page, owner: string, testId: string, otherTestId: string) =>
  witnessRow(page, owner).evaluate(
    (row, ids) => {
      const top = (id: string) => row.querySelector(`[data-testid="${id}"]`)?.getBoundingClientRect().top ?? NaN;
      return Math.abs(top(ids[0]) - top(ids[1])) < 4;
    },
    [testId, otherTestId]
  );

/**
 * Where `owner`'s site link sits in its line: whether it has a dot before it, whether it starts a
 * line, and whether the dot shows, its box inside the line's.
 */
const siteLinkDot = (page: Page, owner: string) =>
  witnessRow(page, owner)
    .getByTestId('witness-external-site-link')
    .evaluate((site) => {
      const line = site.parentElement;
      if (!line) throw new Error('site link has no line');
      const dot = getComputedStyle(site, '::before');
      const lineBox = line.getBoundingClientRect();
      const siteBox = site.getBoundingClientRect();
      const dotLeft = siteBox.left - parseFloat(dot.width);
      return {
        hasDot: dot.content.includes('·'),
        startsLine: Math.abs(siteBox.left - lineBox.left) < 1,
        dotShown: getComputedStyle(line).overflowX !== 'clip' || dotLeft >= lineBox.left - 0.5
      };
    });

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
      expect(await siteLinkDot(page, TAGGED_WITNESS)).toEqual({ hasDot: true, startsLine: true, dotShown: false });
      expect(await siteLinkDot(page, NO_FEED_WITNESS)).toEqual({ hasDot: true, startsLine: false, dotShown: true });
      // The price feed in the language's own form: "$0.250" in en, "0,250 $" in pl.
      await expect(witnessRow(page, TAGGED_WITNESS).getByTestId('witness-phone-summary')).toContainText(
        /(\$\d+\.\d{3}|\d+,\d{3}\s\$) · \S/
      );
      await expect(tagged.getByTestId('witness-voters-trigger-phone')).toHaveText(EXPECTED[lang].voters);
      await expect(tagged.getByTestId('witness-voters-trigger-phone')).toBeVisible();
      await expect(tagged.getByTestId('witness-voters-trigger')).toBeHidden();
    });

    test(`WALLET-WITNESSES-ROW-04 — at 844 px in ${lang} no site link reaches the version column and every rank-up text shows whole`, async ({
      page,
      baseURL
    }) => {
      await page.setViewportSize({ width: 844, height: 390 });
      await openWitnessesPage(page, lang, baseURL);

      await expect(page.getByTestId('witness-rank-up').last()).toHaveText(EXPECTED[lang].lastRankUp);
      expect(await siteLinksOverVersion(page)).toEqual([]);
      expect(await clippedRankUps(page)).toEqual([]);
    });

    test(`WALLET-WITNESSES-ROW-05 — at 1280 px a typical ${lang} row is one line of name and site link, about 52 px tall`, async ({
      page,
      baseURL
    }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await openWitnessesPage(page, lang, baseURL);

      await expect(witnessRow(page, NO_FEED_WITNESS).getByTestId('witness-voters-trigger')).toHaveText(
        EXPECTED[lang].voters
      );
      expect(await sharesLine(page, NO_FEED_WITNESS, 'witness-name-link', 'witness-external-site-link')).toBe(true);
      expect(await sharesLine(page, NO_FEED_WITNESS, 'witness-votes-received', 'witness-voters-trigger')).toBe(true);
      expect(Math.abs((await medianRowHeight(page)) - TWO_LINE_ROW_HEIGHT)).toBeLessThanOrEqual(ROW_HEIGHT_TOLERANCE);
      expect(await siteLinksOverVersion(page)).toEqual([]);
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
        witnessRow(page, DISABLED_FOR_A_YEAR_WITNESS).getByTestId('witness-external-site-link')
      ).toHaveText(EXPECTED[lang].disabledForAYear);
      await expect(
        witnessRow(page, PROFILE_TAB_WITNESS).getByTestId('witness-external-site-link').getByRole('link')
      ).toHaveText(`peakd.com/@${PROFILE_TAB_WITNESS}/posts`);
    });
  });
}
